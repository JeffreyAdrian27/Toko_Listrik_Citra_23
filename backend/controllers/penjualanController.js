const pool = require('../config/db');
const { logActivity } = require('./activityController');
const { modToHarga } = require('../utils/modHelper');

// Input Penjualan Baru (Admin & Pegawai)
const createPenjualan = async (req, res) => {
  const { barang_id, jumlah, tanggal } = req.body;

  const qty = parseInt(jumlah, 10);
  if (!barang_id) {
    return res.status(400).json({ error: 'Barang wajib dipilih.' });
  }
  if (!qty || qty <= 0) {
    return res.status(400).json({ error: 'Jumlah harus lebih besar dari 0.' });
  }

  let saleDate;
  const todayStr = new Date().toISOString().split('T')[0];
  if (req.user.role === 'pegawai') {
    saleDate = todayStr;
  } else {
    saleDate = tanggal || todayStr;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, kode_barang, nama_barang, `MOD`, harga_jual, modal_harga_beli, stok_akhir, deleted_at FROM barang WHERE id = ? FOR UPDATE',
      [barang_id]
    );

    if (rows.length === 0 || rows[0].deleted_at !== null) {
      await connection.rollback();
      return res.status(404).json({ error: 'Barang tidak ditemukan atau sudah dinonaktifkan.' });
    }

    const item = rows[0];

    if (item.stok_akhir < qty) {
      await connection.rollback();
      return res.status(400).json({
        error: `Stok tidak mencukupi! Sisa stok untuk [${item.nama_barang}] adalah ${item.stok_akhir} unit.`
      });
    }

    const hargaJual = parseFloat(item.harga_jual);
    const modCode = item.MOD || '';
    const modalSatuan = item.modal_harga_beli && parseFloat(item.modal_harga_beli) > 0
      ? parseFloat(item.modal_harga_beli)
      : modToHarga(modCode);
    const omzet = hargaJual * qty;

    // 1. Insert into penjualan (Snapshot MOD code dan modal_satuan)
    const [insertResult] = await connection.execute(`
      INSERT INTO penjualan (
        barang_id, kode_barang, nama_barang, harga_jual, harga_modal, modal_satuan,
        jumlah, omzet_penjualan, tanggal, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')
    `, [
      item.id,
      item.kode_barang,
      item.nama_barang,
      hargaJual,
      modCode,
      modalSatuan,
      qty,
      omzet,
      saleDate,
      req.user.id
    ]);

    // 2. Update stock in barang
    await connection.execute(`
      UPDATE barang
      SET 
        total_keluar = total_keluar + ?,
        stok_akhir = stok_akhir - ?
      WHERE id = ?
    `, [qty, qty, item.id]);

    // 3. Log Activity for Bell Notification
    await logActivity({
      tipe: 'penjualan',
      judul: 'Penjualan Baru Berhasil',
      detail: `Terjual ${qty}x [${item.kode_barang}] ${item.nama_barang} (Total: Rp ${omzet.toLocaleString('id-ID')}) oleh ${req.user.nama}.`
    });

    await connection.commit();

    return res.status(201).json({
      message: 'Penjualan berhasil disimpan.',
      data: {
        id: insertResult.insertId,
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        harga_jual: hargaJual,
        jumlah: qty,
        omzet_penjualan: omzet,
        tanggal: saleDate,
        sisa_stok: item.stok_akhir - qty
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('createPenjualan error:', err);
    return res.status(500).json({ error: 'Gagal memproses transaksi penjualan.' });
  } finally {
    connection.release();
  }
};

// Lihat Penjualan Hari Ini (Read-only, Admin & Pegawai)
const getPenjualanHariIni = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const isAdmin = req.user.role === 'admin';

    const selectFields = isAdmin
      ? `p.id, p.kode_barang, p.nama_barang, p.harga_jual, p.harga_modal, p.jumlah,
         p.omzet_penjualan, p.tanggal, p.status, p.created_at, p.void_reason,
         u.nama as kasir_nama`
      : `p.id, p.kode_barang, p.nama_barang, p.harga_jual, p.jumlah,
         p.omzet_penjualan, p.tanggal, p.status, p.created_at, p.void_reason,
         u.nama as kasir_nama`;

    const [rows] = await pool.execute(`
      SELECT ${selectFields}
      FROM penjualan p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.tanggal = ?
      ORDER BY p.id DESC
    `, [today]);

    const totalOmzetHariIni = rows
      .filter(r => r.status === 'aktif')
      .reduce((sum, r) => sum + parseFloat(r.omzet_penjualan), 0);

    return res.json({
      tanggal: today,
      data: rows,
      total_omzet: totalOmzetHariIni,
      total_transaksi: rows.filter(r => r.status === 'aktif').length
    });
  } catch (err) {
    console.error('getPenjualanHariIni error:', err);
    return res.status(500).json({ error: 'Gagal memuat penjualan hari ini.' });
  }
};

