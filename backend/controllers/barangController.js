const pool = require('../config/db');
const { logActivity } = require('./activityController');
const { hargaToMod, modToHarga } = require('../utils/modHelper');

// Helper to generate prefix candidates based on brand name
function generatePrefixCandidates(rawMerk) {
  if (!rawMerk || !rawMerk.trim()) return ['NN'];
  const cleaned = rawMerk.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (cleaned.length === 0) return ['NN'];
  if (cleaned.length <= 3) return [cleaned.padEnd(3, 'X')];

  const candidates = [];
  const addCandidate = (c) => {
    if (c && c.length === 3 && !candidates.includes(c)) {
      candidates.push(c);
    }
  };

  // 1. Standar utama: 3 huruf pertama
  addCandidate(cleaned.substring(0, 3));

  // Ambil huruf pertama & daftar konsonan berikutnya
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const firstLetter = cleaned[0];
  const otherConsonants = [];
  for (let i = 1; i < cleaned.length; i++) {
    if (!vowels.includes(cleaned[i])) {
      otherConsonants.push(cleaned[i]);
    }
  }

  // 2. Huruf ke-1 + 2 konsonan berikutnya (misal: DEXTA -> DXT, DEXCOM -> DXC)
  if (otherConsonants.length >= 2) {
    addCandidate(firstLetter + otherConsonants[0] + otherConsonants[1]);
  }

  // 3. Huruf ke-1 + konsonan ke-1 + konsonan ke-3
  if (otherConsonants.length >= 3) {
    addCandidate(firstLetter + otherConsonants[0] + otherConsonants[2]);
  }

  // 4. Huruf ke-1 + huruf ke-2 + huruf ke-4 (variasi suku kata)
  if (cleaned.length >= 4) {
    addCandidate(cleaned[0] + cleaned[1] + cleaned[3]);
  }

  // 5. Huruf ke-1 + 2 huruf terakhir
  if (cleaned.length >= 3) {
    addCandidate(cleaned[0] + cleaned[cleaned.length - 2] + cleaned[cleaned.length - 1]);
  }

  return candidates;
}

