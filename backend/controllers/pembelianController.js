const pool = require('../config/db');
const { logActivity } = require('./activityController');
const { hargaToMod, modToHarga } = require('../utils/modHelper');

// Admin: Input Pembelian
const createPembelian = async (req, res) => {
  const {
    barang_id,
    harga_beli = 0,
    harga_baru_modal_satuan = '',
    jumlah_masuk,
    tanggal
  } = req.body;

  if (!barang_id) {
    return res.status(400).json({ error: 'Barang wajib dipilih.' });
  }

  const qty = parseInt(jumlah_masuk, 10);
  const purchaseDate = tanggal || new Date().toISOString().split('T')[0];

  if (!qty || qty <= 0) {
    return res.status(400).json({ error: 'Jumlah masuk harus lebih besar dari 0.' });
  }

  const hargaNum = parseFloat(harga_beli || 0);
  let costCode = String(harga_baru_modal_satuan || '').trim().toUpperCase();

  // Jika nominal harga_beli dikirim, otomatis generate kode MOD dari rumus
  if (hargaNum > 0) {
    costCode = hargaToMod(hargaNum);
  }

  if (!costCode) {
    return res.status(400).json({ error: 'Harga beli / Modal satuan wajib diisi.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, kode_barang, nama_barang, `MOD`, total_masuk, stok_akhir, deleted_at FROM barang WHERE id = ? FOR UPDATE',
      [barang_id]
    );

    if (rows.length === 0 || rows[0].deleted_at !== null) {
      await connection.rollback();
      return res.status(404).json({ error: 'Barang tidak ditemukan atau telah dinonaktifkan.' });
    }

    const item = rows[0];

    // Tentukan unit cost modal riil
    let unitCost = hargaNum;
    if (unitCost <= 0) {
      const [modLookup] = await connection.execute(
        'SELECT harga_beli FROM master_mod WHERE nama_mod = ?',
        [costCode]
      );
      unitCost = modLookup.length > 0 ? parseFloat(modLookup[0].harga_beli) : modToHarga(costCode);
    }
    const totalPembayaran = unitCost * qty;

    // Sinkronkan ke master_mod di background agar perhitungan laporan & laba rugi selalu akurat
    if (costCode && unitCost > 0) {
      await connection.execute(`
        INSERT INTO master_mod (nama_mod, harga_beli)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE harga_beli = VALUES(harga_beli)
      `, [costCode, unitCost]);
    }

    // 1. Insert into pembelian
    const [result] = await connection.execute(`
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
      costCode,
      qty,
      totalPembayaran,
      purchaseDate,
      req.user.id
    ]);

    // 2. Update barang: update MOD code, total_masuk, stok_akhir
    await connection.execute(`
      UPDATE barang
      SET 
        \`MOD\` = ?,
        total_masuk = total_masuk + ?,
        stok_akhir = stok_akhir + ?
      WHERE id = ?
    `, [costCode, qty, qty, item.id]);

    // 3. Log Activity for Bell Notification
    await logActivity({
      tipe: 'pembelian',
      judul: 'Pembelian / Pasokan Barang Baru',
      detail: `Masuk ${qty} unit [${item.kode_barang}] ${item.nama_barang}. Harga Baru Modal Satuan: ${costCode} (Harga Lama: ${item.MOD || '-'}).`
    });

    await connection.commit();

    return res.status(201).json({
      message: 'Transaksi pembelian berhasil disimpan.',
      data: {
        id: result.insertId,
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        harga_lama: item.MOD,
        harga_baru: costCode,
        jumlah_masuk: qty,
        tanggal: purchaseDate,
        stok_akhir: item.stok_akhir + qty
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('createPembelian error:', err);
    return res.status(500).json({ error: 'Gagal memproses transaksi pembelian.' });
  } finally {
    connection.release();
  }
};

// Admin: Get Riwayat Pembelian (dengan tabel Harga Lama dan Harga Baru Modal Satuan)
const getPembelianHistory = async (req, res) => {
  try {
    const year = parseInt(req.query.tahun || new Date().getFullYear(), 10);
    const month = req.query.bulan && req.query.bulan !== 'all' ? parseInt(req.query.bulan, 10) : null;

    let whereClause = 'WHERE YEAR(pb.tanggal) = ?';
    const params = [year];

    if (month) {
      whereClause += ' AND MONTH(pb.tanggal) = ?';
      params.push(month);
    }

    const [rows] = await pool.execute(`
      SELECT 
        pb.id, pb.kode_barang, pb.nama_barang, pb.harga_lama,
        pb.harga_baru_modal_satuan, pb.jumlah_masuk, pb.total_pembayaran,
        pb.tanggal, pb.created_at, u.nama as created_by_nama
      FROM pembelian pb
      LEFT JOIN users u ON pb.created_by = u.id
      ${whereClause}
      ORDER BY pb.tanggal DESC, pb.id DESC
    `, params);

    const totalQty = rows.reduce((sum, r) => sum + parseInt(r.jumlah_masuk, 10), 0);

    return res.json({
      tahun: year,
      bulan: month || 'all',
      data: rows,
      total_qty: totalQty,
      total_transaksi: rows.length
    });
  } catch (err) {
    console.error('getPembelianHistory error:', err);
    return res.status(500).json({ error: 'Gagal mengambil riwayat pembelian.' });
  }
};

module.exports = { createPembelian, getPembelianHistory };
