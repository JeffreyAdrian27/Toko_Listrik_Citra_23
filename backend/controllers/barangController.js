const pool = require('../config/db');
const { logActivity } = require('./activityController');
const { hargaToMod, modToHarga } = require('../utils/modHelper');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

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
      const rawSearch = req.query.search.trim();
      const tokens = rawSearch.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        tokens.forEach(tok => {
          whereClause += ` AND CONCAT_WS(' ', b.kode_barang, COALESCE(b.barcode, ''), b.nama_barang, COALESCE(b.merk, ''), COALESCE(k.nama_kategori, '')) LIKE ?`;
          params.push(`%${tok}%`);
        });
      }
    }

    if (kategoriId) {
      whereClause += ' AND b.kategori_id = ?';
      params.push(kategoriId);
    }

    if (lowStock) {
      whereClause += ' AND b.stok_akhir <= 5';
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM barang b LEFT JOIN kategori k ON b.kategori_id = k.id ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const query = `
      SELECT 
        b.id, b.kode_barang, b.barcode, b.nama_barang, b.kategori_id, k.nama_kategori,
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
        b.id, b.kode_barang, b.barcode, b.nama_barang, b.kategori_id, k.nama_kategori,
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
    const rawSearch = req.query.search ? req.query.search.trim() : '';
    const tokens = rawSearch ? rawSearch.split(/\s+/).filter(Boolean) : [];

    let whereClause = 'WHERE b.deleted_at IS NULL AND b.harga_jual > 0';
    const params = [];

    if (tokens.length > 0) {
      tokens.forEach(tok => {
        whereClause += ` AND CONCAT_WS(' ', b.kode_barang, COALESCE(b.barcode, ''), b.nama_barang, COALESCE(b.merk, ''), COALESCE(k.nama_kategori, '')) LIKE ?`;
        params.push(`%${tok}%`);
      });
    }

    const [rows] = await pool.execute(`
      SELECT 
        b.id, b.kode_barang, b.barcode, b.nama_barang, b.merk,
        k.nama_kategori, b.stok_akhir, b.harga_jual
      FROM barang b
      LEFT JOIN kategori k ON b.kategori_id = k.id
      ${whereClause}
      ORDER BY b.nama_barang ASC
      LIMIT 50
    `, params);

    return res.json({ data: rows });
  } catch (err) {
    console.error('lookupBarang error:', err);
    return res.status(500).json({ error: 'Gagal mencari barang.' });
  }
};

// Check if barcode or code exists (Admin & Pegawai)
const checkBarcode = async (req, res) => {
  try {
    const rawBarcode = req.params.barcode ? req.params.barcode.trim() : '';
    if (!rawBarcode) {
      return res.status(400).json({ error: 'Barcode tidak boleh kosong.' });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const selectFields = isAdmin
      ? 'b.id, b.kode_barang, b.barcode, b.nama_barang, b.kategori_id, k.nama_kategori, b.merk, b.stok_akhir, b.harga_jual, b.`MOD`, b.modal_harga_beli, b.keterangan'
      : 'b.id, b.kode_barang, b.barcode, b.nama_barang, b.kategori_id, k.nama_kategori, b.merk, b.stok_akhir, b.harga_jual';

    const [rows] = await pool.execute(
      `SELECT ${selectFields}
       FROM barang b
       LEFT JOIN kategori k ON b.kategori_id = k.id
       WHERE (b.barcode = ? OR b.kode_barang = ?) AND b.deleted_at IS NULL
       LIMIT 1`,
      [rawBarcode, rawBarcode]
    );

    if (rows.length > 0) {
      return res.json({ exists: true, barang: rows[0] });
    }

    return res.json({ exists: false, barang: null });
  } catch (err) {
    console.error('checkBarcode error:', err);
    return res.status(500).json({ error: 'Gagal memeriksa barcode.' });
  }
};

// Hitung check digit EAN-13 standard
function calculateEan13CheckDigit(twelveDigits) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = parseInt(twelveDigits[i], 10);
    sum += (i % 2 === 0) ? num : num * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

// Generate Barcode unik standar toko (EAN-13 dengan prefix 23)
const generateBarcode = async (req, res) => {
  try {
    let attempts = 0;
    let candidate = '';
    let isUnique = false;

    while (!isUnique && attempts < 25) {
      attempts++;
      // Format 12 digit: '23' (Prefix Toko Citra 23) + 6 digit timestamp + 4 digit acak
      const ts = String(Date.now()).slice(-6);
      const rand = String(Math.floor(1000 + Math.random() * 9000));
      const twelve = `23${ts}${rand}`;
      const checkDigit = calculateEan13CheckDigit(twelve);
      candidate = `${twelve}${checkDigit}`;

      const [existing] = await pool.execute(
        'SELECT id FROM barang WHERE (barcode = ? OR kode_barang = ?) AND deleted_at IS NULL LIMIT 1',
        [candidate, candidate]
      );
      if (existing.length === 0) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Gagal membuat barcode unik. Silakan coba lagi.' });
    }

    return res.json({ success: true, barcode: candidate });
  } catch (err) {
    console.error('generateBarcode error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan saat generate barcode.' });
  }
};

// Admin: Create Barang (MOD string code)
const createBarang = async (req, res) => {
  const {
    nama_barang,
    barcode,
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

  const rawBarcode = barcode ? String(barcode).trim() : null;
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

    // Cek duplikasi barcode jika diisi
    if (rawBarcode) {
      const [dup] = await connection.execute(
        'SELECT id, nama_barang, kode_barang FROM barang WHERE (barcode = ? OR kode_barang = ?) AND deleted_at IS NULL LIMIT 1',
        [rawBarcode, rawBarcode]
      );
      if (dup.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `Barcode "${rawBarcode}" sudah digunakan oleh barang [${dup[0].kode_barang}] ${dup[0].nama_barang}.`
        });
      }
    }

    const kode_barang = await generateKodeBarang(connection, merk);
    const stok_akhir = initialStock;

    const unitCost = hargaBeliNum > 0 ? hargaBeliNum : modToHarga(modCode);

    const [result] = await connection.execute(`
      INSERT INTO barang (
        kode_barang, barcode, nama_barang, kategori_id, merk,
        stok_awal, total_masuk, total_keluar, stok_akhir,
        \`MOD\`, harga_jual, modal_harga_beli, keterangan
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)
    `, [
      kode_barang,
      rawBarcode,
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
        barcode: rawBarcode,
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
    barcode,
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

  const rawBarcode = barcode !== undefined ? (String(barcode).trim() || null) : undefined;
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

    // Cek duplikasi barcode jika diubah
    const finalBarcode = rawBarcode !== undefined ? rawBarcode : existing[0].barcode;
    if (finalBarcode) {
      const [dup] = await pool.execute(
        'SELECT id, nama_barang, kode_barang FROM barang WHERE (barcode = ? OR kode_barang = ?) AND id != ? AND deleted_at IS NULL LIMIT 1',
        [finalBarcode, finalBarcode, id]
      );
      if (dup.length > 0) {
        return res.status(400).json({
          error: `Barcode "${finalBarcode}" sudah digunakan oleh barang [${dup[0].kode_barang}] ${dup[0].nama_barang}.`
        });
      }
    }

    const unitCost = hargaBeliNum > 0 ? hargaBeliNum : modToHarga(modCode);

    await pool.execute(`
      UPDATE barang
      SET nama_barang = ?, barcode = ?, kategori_id = ?, merk = ?, \`MOD\` = ?, harga_jual = ?, modal_harga_beli = ?, keterangan = ?
      WHERE id = ?
    `, [
      nama_barang.trim(),
      finalBarcode,
      kategori_id,
      merk ? merk.trim() : '',
      modCode,
      parseFloat(harga_jual || 0),
      unitCost,
      keterangan || null,
      id
    ]);

    // Sinkronkan perubahan ke tabel pembelian
    const newHargaBaruMod = modCode || '-';
    if (existing[0].nama_barang !== nama_barang.trim()) {
      await pool.execute('UPDATE pembelian SET nama_barang = ? WHERE barang_id = ?', [nama_barang.trim(), id]);
    }

    const oldCost = parseFloat(existing[0].modal_harga_beli || 0);
    if (oldCost !== unitCost || (existing[0].MOD || '') !== modCode) {
      const [pembelianRows] = await pool.execute(
        'SELECT id, jumlah_masuk, harga_baru_modal_satuan, total_pembayaran FROM pembelian WHERE barang_id = ? ORDER BY id DESC',
        [id]
      );

      if (pembelianRows.length > 0) {
        // 1. Update transaksi pembelian terakhir dengan harga beli baru
        const lastRow = pembelianRows[0];
        const newTotalLast = unitCost * (lastRow.jumlah_masuk || 0);
        await pool.execute(
          'UPDATE pembelian SET harga_baru_modal_satuan = ?, total_pembayaran = ? WHERE id = ?',
          [newHargaBaruMod, newTotalLast, lastRow.id]
        );

        // 2. Jika ada transaksi pembelian sebelumnya yang harganya masih '-' atau Rp 0, ikut perbarui
        for (let i = 1; i < pembelianRows.length; i++) {
          const row = pembelianRows[i];
          if (row.harga_baru_modal_satuan === '-' || row.harga_baru_modal_satuan === '' || parseFloat(row.total_pembayaran || 0) === 0) {
            const newTotal = unitCost * (row.jumlah_masuk || 0);
            await pool.execute(
              'UPDATE pembelian SET harga_baru_modal_satuan = ?, total_pembayaran = ? WHERE id = ?',
              [newHargaBaruMod, newTotal, row.id]
            );
          }
        }
      }
    }

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
    if (oldCost !== unitCost) {
      changes.push(`Modal Beli: Rp ${oldCost.toLocaleString('id-ID')} → Rp ${unitCost.toLocaleString('id-ID')}`);
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

// Admin: Unduh Template Excel untuk input barang (Desain elegan persis screenshot tanpa TOTAL PEMBAYARAN)
const downloadTemplateExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Toko Listrik Citra 23';
    workbook.lastModifiedBy = 'Toko Listrik Citra 23';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Sheet1', {
      views: [{ showGridLines: true }]
    });

    // 1. Lebar Kolom (9 kolom: Tanggal, Barcode, Kategori, Nama, Merk, Harga Lama, Harga Baru, Harga Jual, Qty)
    worksheet.columns = [
      { key: 'tanggal', width: 16 },
      { key: 'barcode', width: 22 },
      { key: 'kategori', width: 25 },
      { key: 'nama', width: 48 },
      { key: 'merk', width: 18 },
      { key: 'harga_lama', width: 18 },
      { key: 'harga_baru', width: 28 },
      { key: 'harga_jual', width: 20 },
      { key: 'jumlah_masuk', width: 16 }
    ];

    // 2. Row 1: Banner Judul (Merged A1:I1)
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REKAPAN BARANG MASUK -  BULANAN';
    titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 36;

    // 3. Row 2: Periode
    const periodeCell = worksheet.getCell('A2');
    periodeCell.value = 'PERIODE : ';
    periodeCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
    periodeCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(2).height = 24;

    // 4. Row 3: Header Kolom (Warna Biru Solid & Teks Putih Bold persis screenshot)
    const headers = [
      'TANGGAL',
      'BARCODE (OPSIONAL)',
      'KATEGORI BARANG',
      'NAMA BARANG',
      'MERK',
      'HARGA LAMA',
      'HARGA BARU MODAL SATUAN',
      'HARGA JUAL',
      'JUMLAH MASUK ( SATUAN )'
    ];

    const headerRow = worksheet.getRow(3);
    headerRow.values = headers;
    headerRow.height = 38;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F6DB5' } // Warna biru solid persis screenshot
      };
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' } // Teks putih bold
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1A4E8A' } },
        left: { style: 'thin', color: { argb: 'FF1A4E8A' } },
        bottom: { style: 'thin', color: { argb: 'FF1A4E8A' } },
        right: { style: 'thin', color: { argb: 'FF1A4E8A' } }
      };
    });

    // 5. Data Contoh / Template (Barcode opsional, Harga Jual angka rupiah)
    const sampleData = [
      ['2026-10-14', '8991234567890', 'LAMPU VOSCO', 'lampu LED t-bulb vosco 20w neo capsule', 'Vosco', 'LC', 'LT', 35000, 10],
      ['', '', 'PANASONIC', 'stop kontak tempel panasonic', 'Panasonic', 'CDS', 'CDL', 28000, 20],
      ['', '8999876543210', 'FITTING', 'fitting lampu gantung karet waterproof', '', '-', 'X', 15000, 15]
    ];

    sampleData.forEach((rowValues) => {
      const row = worksheet.addRow(rowValues);
      row.height = 24;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        if (colNumber === 2) {
          // Kolom Barcode: Format sebagai Text agar angka barcode panjang tidak terpotong
          cell.numFmt = '@';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 4) {
          // Nama Barang
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 3 || colNumber === 5) {
          // Kategori & Merk
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 8) {
          // Kolom Harga Jual: Format angka numerik ribuan
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Barang_Toko_Citra_23.xlsx"');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error('downloadTemplateExcel error:', err);
    return res.status(500).json({ error: 'Gagal mengunduh template Excel.' });
  }
};

// Admin: Import Barang Massal dari Excel dengan cek nama barang & update stok/MOD otomatis
const importExcelBarang = async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'File Excel wajib diunggah.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'File Excel tidak memiliki lembar kerja (sheet).' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (!rawData || rawData.length < 3) {
      await connection.rollback();
      return res.status(400).json({ error: 'Format data Excel terlalu pendek atau kosong.' });
    }

    // 1. Cari baris judul kolom (Header)
    let headerRowIdx = -1;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (row && row.some(cell => String(cell || '').toUpperCase().includes('NAMA BARANG'))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      await connection.rollback();
      return res.status(400).json({ error: 'Kolom "NAMA BARANG" tidak ditemukan pada file Excel.' });
    }

    const headerRow = rawData[headerRowIdx].map(h => String(h || '').trim().toUpperCase());
    const colTanggal = headerRow.findIndex(h => h.includes('TANGGAL'));
    const colBarcode = headerRow.findIndex(h => h.includes('BARCODE'));
    const colKategori = headerRow.findIndex(h => h.includes('KATEGORI'));
    const colNama = headerRow.findIndex(h => h.includes('NAMA BARANG'));
    const colMerk = headerRow.findIndex(h => h.includes('MERK'));
    const colKode = headerRow.findIndex(h => h.includes('KODE BARANG'));
    const colHargaLama = headerRow.findIndex(h => h.includes('HARGA LAMA'));
    const colHargaBaru = headerRow.findIndex(h => h.includes('HARGA BARU'));
    const colHargaJual = headerRow.findIndex(h => h.includes('HARGA JUAL') || (h.includes('JUAL') && !h.includes('MODAL')));
    const colQty = headerRow.findIndex(h => h.includes('JUMLAH MASUK'));

    const todayStr = new Date().toISOString().split('T')[0];
    let lastSeenDate = todayStr;

    function parseHargaJual(val) {
      if (val === undefined || val === null) return null;
      if (typeof val === 'number') {
        return !isNaN(val) && val >= 0 ? val : null;
      }
      let str = String(val).trim();
      if (!str || str === '-' || str.toLowerCase() === 'null') return null;
      str = str.replace(/[^0-9.,]/g, '');
      if (!str) return null;

      if (str.includes('.') && !str.includes(',')) {
        const parts = str.split('.');
        if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
          str = str.replace(/\./g, '');
        }
      } else if (str.includes(',') && !str.includes('.')) {
        const parts = str.split(',');
        if (parts.length > 1 && parts[parts.length - 1].length === 2) {
          str = str.replace(/,/g, '.');
        } else {
          str = str.replace(/,/g, '');
        }
      } else if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
      }

      const num = parseFloat(str);
      return !isNaN(num) && num >= 0 ? num : null;
    }

    function parseExcelDate(val, fallback) {
      if (!val) return fallback;
      if (typeof val === 'number') {
        const d = xlsx.SSF.parse_date_code(val);
        if (d) {
          const y = d.y;
          const m = String(d.m).padStart(2, '0');
          const day = String(d.d).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
      }
      const str = String(val).trim();
      if (!str) return fallback;
      if (!isNaN(str) && Number(str) > 30000) {
        return parseExcelDate(Number(str), fallback);
      }
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return fallback;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const itemResults = [];

    // Cache kategori agar query cepat
    const categoryCache = new Map();
    const [allCats] = await connection.execute('SELECT id, LOWER(TRIM(nama_kategori)) as name FROM kategori');
    for (const c of allCats) {
      categoryCache.set(c.name, c.id);
    }

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const namaBarang = colNama !== -1 && row[colNama] ? String(row[colNama]).trim() : '';
      if (!namaBarang) {
        skippedCount++;
        continue;
      }

      // 0. Barcode (Opsional: boleh terisi atau kosong/null)
      let cleanBarcode = null;
      if (colBarcode !== -1 && row[colBarcode] !== undefined && row[colBarcode] !== null) {
        let bStr = String(row[colBarcode]).trim();
        if (typeof row[colBarcode] === 'number') {
          bStr = Number(row[colBarcode]).toLocaleString('fullwide', { useGrouping: false });
        }
        if (bStr && bStr !== '-' && bStr.toLowerCase() !== 'null' && bStr.toLowerCase() !== 'undefined') {
          cleanBarcode = bStr;
        }
      }

      // 1. Tanggal
      const rawDate = colTanggal !== -1 ? row[colTanggal] : null;
      const parsedDate = parseExcelDate(rawDate, null);
      if (parsedDate) {
        lastSeenDate = parsedDate;
      }
      const finalDate = parsedDate || lastSeenDate;

      // 2. Kategori
      const rawKategori = colKategori !== -1 && row[colKategori] ? String(row[colKategori]).trim() : 'Umum';
      const cleanCatName = rawKategori.toLowerCase();
      let kategoriId = categoryCache.get(cleanCatName);
      if (!kategoriId) {
        const [catInsert] = await connection.execute(
          'INSERT INTO kategori (nama_kategori) VALUES (?)',
          [rawKategori]
        );
        kategoriId = catInsert.insertId;
        categoryCache.set(cleanCatName, kategoriId);
      }

      // 3. Merk
      const rawMerk = colMerk !== -1 && row[colMerk] ? String(row[colMerk]).trim() : '';

      // 4. Sandi MOD & Modal
      const rawHargaLama = colHargaLama !== -1 && row[colHargaLama] ? String(row[colHargaLama]).trim().toUpperCase() : '';
      const rawHargaBaru = colHargaBaru !== -1 && row[colHargaBaru] ? String(row[colHargaBaru]).trim().toUpperCase() : '';

      // 4b. Harga Jual (Opsional: angka/desimal/ribuan, jika diisi akan memperbarui atau mengatur harga jual)
      let inputHargaJual = null;
      if (colHargaJual !== -1 && row[colHargaJual] !== undefined && row[colHargaJual] !== null) {
        inputHargaJual = parseHargaJual(row[colHargaJual]);
      }

      // 5. Qty Masuk
      let qtyMasuk = 0;
      if (colQty !== -1 && row[colQty] !== undefined && row[colQty] !== null) {
        const parsedQty = parseInt(row[colQty], 10);
        if (!isNaN(parsedQty) && parsedQty >= 0) {
          qtyMasuk = parsedQty;
        }
      }

      // Cek apakah barang sudah ada di database (prioritas: barcode jika ada, lalu nama barang)
      let existing = [];
      if (cleanBarcode) {
        const [byBarcode] = await connection.execute(
          'SELECT id, kode_barang, barcode, nama_barang, merk, kategori_id, `MOD`, modal_harga_beli, harga_jual, stok_akhir, total_masuk FROM barang WHERE barcode = ? AND deleted_at IS NULL LIMIT 1',
          [cleanBarcode]
        );
        if (byBarcode.length > 0) {
          existing = byBarcode;
        }
      }

      if (existing.length === 0) {
        const [byName] = await connection.execute(
          'SELECT id, kode_barang, barcode, nama_barang, merk, kategori_id, `MOD`, modal_harga_beli, harga_jual, stok_akhir, total_masuk FROM barang WHERE LOWER(TRIM(nama_barang)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1',
          [namaBarang]
        );
        existing = byName;
      }

      if (existing.length > 0) {
        // SUDAH ADA: Update stok, perbarui MOD, harga jual (& barcode jika ada input baru)
        const item = existing[0];
        const oldMod = item.MOD || '';
        const oldModal = parseFloat(item.modal_harga_beli || 0);

        // Prioritas MOD: HARGA BARU > HARGA LAMA > MOD eksisting
        const hasHargaBaru = rawHargaBaru && rawHargaBaru !== '-';
        const hasHargaLama = rawHargaLama && rawHargaLama !== '-';
        const modBaru = hasHargaBaru ? rawHargaBaru : (hasHargaLama ? rawHargaLama : oldMod);
        const modalBaru = modBaru ? (modToHarga(modBaru) || oldModal) : oldModal;
        const barcodeToSave = cleanBarcode || item.barcode || null;
        // Prioritas Harga Jual: Jika diisi di Excel perbarui, jika kosong pertahankan harga jual lama
        const hargaJualFinal = inputHargaJual !== null ? inputHargaJual : parseFloat(item.harga_jual || 0);

        await connection.execute(`
          UPDATE barang
          SET 
            barcode = ?,
            \`MOD\` = ?,
            modal_harga_beli = ?,
            harga_jual = ?,
            total_masuk = total_masuk + ?,
            stok_akhir = stok_akhir + ?
          WHERE id = ?
        `, [barcodeToSave, modBaru, modalBaru, hargaJualFinal, qtyMasuk, qtyMasuk, item.id]);

        if (qtyMasuk > 0) {
          const hargaLamaText = oldMod || (hasHargaLama ? rawHargaLama : '-');
          const hargaBaruText = hasHargaBaru ? rawHargaBaru : '-';

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
            hargaLamaText,
            hargaBaruText,
            qtyMasuk,
            modalBaru * qtyMasuk,
            finalDate,
            req.user.id
          ]);
        }

        updatedCount++;
        itemResults.push({
          status: 'updated',
          kode_barang: item.kode_barang,
          barcode: barcodeToSave,
          nama_barang: item.nama_barang,
          merk: item.merk || rawMerk,
          stok_ditambah: qtyMasuk,
          stok_akhir: item.stok_akhir + qtyMasuk,
          mod_lama: oldMod,
          mod_baru: modBaru,
          harga_jual: hargaJualFinal
        });
      } else {
        // BELUM ADA: Buat barang baru
        const hasHargaBaru = rawHargaBaru && rawHargaBaru !== '-';
        const hasHargaLama = rawHargaLama && rawHargaLama !== '-';
        const activeMod = hasHargaBaru ? rawHargaBaru : (hasHargaLama ? rawHargaLama : '');
        const modalSatuan = activeMod ? modToHarga(activeMod) : 0;
        // Jika ada input harga jual di Excel gunakan, jika kosong default 0
        const hargaJualAwal = inputHargaJual !== null ? inputHargaJual : 0;

        // Kode barang selalu digenerate sesuai coding (tidak mengambil dari file Excel)
        const kodeBarangFinal = await generateKodeBarang(connection, rawMerk);

        const [insertRes] = await connection.execute(`
          INSERT INTO barang (
            kode_barang, barcode, nama_barang, kategori_id, merk,
            stok_awal, total_masuk, total_keluar, stok_akhir,
            \`MOD\`, harga_jual, modal_harga_beli
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        `, [
          kodeBarangFinal,
          cleanBarcode,
          namaBarang,
          kategoriId,
          rawMerk ? rawMerk.trim() : '',
          qtyMasuk,
          qtyMasuk,
          qtyMasuk,
          activeMod,
          hargaJualAwal,
          modalSatuan
        ]);

        const newId = insertRes.insertId;

        if (qtyMasuk > 0) {
          const hargaLamaText = hasHargaLama ? rawHargaLama : '-';
          const hargaBaruText = hasHargaBaru ? rawHargaBaru : '-';

          await connection.execute(`
            INSERT INTO pembelian (
              barang_id, kode_barang, nama_barang, harga_lama,
              harga_baru_modal_satuan, jumlah_masuk, total_pembayaran,
              tanggal, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            newId,
            kodeBarangFinal,
            namaBarang,
            hargaLamaText,
            hargaBaruText,
            qtyMasuk,
            modalSatuan * qtyMasuk,
            finalDate,
            req.user.id
          ]);
        }

        createdCount++;
        itemResults.push({
          status: 'created',
          kode_barang: kodeBarangFinal,
          barcode: cleanBarcode,
          nama_barang: namaBarang,
          merk: rawMerk,
          stok_awal: qtyMasuk,
          mod: activeMod,
          harga_jual: hargaJualAwal
        });
      }
    }

    await connection.commit();

    await logActivity({
      tipe: 'pembelian',
      judul: 'Import Excel Berhasil',
      detail: `Import data Excel selesai: ${createdCount} barang baru ditambahkan, ${updatedCount} barang diupdate stok, MOD & harga jual.`
    });

    return res.json({
      message: `Berhasil memproses ${itemResults.length} data barang dari Excel.`,
      summary: {
        total: itemResults.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount
      },
      data: itemResults
    });
  } catch (err) {
    await connection.rollback();
    console.error('importExcelBarang error:', err);
    return res.status(500).json({ error: 'Gagal memproses file Excel: ' + (err.message || 'Terjadi kesalahan.') });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllBarang,
  getBarangById,
  lookupBarang,
  checkBarcode,
  generateBarcode,
  createBarang,
  updateBarang,
  tambahStokBarang,
  deleteBarang,
  downloadTemplateExcel,
  importExcelBarang
};
