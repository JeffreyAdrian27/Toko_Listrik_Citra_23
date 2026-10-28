const pool = require('../config/db');
const { logActivity } = require('./activityController');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Natural sort collator (mengurutkan nama barang dan angka majemuk seperti 'easy9 2A', 'easy9 20A' secara alami)
const naturalCollator = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });

// Helper to sanitize barcode value (prevent literal 'null', 'undefined', or '-' from being stored)
function sanitizeBarcode(val) {
  if (val === undefined) return undefined;
  if (val === null) return null;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return null;
  }
  return str;
}

// Helper to detect if a brand is generic / no-name
function isNoNameBrand(rawMerk) {
  if (!rawMerk || !rawMerk.trim()) return true;
  const cleaned = rawMerk.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (cleaned.length === 0) return true;
  const noNameAliases = ['NONAME', 'NONNAME', 'NON', 'NN', 'NOBRAND', 'NONMERK', 'TANPAMERK', 'TANPABRAND', 'NOMERK'];
  return noNameAliases.includes(cleaned) || cleaned.startsWith('NONAME');
}

// Helper to generate prefix candidates based on brand name
function generatePrefixCandidates(rawMerk) {
  if (isNoNameBrand(rawMerk)) return ['NN'];
  const cleaned = rawMerk.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
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

// Helper to generate kode_barang with dynamic collision resolution and user sub-code
async function generateKodeBarang(connection, merk, subKode = '') {
  const cleanSubKode = (subKode !== undefined && subKode !== null)
    ? String(subKode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    : '';

  let brandPrefix = 'NN';

  if (!isNoNameBrand(merk)) {
    const candidates = generatePrefixCandidates(merk);
    const targetMerkNormalized = (merk || '').trim().toLowerCase();
    brandPrefix = candidates[0];

    for (const cand of candidates) {
      const testPrefix = `C23${cand}`;

      // Cek apakah prefix ini sudah pernah dipakai di tabel barang oleh merk lain
      const [existing] = await connection.execute(
        'SELECT DISTINCT LOWER(TRIM(merk)) AS merk FROM barang WHERE kode_barang LIKE ? AND deleted_at IS NULL',
        [`${testPrefix}%`]
      );

      if (existing.length === 0) {
        brandPrefix = cand;
        break;
      }

      const isSameMerk = existing.some(row => row.merk === targetMerkNormalized);
      if (isSameMerk) {
        brandPrefix = cand;
        break;
      }
    }
  }

  // Format prefix: C23 + Brand (3 huruf / NN) + Inputan Sub-Kode User
  // Contoh: C23 + PHI + 18 => C23PHI18
  // Contoh: C23 + NN + 18 => C23NN18
  const fullPrefix = `C23${brandPrefix}${cleanSubKode}`;

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

  // Jika ada input sub-kode: pakai urutan 3 digit (001, 002, 003...)
  // Jika tanpa sub-kode: fallback ke 5 digit (00001, 00002...)
  const padLength = cleanSubKode ? 3 : 5;
  const paddedSeq = nextSeq > (padLength === 3 ? 999 : 99999)
    ? String(nextSeq)
    : String(nextSeq).padStart(padLength, '0');

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

    const query = `
      SELECT 
        b.id, b.kode_barang, b.barcode, b.nama_barang, b.kategori_id, k.nama_kategori,
        b.merk, b.stok_awal, b.total_masuk, b.total_keluar, b.stok_akhir,
        b.modal_harga_beli,
        b.harga_jual, b.keterangan, b.created_at
      FROM barang b
      LEFT JOIN kategori k ON b.kategori_id = k.id
      ${whereClause}
    `;

    const [allRows] = await pool.query(query, params);
    allRows.sort((a, b) => naturalCollator.compare(a.nama_barang || '', b.nama_barang || ''));

    const total = allRows.length;
    const paginatedRows = allRows.slice(offset, offset + limit);

    return res.json({
      data: paginatedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
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
      LIMIT 100
    `, params);

    rows.sort((a, b) => naturalCollator.compare(a.nama_barang || '', b.nama_barang || ''));
    return res.json({ data: rows.slice(0, 50) });
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
      ? 'b.id, b.kode_barang, b.barcode, b.nama_barang, b.kategori_id, k.nama_kategori, b.merk, b.stok_akhir, b.harga_jual, b.modal_harga_beli, b.keterangan'
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
    sub_kode,
    stok_awal = 0,
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
  if (!sub_kode || !String(sub_kode).trim()) {
    return res.status(400).json({ error: 'Kode barang (sub-kode) wajib diisi (contoh: 18, 15).' });
  }

  const rawBarcode = sanitizeBarcode(barcode) || null;
  const initialStock = parseInt(stok_awal || 0, 10);
  const sellPrice = parseFloat(harga_jual || 0);
  const unitCost = parseFloat(harga_beli || 0);

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

    // Cek duplikasi nama barang
    const [nameDup] = await connection.execute(
      'SELECT id, nama_barang, kode_barang FROM barang WHERE LOWER(TRIM(nama_barang)) = ? AND deleted_at IS NULL LIMIT 1',
      [nama_barang.trim().toLowerCase()]
    );
    if (nameDup.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        error: `Barang dengan nama "${nama_barang.trim()}" sudah ada di database [${nameDup[0].kode_barang}]. Untuk menambah stok, gunakan tombol "+ Stok" pada baris barang tersebut atau melalui menu Pembelian.`
      });
    }

    const kode_barang = await generateKodeBarang(connection, merk, sub_kode);
    const stok_akhir = initialStock;

    const [result] = await connection.execute(`
      INSERT INTO barang (
        kode_barang, barcode, nama_barang, kategori_id, merk,
        stok_awal, total_masuk, total_keluar, stok_akhir,
        harga_jual, modal_harga_beli, keterangan
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `, [
      kode_barang,
      rawBarcode,
      nama_barang.trim(),
      kategori_id,
      merk ? merk.trim() : '',
      initialStock,
      stok_akhir,
      sellPrice,
      unitCost,
      keterangan || null
    ]);

    // Log Activity for Bell Notification
    await logActivity({
      tipe: 'barang',
      judul: 'Barang Baru Ditambahkan',
      detail: `Barang [${kode_barang}] ${nama_barang.trim()} (Merk: ${merk || 'Noname'}, Harga Beli: Rp ${unitCost.toLocaleString('id-ID')}, Stok: ${initialStock}) berhasil ditambahkan.`
    });

    await connection.commit();

    return res.status(201).json({
      message: 'Barang berhasil ditambahkan.',
      data: {
        id: result.insertId,
        kode_barang,
        barcode: rawBarcode,
        nama_barang: nama_barang.trim(),
        modal_harga_beli: unitCost
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
    harga_beli = 0,
    harga_jual,
    keterangan
  } = req.body;

  if (!nama_barang || !nama_barang.trim()) {
    return res.status(400).json({ error: 'Nama barang wajib diisi.' });
  }

  const rawBarcode = sanitizeBarcode(barcode);
  const unitCost = parseFloat(harga_beli || 0);

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

    // Cek duplikasi nama barang jika diubah
    const [nameDup] = await pool.execute(
      'SELECT id, nama_barang, kode_barang FROM barang WHERE LOWER(TRIM(nama_barang)) = ? AND id != ? AND deleted_at IS NULL LIMIT 1',
      [nama_barang.trim().toLowerCase(), id]
    );
    if (nameDup.length > 0) {
      return res.status(400).json({
        error: `Barang dengan nama "${nama_barang.trim()}" sudah digunakan oleh barang [${nameDup[0].kode_barang}].`
      });
    }

    // Deteksi apakah ada data yang benar-benar berubah
    const oldCost = parseFloat(existing[0].modal_harga_beli || 0);
    const newHargaJual = parseFloat(harga_jual || 0);
    const oldHargaJual = parseFloat(existing[0].harga_jual || 0);
    const oldNama = (existing[0].nama_barang || '').trim();
    const newNama = (nama_barang || '').trim();
    const oldBarcode = existing[0].barcode ? String(existing[0].barcode).trim() : null;
    const newBarcode = finalBarcode ? String(finalBarcode).trim() : null;
    const oldMerk = (existing[0].merk || '').trim();
    const newMerk = (merk || '').trim();
    const oldKategoriId = String(existing[0].kategori_id || '');
    const newKategoriId = String(kategori_id || '');
    const oldKeterangan = (existing[0].keterangan || '').trim();
    const newKeterangan = (keterangan || '').trim();

    const changes = [];
    if (oldNama !== newNama) {
      changes.push(`Nama: "${oldNama}" → "${newNama}"`);
    }
    if (oldBarcode !== newBarcode) {
      changes.push(`Barcode: "${oldBarcode || '-'}" → "${newBarcode || '-'}"`);
    }
    if (oldKategoriId !== newKategoriId) {
      changes.push(`Kategori diubah`);
    }
    if (oldMerk !== newMerk) {
      changes.push(`Merk: "${oldMerk || '-'}" → "${newMerk || '-'}"`);
    }
    if (oldHargaJual !== newHargaJual) {
      changes.push(`Harga: Rp ${oldHargaJual.toLocaleString('id-ID')} → Rp ${newHargaJual.toLocaleString('id-ID')}`);
    }
    if (oldCost !== unitCost) {
      changes.push(`Harga Beli: Rp ${oldCost.toLocaleString('id-ID')} → Rp ${unitCost.toLocaleString('id-ID')}`);
    }
    if (oldKeterangan !== newKeterangan) {
      changes.push(`Keterangan diubah`);
    }

    // Jika tidak ada perubahan data sama sekali: jangan berikan log atau notifikasi
    if (changes.length === 0) {
      return res.json({ message: 'Tidak ada perubahan pada data barang.' });
    }

    await pool.execute(`
      UPDATE barang
      SET nama_barang = ?, barcode = ?, kategori_id = ?, merk = ?, harga_jual = ?, modal_harga_beli = ?, keterangan = ?
      WHERE id = ?
    `, [
      newNama,
      newBarcode,
      kategori_id,
      newMerk,
      newHargaJual,
      unitCost,
      newKeterangan || null,
      id
    ]);

    // Sinkronkan perubahan ke tabel pembelian
    if (oldNama !== newNama) {
      await pool.execute('UPDATE pembelian SET nama_barang = ? WHERE barang_id = ?', [newNama, id]);
    }

    if (oldCost !== unitCost) {
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
          [String(unitCost), newTotalLast, lastRow.id]
        );

        // 2. Jika ada transaksi pembelian sebelumnya yang harganya masih '-' atau Rp 0, ikut perbarui
        for (let i = 1; i < pembelianRows.length; i++) {
          const row = pembelianRows[i];
          if (row.harga_baru_modal_satuan === '-' || row.harga_baru_modal_satuan === '' || parseFloat(row.total_pembayaran || 0) === 0) {
            const newTotal = unitCost * (row.jumlah_masuk || 0);
            await pool.execute(
              'UPDATE pembelian SET harga_baru_modal_satuan = ?, total_pembayaran = ? WHERE id = ?',
              [String(unitCost), newTotal, row.id]
            );
          }
        }
      }
    }

    // Catat log aktivitas (notifikasi lonceng) HANYA jika ada perubahan
    const detailLog = `Barang [${existing[0].kode_barang}] diperbarui (${changes.join(', ')}).`;

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

// Admin: Modal "Tambah Stok" (Sinkron ke Pembelian & Update Harga Beli)
const tambahStokBarang = async (req, res) => {
  const { id } = req.params;
  const {
    harga_beli = 0,
    jumlah_masuk,
    tanggal
  } = req.body;

  const jumlah = parseInt(jumlah_masuk, 10);
  const hargaBeliNum = parseFloat(harga_beli || 0);
  const tanggalBeli = tanggal || new Date().toISOString().split('T')[0];

  if (!jumlah || jumlah <= 0) {
    return res.status(400).json({ error: 'Jumlah masuk harus lebih besar dari 0.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, kode_barang, nama_barang, modal_harga_beli, total_masuk, stok_akhir FROM barang WHERE id = ? FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    const item = rows[0];
    const unitCost = hargaBeliNum > 0 ? hargaBeliNum : parseFloat(item.modal_harga_beli || 0);

    if (unitCost <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Harga beli (modal) satuan wajib diisi.' });
    }

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
      String(item.modal_harga_beli || 0),
      String(unitCost),
      jumlah,
      totalPembayaran,
      tanggalBeli,
      req.user.id
    ]);

    // 2. Update barang: modal_harga_beli, increase total_masuk & stok_akhir
    await connection.execute(`
      UPDATE barang
      SET 
        modal_harga_beli = ?,
        total_masuk = total_masuk + ?,
        stok_akhir = stok_akhir + ?
      WHERE id = ?
    `, [unitCost, jumlah, jumlah, item.id]);

    // 3. Log Activity for Bell Notification
    await logActivity({
      tipe: 'pembelian',
      judul: 'Stok Baru Ditambahkan',
      detail: `Tambah stok ${jumlah} unit untuk [${item.kode_barang}] ${item.nama_barang}. Harga Beli: Rp ${unitCost.toLocaleString('id-ID')}.`
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

    // 1. Lebar Kolom (10 kolom: Tanggal, Barcode, Kategori, Nama, Merk, Kode Sub, Harga Lama, Harga Baru Modal Satuan, Harga Jual, Jumlah Masuk)
    worksheet.columns = [
      { key: 'tanggal', width: 16 },
      { key: 'barcode', width: 22 },
      { key: 'kategori', width: 25 },
      { key: 'nama', width: 48 },
      { key: 'merk', width: 18 },
      { key: 'sub_kode', width: 24 },
      { key: 'harga_lama', width: 18 },
      { key: 'harga_baru', width: 28 },
      { key: 'harga_jual', width: 20 },
      { key: 'jumlah_masuk', width: 24 }
    ];

    // 2. Row 1: Banner Judul (Merged A1:J1)
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REKAPAN BARANG MASUK - BULANAN';
    titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 36;

    // 3. Row 2: Periode
    const periodeCell = worksheet.getCell('A2');
    periodeCell.value = 'PERIODE : ';
    periodeCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
    periodeCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(2).height = 24;

    // 4. Row 3: Header Kolom Sesuai Format Toko Citra 23
    const headers = [
      'TANGGAL',
      'BARCODE (OPSIONAL)',
      'KATEGORI BARANG',
      'NAMA BARANG',
      'MERK',
      'KODE (WAJIB BARANG BARU)',
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
        fgColor: { argb: 'FF2F6DB5' }
      };
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' }
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

    // 5. Data Contoh / Template (Harga Beli & Harga Jual angka nominal Rupiah)
    const sampleData = [
      ['25/10/2026', '', 'LAMPU MEGAMAN', 'lampu emergency LED bulb megaman 9w', 'Megaman', '18', 10000, 20000, 35000, 10],
      ['', '', 'LAMPU MEGAMAN', 'lampu emergency LED bulb megaman 12w', 'Megaman', '18', 10000, '-', 28000, 20],
      ['', '8999876543210', 'FITTING', 'fitting lampu gantung karet waterproof', '', '15', 10000, 12000, 15000, 15]
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

        if (colNumber === 2 || colNumber === 6) {
          cell.numFmt = '@';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 4) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 3 || colNumber === 5) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 7 || colNumber === 8 || colNumber === 9) {
          // Kolom Harga Lama, Harga Baru Modal Satuan, Harga Jual: Format angka numerik ribuan
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0';
          }
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

// Admin: Import Barang Massal dari Excel dengan cek nama barang & update stok/modal otomatis
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
    const colSubKode = headerRow.findIndex(h => 
      h === 'KODE' || 
      h.startsWith('KODE') ||
      h.includes('KODE (WAJIB') || 
      h.includes('KODE (OPSIONAL)') || 
      h.includes('SUB KODE') || 
      h.includes('SUB-KODE') || 
      h.includes('KODE TIPE') || 
      (h.includes('KODE') && !h.includes('BARCODE') && !h.includes('NAMA BARANG'))
    );
    const colHargaLama = headerRow.findIndex(h => h.includes('HARGA LAMA') || h.includes('MODAL LAMA'));
    const colHargaBeli = headerRow.findIndex(h => 
      (h.includes('HARGA BARU') || h.includes('MODAL SATUAN') || h.includes('HARGA BELI') || h.includes('MODAL')) && 
      !h.includes('LAMA') && !h.includes('JUAL')
    );
    const colHargaJual = headerRow.findIndex(h => h.includes('HARGA JUAL') || (h.includes('JUAL') && !h.includes('BELI') && !h.includes('MODAL')));
    const colQty = headerRow.findIndex(h => 
      (h.includes('JUMLAH MASUK') || h.includes('JUMLAH') || h.includes('QTY') || h.includes('STOK') || h.includes('UNIT') || h.includes('MASUK')) && 
      !h.includes('HARGA') && !h.includes('MODAL')
    );

    const todayStr = new Date().toISOString().split('T')[0];
    let lastSeenDate = todayStr;

    function parseHargaJual(val) {
      if (val === undefined || val === null) return null;
      if (typeof val === 'number') {
        return !isNaN(val) && val >= 0 ? val : null;
      }
      let str = String(val).trim();
      if (!str || str === '-' || str === '–' || str === '—' || str.toLowerCase() === 'null') return null;
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

    function parseHargaBeli(val) {
      return parseHargaJual(val);
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

      // Handle format DD/MM/YYYY atau DD-MM-YYYY
      if (str.includes('/') || (str.includes('-') && str.split('-')[0].length <= 2)) {
        const sep = str.includes('/') ? '/' : '-';
        const parts = str.split(sep);
        if (parts.length === 3) {
          if (parts[0].length <= 2 && parts[2].length === 4) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
          }
        }
      }

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
    let stokUpdatedCount = 0;
    let priceUpdatedCount = 0;
    let unchangedCount = 0;
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

      // 3b. Sub-Kode (Opsional: misal 18, 15, A1)
      let rawSubKode = '';
      if (colSubKode !== -1 && row[colSubKode] !== undefined && row[colSubKode] !== null) {
        const val = String(row[colSubKode]).trim();
        if (val && !val.toUpperCase().startsWith('C23')) {
          rawSubKode = val;
        }
      }

      // 4. Harga Beli / Modal
      let inputHargaBeli = null;
      const rawHargaBaru = colHargaBeli !== -1 ? row[colHargaBeli] : null;
      const rawHargaLama = colHargaLama !== -1 ? row[colHargaLama] : null;

      // Prioritas 1: Ambil dari kolom HARGA BARU MODAL SATUAN
      if (rawHargaBaru !== undefined && rawHargaBaru !== null) {
        inputHargaBeli = parseHargaBeli(rawHargaBaru);
      }

      // Prioritas 2: Jika HARGA BARU kosong / '-' / null / 0, fallback ke HARGA LAMA
      if ((inputHargaBeli === null || inputHargaBeli <= 0) && rawHargaLama !== undefined && rawHargaLama !== null) {
        const fallbackLama = parseHargaBeli(rawHargaLama);
        if (fallbackLama !== null && fallbackLama > 0) {
          inputHargaBeli = fallbackLama;
        }
      }

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
          'SELECT id, kode_barang, barcode, nama_barang, merk, kategori_id, modal_harga_beli, harga_jual, stok_akhir, total_masuk FROM barang WHERE barcode = ? AND deleted_at IS NULL LIMIT 1',
          [cleanBarcode]
        );
        if (byBarcode.length > 0) {
          existing = byBarcode;
        }
      }

      if (existing.length === 0) {
        const [byName] = await connection.execute(
          'SELECT id, kode_barang, barcode, nama_barang, merk, kategori_id, modal_harga_beli, harga_jual, stok_akhir, total_masuk FROM barang WHERE LOWER(TRIM(nama_barang)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1',
          [namaBarang]
        );
        existing = byName;
      }

      if (existing.length > 0) {
        // SUDAH ADA: Update stok, perbarui harga beli, harga jual (& barcode jika ada input baru)
        const item = existing[0];
        const oldModal = parseFloat(item.modal_harga_beli || 0);
        const oldHargaJual = parseFloat(item.harga_jual || 0);
        const oldBarcode = item.barcode || null;

        // Prioritas Harga Beli: Jika diisi di Excel perbarui, jika kosong pertahankan modal lama
        const modalBaru = inputHargaBeli !== null ? inputHargaBeli : oldModal;
        const barcodeToSave = cleanBarcode || oldBarcode;
        // Prioritas Harga Jual: Jika diisi di Excel perbarui, jika kosong pertahankan harga jual lama
        const hargaJualFinal = inputHargaJual !== null ? inputHargaJual : oldHargaJual;

        // Periksa apakah ada perubahan nyata
        const isQtyChanged = qtyMasuk > 0;
        const isModalChanged = inputHargaBeli !== null && Math.abs(modalBaru - oldModal) > 0.001;
        const isHargaJualChanged = inputHargaJual !== null && Math.abs(hargaJualFinal - oldHargaJual) > 0.001;
        const isBarcodeChanged = cleanBarcode !== null && cleanBarcode !== oldBarcode;

        const hasAnyChange = isQtyChanged || isModalChanged || isHargaJualChanged || isBarcodeChanged;

        if (!hasAnyChange) {
          // Tidak ada perubahan sama sekali (Stok 0, harga sama, barcode sama)
          unchangedCount++;
          itemResults.push({
            status: 'unchanged',
            kode_barang: item.kode_barang,
            barcode: oldBarcode,
            nama_barang: item.nama_barang,
            merk: item.merk || rawMerk,
            stok_ditambah: 0,
            stok_akhir: item.stok_akhir,
            harga_beli_lama: oldModal,
            harga_beli_baru: oldModal,
            harga_jual: oldHargaJual,
            keterangan: 'Tidak ada perubahan'
          });
          continue;
        }

        await connection.execute(`
          UPDATE barang
          SET 
            barcode = ?,
            modal_harga_beli = ?,
            harga_jual = ?,
            total_masuk = total_masuk + ?,
            stok_akhir = stok_akhir + ?
          WHERE id = ?
        `, [barcodeToSave, modalBaru, hargaJualFinal, qtyMasuk, qtyMasuk, item.id]);

        if (isQtyChanged) {
          stokUpdatedCount++;
          const rawLamaParsed = (rawHargaLama !== undefined && rawHargaLama !== null) ? parseHargaBeli(rawHargaLama) : null;
          const hargaLamaText = (rawLamaParsed !== null && rawLamaParsed > 0)
            ? String(rawLamaParsed)
            : (oldModal > 0 ? String(oldModal) : '-');
          const hargaBaruText = modalBaru > 0 ? String(modalBaru) : '-';

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
        } else {
          priceUpdatedCount++;
        }

        itemResults.push({
          status: isQtyChanged ? 'stok_updated' : 'price_updated',
          kode_barang: item.kode_barang,
          barcode: barcodeToSave,
          nama_barang: item.nama_barang,
          merk: item.merk || rawMerk,
          stok_ditambah: qtyMasuk,
          stok_akhir: item.stok_akhir + qtyMasuk,
          harga_beli_lama: oldModal,
          harga_beli_baru: modalBaru,
          harga_jual: hargaJualFinal
        });
      } else {
        // BELUM ADA: Buat barang baru
        if (!rawSubKode || !rawSubKode.trim()) {
          skippedCount++;
          itemResults.push({
            status: 'skipped',
            nama_barang: namaBarang,
            error: 'Kolom KODE wajib diisi untuk barang baru.'
          });
          continue;
        }

        const modalSatuan = inputHargaBeli !== null ? inputHargaBeli : 0;
        // Jika ada input harga jual di Excel gunakan, jika kosong default 0
        const hargaJualAwal = inputHargaJual !== null ? inputHargaJual : 0;

        // Kode barang selalu digenerate sesuai coding (C23 + Merk/NN + SubKode + Urutan)
        const kodeBarangFinal = await generateKodeBarang(connection, rawMerk, rawSubKode);

        const [insertRes] = await connection.execute(`
          INSERT INTO barang (
            kode_barang, barcode, nama_barang, kategori_id, merk,
            stok_awal, total_masuk, total_keluar, stok_akhir,
            harga_jual, modal_harga_beli
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `, [
          kodeBarangFinal,
          cleanBarcode,
          namaBarang,
          kategoriId,
          rawMerk ? rawMerk.trim() : '',
          qtyMasuk,
          qtyMasuk,
          qtyMasuk,
          hargaJualAwal,
          modalSatuan
        ]);

        const newId = insertRes.insertId;

        if (qtyMasuk > 0) {
          const rawLamaParsed = (rawHargaLama !== undefined && rawHargaLama !== null) ? parseHargaBeli(rawHargaLama) : null;
          const hargaLamaText = (rawLamaParsed !== null && rawLamaParsed > 0) ? String(rawLamaParsed) : '-';
          const hargaBaruText = modalSatuan > 0 ? String(modalSatuan) : '-';

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
          harga_beli: modalSatuan,
          harga_jual: hargaJualAwal
        });
      }
    }

    await connection.commit();

    await logActivity({
      tipe: 'pembelian',
      judul: 'Import Excel Berhasil',
      detail: `Import data Excel selesai: ${createdCount} barang baru, ${stokUpdatedCount} barang ditambah stok, ${priceUpdatedCount} diperbarui harga, ${unchangedCount} tidak berubah.`
    });

    const partsMsg = [];
    if (createdCount > 0) partsMsg.push(`${createdCount} barang baru dibuat`);
    if (stokUpdatedCount > 0) partsMsg.push(`${stokUpdatedCount} ditambah stok`);
    if (priceUpdatedCount > 0) partsMsg.push(`${priceUpdatedCount} diperbarui harga`);
    if (unchangedCount > 0) partsMsg.push(`${unchangedCount} tidak ada perubahan`);
    const finalMsg = partsMsg.length > 0 
      ? `Berhasil memproses file Excel: ${partsMsg.join(', ')}.`
      : 'File Excel selesai diproses (tidak ada data yang perlu diubah).';

    return res.json({
      message: finalMsg,
      summary: {
        total: itemResults.length,
        created: createdCount,
        stok_updated: stokUpdatedCount,
        price_updated: priceUpdatedCount,
        unchanged: unchangedCount,
        updated: stokUpdatedCount + priceUpdatedCount,
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