// Helper to generate kode_barang with dynamic collision resolution
async function generateKodeBarang(connection, merk) {
  const candidates = generatePrefixCandidates(merk);
  const targetMerkNormalized = (merk || '').trim().toLowerCase();

  let chosenPrefix = candidates[0];

  for (const cand of candidates) {
    const fullPrefix = `C23${cand}`;

    // Cek apakah prefix ini sudah pernah dipakai di tabel barang
    const [existing] = await connection.execute(
      'SELECT DISTINCT LOWER(TRIM(merk)) AS merk FROM barang WHERE kode_barang LIKE ? AND deleted_at IS NULL',
      [`${fullPrefix}%`]
    );

    if (existing.length === 0) {
      // Belum ada yang pakai -> bebas digunakan
      chosenPrefix = cand;
      break;
    }

    // Jika sudah ada yang pakai, cek apakah merk-nya sama
    const isSameMerk = existing.some(row => row.merk === targetMerkNormalized);
    if (isSameMerk) {
      // Prefix ini sah milik merk ini -> lanjutkan
      chosenPrefix = cand;
      break;
    }

    // Jika dipakai oleh merk yang berbeda -> terjadi konflik, coba kandidat berikutnya
  }

  const fullPrefix = `C23${chosenPrefix}`;

  const [rows] = await connection.execute(
    'SELECT kode_barang FROM barang WHERE kode_barang LIKE ? ORDER BY LENGTH(kode_barang) DESC, kode_barang DESC LIMIT 1 FOR UPDATE',
    [`${fullPrefix}%`]
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const lastCode = rows[0].kode_barang;
    const numPart = lastCode.substring(fullPrefix.length);
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  const paddedSeq = nextSeq > 99999 ? String(nextSeq) : String(nextSeq).padStart(5, '0');
  return `${fullPrefix}${paddedSeq}`;
}

// Admin: Get all barang with search, category filter, and pagination
const getAllBarang = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const kategoriId = req.query.kategori_id || null;
    const lowStock = req.query.low_stock === 'true';

    let whereClause = 'WHERE b.deleted_at IS NULL';
    const params = [];

    if (search) {
      whereClause += ' AND (b.nama_barang LIKE ? OR b.kode_barang LIKE ? OR b.merk LIKE ?)';
      params.push(search, search, search);
    }

    if (kategoriId) {
      whereClause += ' AND b.kategori_id = ?';
      params.push(kategoriId);
    }

    if (lowStock) {
      whereClause += ' AND b.stok_akhir <= 5';
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM barang b ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const query = `
      SELECT 
        b.id, b.kode_barang, b.nama_barang, b.kategori_id, k.nama_kategori,
        b.merk, b.stok_awal, b.total_masuk, b.total_keluar, b.stok_akhir,
        b.\`MOD\`, 
        b.modal_harga_beli,
        b.harga_jual, b.keterangan, b.created_at
      FROM barang b
      LEFT JOIN kategori k ON b.kategori_id = k.id
      ${whereClause}
      ORDER BY b.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, [...params, limit, offset]);

    return res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('getAllBarang error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data barang.' });
  }
};

// Admin: Get single barang by ID
const getBarangById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        b.id, b.kode_barang, b.nama_barang, b.kategori_id, k.nama_kategori,
        b.merk, b.stok_awal, b.total_masuk, b.total_keluar, b.stok_akhir,
        b.\`MOD\`, 
        b.modal_harga_beli,
        b.harga_jual, b.keterangan, b.created_at
      FROM barang b
      LEFT JOIN kategori k ON b.kategori_id = k.id
      WHERE b.id = ? AND b.deleted_at IS NULL
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('getBarangById error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data barang.' });
  }
};

// Pegawai / Kasir Lookup (Read-only, MINIMAL, NO MOD per PRD FR-JUAL-8)
const lookupBarang = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : '%';
    const [rows] = await pool.execute(`
      SELECT 
        b.id, b.kode_barang, b.nama_barang, b.merk,
        k.nama_kategori, b.stok_akhir, b.harga_jual
      FROM barang b
      LEFT JOIN kategori k ON b.kategori_id = k.id
      WHERE b.deleted_at IS NULL 
        AND (b.nama_barang LIKE ? OR b.kode_barang LIKE ? OR b.merk LIKE ?)
      ORDER BY b.nama_barang ASC
      LIMIT 50
    `, [search, search, search]);

    return res.json({ data: rows });
  } catch (err) {
    console.error('lookupBarang error:', err);
    return res.status(500).json({ error: 'Gagal mencari barang.' });
  }
};

// Admin: Create Barang (MOD string code)
const createBarang = async (req, res) => {
  const {
    nama_barang,
    kategori_id,
    merk,
    stok_awal = 0,
    MOD = '',
    harga_jual = 0,
    harga_beli = 0,
    keterangan
  } = req.body;

  if (!nama_barang || !nama_barang.trim()) {
    return res.status(400).json({ error: 'Nama barang wajib diisi.' });
  }
  if (!kategori_id) {
    return res.status(400).json({ error: 'Kategori wajib dipilih.' });
  }

  const initialStock = parseInt(stok_awal || 0, 10);
  const sellPrice = parseFloat(harga_jual || 0);
  const hargaBeliNum = parseFloat(harga_beli || 0);
  let modCode = String(MOD || '').trim().toUpperCase();

  // Jika harga_beli dikirim, otomatis generate MOD
  if (hargaBeliNum > 0) {
    modCode = hargaToMod(hargaBeliNum);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const kode_barang = await generateKodeBarang(connection, merk);
    const stok_akhir = initialStock;

    const unitCost = hargaBeliNum > 0 ? hargaBeliNum : modToHarga(modCode);

    const [result] = await connection.execute(`
      INSERT INTO barang (
        kode_barang, nama_barang, kategori_id, merk,
        stok_awal, total_masuk, total_keluar, stok_akhir,
        \`MOD\`, harga_jual, modal_harga_beli, keterangan
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)
    `, [
      kode_barang,
      nama_barang.trim(),
      kategori_id,
      merk ? merk.trim() : '',
      initialStock,
      stok_akhir,
      modCode,
      sellPrice,
      unitCost,
      keterangan || null
    ]);

    // Log Activity for Bell Notification
    await logActivity({
      tipe: 'barang',
      judul: 'Barang Baru Ditambahkan',
      detail: `Barang [${kode_barang}] ${nama_barang.trim()} (Merk: ${merk || 'Noname'}, MOD: ${modCode || '-'}, Stok: ${initialStock}) berhasil ditambahkan.`
    });

    await connection.commit();

    return res.status(201).json({
      message: 'Barang berhasil ditambahkan.',
      data: {
        id: result.insertId,
        kode_barang,
        nama_barang: nama_barang.trim(),
        MOD: modCode
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('createBarang error:', err);
    return res.status(500).json({ error: 'Gagal membuat barang baru.' });
  } finally {
    connection.release();
  }
};

// Admin: Update Barang
const updateBarang = async (req, res) => {
  const { id } = req.params;
  const {
    nama_barang,
    kategori_id,
    merk,
    MOD = '',
    harga_beli = 0,
    harga_jual,
    keterangan
  } = req.body;

  if (!nama_barang || !nama_barang.trim()) {
    return res.status(400).json({ error: 'Nama barang wajib diisi.' });
  }

  const hargaBeliNum = parseFloat(harga_beli || 0);
  let modCode = String(MOD || '').trim().toUpperCase();
  if (hargaBeliNum > 0) {
    modCode = hargaToMod(hargaBeliNum);
  }

  try {
    const [existing] = await pool.execute('SELECT * FROM barang WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    const unitCost = hargaBeliNum > 0 ? hargaBeliNum : modToHarga(modCode);

    await pool.execute(`
      UPDATE barang
      SET nama_barang = ?, kategori_id = ?, merk = ?, \`MOD\` = ?, harga_jual = ?, modal_harga_beli = ?, keterangan = ?
      WHERE id = ?
    `, [
      nama_barang.trim(),
      kategori_id,
      merk ? merk.trim() : '',
      modCode,
      parseFloat(harga_jual || 0),
      unitCost,
      keterangan || null,
      id
    ]);

    // Catat log aktivitas (notifikasi lonceng)
    const changes = [];
    if (existing[0].nama_barang !== nama_barang.trim()) {
      changes.push(`Nama: "${existing[0].nama_barang}" → "${nama_barang.trim()}"`);
    }
    if ((existing[0].merk || '') !== (merk ? merk.trim() : '')) {
      changes.push(`Merk: "${existing[0].merk || '-'}" → "${merk ? merk.trim() : '-'}"`);
    }
    if (parseFloat(existing[0].harga_jual) !== parseFloat(harga_jual || 0)) {
      changes.push(`Harga: Rp ${parseFloat(existing[0].harga_jual || 0).toLocaleString('id-ID')} → Rp ${parseFloat(harga_jual || 0).toLocaleString('id-ID')}`);
    }
    if ((existing[0].MOD || '') !== modCode) {
      changes.push(`MOD: "${existing[0].MOD || '-'}" → "${modCode || '-'}"`);
    }

    const detailLog = changes.length > 0
      ? `Barang [${existing[0].kode_barang}] diperbarui (${changes.join(', ')}).`
      : `Barang [${existing[0].kode_barang}] ${nama_barang.trim()} berhasil diperbarui.`;

    await logActivity({
      tipe: 'barang',
      judul: 'Barang Diperbarui',
      detail: detailLog
    });

    return res.json({ message: 'Data barang berhasil diperbarui.' });
  } catch (err) {
    console.error('updateBarang error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui data barang.' });
  }
};

// Admin: Modal "Tambah Stok" (Sinkron ke Pembelian & Update MOD)
const tambahStokBarang = async (req, res) => {
  const { id } = req.params;
  const {
    harga_beli = 0,
    harga_baru_modal_satuan = '',
    jumlah_masuk,
    tanggal
  } = req.body;

  const jumlah = parseInt(jumlah_masuk, 10);
  const hargaBeliNum = parseFloat(harga_beli || 0);
  let modBaru = String(harga_baru_modal_satuan || '').trim().toUpperCase();
  if (hargaBeliNum > 0) {
    modBaru = hargaToMod(hargaBeliNum);
  }
  const tanggalBeli = tanggal || new Date().toISOString().split('T')[0];

  if (!jumlah || jumlah <= 0) {
    return res.status(400).json({ error: 'Jumlah masuk harus lebih besar dari 0.' });
  }
  if (!modBaru) {
    return res.status(400).json({ error: 'Harga beli (modal) wajib diisi untuk membuat kode MOD.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, kode_barang, nama_barang, `MOD`, total_masuk, stok_akhir FROM barang WHERE id = ? FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    const item = rows[0];

    const unitCost = hargaBeliNum > 0 ? hargaBeliNum : modToHarga(modBaru);
    const totalPembayaran = unitCost * jumlah;

    // 1. Record in pembelian
    await connection.execute(`
      INSERT INTO pembelian (
        barang_id, kode_barang, nama_barang, harga_lama,
        harga_baru_modal_satuan, jumlah_masuk, total_pembayaran,
        tanggal, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id,
      item.kode_barang,
      item.nama_barang,
      item.MOD || null,
      modBaru,
      jumlah,
      totalPembayaran,
      tanggalBeli,
      req.user.id
    ]);

    // 2. Update barang: update MOD code, modal_harga_beli, increase total_masuk & stok_akhir
    await connection.execute(`
      UPDATE barang
      SET 
        \`MOD\` = ?,
        modal_harga_beli = ?,
        total_masuk = total_masuk + ?,
        stok_akhir = stok_akhir + ?
      WHERE id = ?
    `, [modBaru, unitCost, jumlah, jumlah, item.id]);

    // 3. Log Activity for Bell Notification
    await logActivity({
      tipe: 'pembelian',
      judul: 'Stok Baru Ditambahkan',
      detail: `Tambah stok ${jumlah} unit untuk [${item.kode_barang}] ${item.nama_barang}. MOD Baru: ${modBaru} (MOD Lama: ${item.MOD || '-'}).`
    });

    await connection.commit();

    return res.json({
      message: 'Stok berhasil ditambahkan dan tercatat di tabel pembelian.',
      stok_baru: item.stok_akhir + jumlah,
      MOD_baru: modBaru
    });
  } catch (err) {
    await connection.rollback();
    console.error('tambahStokBarang error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan stok barang.' });
  } finally {
    connection.release();
  }
};

// Admin: Delete Barang
const deleteBarang = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.execute('SELECT * FROM barang WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    const item = existing[0];

    const [sales] = await pool.execute('SELECT id FROM penjualan WHERE barang_id = ? LIMIT 1', [id]);
    const [purchases] = await pool.execute('SELECT id FROM pembelian WHERE barang_id = ? LIMIT 1', [id]);

    if (sales.length > 0 || purchases.length > 0) {
      await pool.execute('UPDATE barang SET deleted_at = NOW() WHERE id = ?', [id]);

      await logActivity({
        tipe: 'barang',
        judul: 'Barang Diarsipkan',
        detail: `Barang [${item.kode_barang}] "${item.nama_barang}" diarsipkan (memiliki riwayat transaksi).`
      });

      return res.json({ message: 'Barang berhasil diarsipkan karena memiliki riwayat transaksi.' });
    } else {
      await pool.execute('DELETE FROM barang WHERE id = ?', [id]);

      await logActivity({
        tipe: 'barang',
        judul: 'Barang Dihapus',
        detail: `Barang [${item.kode_barang}] "${item.nama_barang}" berhasil dihapus permanen.`
      });

      return res.json({ message: 'Barang berhasil dihapus secara permanen.' });
    }
  } catch (err) {
    console.error('deleteBarang error:', err);
    return res.status(500).json({ error: 'Gagal menghapus barang.' });
  }
};

module.exports = {
  getAllBarang,
  getBarangById,
  lookupBarang,
  createBarang,
  updateBarang,
  tambahStokBarang,
  deleteBarang
};