// History Penjualan per Bulan & Tahun (Admin Only)
const getPenjualanHistory = async (req, res) => {
  try {
    const year = parseInt(req.query.tahun || new Date().getFullYear(), 10);
    const month = parseInt(req.query.bulan || new Date().getMonth() + 1, 10);

    const [rows] = await pool.execute(`
      SELECT 
        p.id, p.kode_barang, p.nama_barang, p.harga_jual, p.harga_modal,
        p.jumlah, p.omzet_penjualan, p.tanggal, p.status, p.created_at,
        p.void_reason, p.voided_at,
        u.nama as kasir_nama, uv.nama as void_by_nama
      FROM penjualan p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN users uv ON p.voided_by = uv.id
      WHERE YEAR(p.tanggal) = ? AND MONTH(p.tanggal) = ?
      ORDER BY p.tanggal DESC, p.id DESC
    `, [year, month]);

    const activeRows = rows.filter(r => r.status === 'aktif');
    const totalOmzet = activeRows.reduce((acc, r) => acc + parseFloat(r.omzet_penjualan), 0);
    const totalQty = activeRows.reduce((acc, r) => acc + parseInt(r.jumlah, 10), 0);

    return res.json({
      tahun: year,
      bulan: month,
      data: rows,
      total_omzet: totalOmzet,
      total_qty: totalQty,
      total_transaksi_aktif: activeRows.length,
      total_transaksi_batal: rows.filter(r => r.status === 'batal').length
    });
  } catch (err) {
    console.error('getPenjualanHistory error:', err);
    return res.status(500).json({ error: 'Gagal mengambil history penjualan.' });
  }
};

// Grafik Penjualan Harian & 12 Bulan (Admin Only)
const getPenjualanStats = async (req, res) => {
  try {
    const year = parseInt(req.query.tahun || new Date().getFullYear(), 10);
    const month = parseInt(req.query.bulan || new Date().getMonth() + 1, 10);

    const [dailyRows] = await pool.execute(`
      SELECT 
        DAY(tanggal) as hari,
        tanggal,
        SUM(omzet_penjualan) as omzet,
        SUM(jumlah) as qty
      FROM penjualan
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ? AND status = 'aktif'
      GROUP BY DAY(tanggal), tanggal
      ORDER BY hari ASC
    `, [year, month]);

    const [monthlyRows] = await pool.execute(`
      SELECT 
        MONTH(tanggal) as bulan,
        SUM(omzet_penjualan) as omzet,
        SUM(jumlah) as qty
      FROM penjualan
      WHERE YEAR(tanggal) = ? AND status = 'aktif'
      GROUP BY MONTH(tanggal)
      ORDER BY bulan ASC
    `, [year]);

    return res.json({
      tahun: year,
      bulan: month,
      harian: dailyRows,
      bulanan: monthlyRows
    });
  } catch (err) {
    console.error('getPenjualanStats error:', err);
    return res.status(500).json({ error: 'Gagal memuat statistik penjualan.' });
  }
};

// Pembatalan (Void) Penjualan (Admin Only)
const voidPenjualan = async (req, res) => {
  const { id } = req.params;
  const { void_reason } = req.body;

  if (!void_reason || !void_reason.trim()) {
    return res.status(400).json({ error: 'Alasan pembatalan (void) wajib diisi.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, barang_id, kode_barang, nama_barang, jumlah, status FROM penjualan WHERE id = ? FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Transaksi penjualan tidak ditemukan.' });
    }

    const sale = rows[0];

    if (sale.status === 'batal') {
      await connection.rollback();
      return res.status(400).json({ error: 'Transaksi ini sudah pernah dibatalkan (void).' });
    }

    // 1. Mark status as batal
    await connection.execute(`
      UPDATE penjualan
      SET 
        status = 'batal',
        voided_by = ?,
        voided_at = NOW(),
        void_reason = ?
      WHERE id = ?
    `, [req.user.id, void_reason.trim(), id]);

    // 2. Restore stock to barang
    await connection.execute(`
      UPDATE barang
      SET 
        total_keluar = total_keluar - ?,
        stok_akhir = stok_akhir + ?
      WHERE id = ?
    `, [sale.jumlah, sale.jumlah, sale.barang_id]);

    await connection.commit();

    return res.json({
      message: 'Transaksi berhasil dibatalkan (void) dan stok telah dikembalikan ke inventaris.',
      void_id: id
    });
  } catch (err) {
    await connection.rollback();
    console.error('voidPenjualan error:', err);
    return res.status(500).json({ error: 'Gagal membatalkan transaksi penjualan.' });
  } finally {
    connection.release();
  }
};

module.exports = {
  createPenjualan,
  getPenjualanHariIni,
  getPenjualanHistory,
  getPenjualanStats,
  voidPenjualan
};
