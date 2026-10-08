const pool = require('../config/db');
const { logActivity } = require('./activityController');

// Admin: Input Pembelian
const createPembelian = async (req, res) => {
  const {
    barang_id,
    harga_baru_modal_satuan = '',
    jumlah_masuk,
    tanggal
  } = req.body;

  if (!barang_id) {
    return res.status(400).json({ error: 'Barang wajib dipilih.' });
  }

  const qty = parseInt(jumlah_masuk, 10);
  const costCode = String(harga_baru_modal_satuan || '').trim().toUpperCase();
  const purchaseDate = tanggal || new Date().toISOString().split('T')[0];

  if (!qty || qty <= 0) {
    return res.status(400).json({ error: 'Jumlah masuk harus lebih besar dari 0.' });
  }
  if (!costCode) {
    return res.status(400).json({ error: 'Kode MOD (Harga Baru Modal Satuan) wajib diisi.' });
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

    // 1. Insert into pembelian
    const [result] = await connection.execute(`
      INSERT INTO pembelian (
        barang_id, kode_barang, nama_barang, harga_lama,
        harga_baru_modal_satuan, jumlah_masuk, total_pembayaran,
        tanggal, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, [
      item.id,
      item.kode_barang,
      item.nama_barang,
      item.MOD || null,
      costCode,
      qty,
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
    const month = parseInt(req.query.bulan || new Date().getMonth() + 1, 10);

    const [rows] = await pool.execute(`
      SELECT 
        pb.id, pb.kode_barang, pb.nama_barang, pb.harga_lama,
        pb.harga_baru_modal_satuan, pb.jumlah_masuk, pb.total_pembayaran,
        pb.tanggal, pb.created_at, u.nama as created_by_nama
      FROM pembelian pb
      LEFT JOIN users u ON pb.created_by = u.id
      WHERE YEAR(pb.tanggal) = ? AND MONTH(pb.tanggal) = ?
      ORDER BY pb.tanggal DESC, pb.id DESC
    `, [year, month]);

    const totalQty = rows.reduce((sum, r) => sum + parseInt(r.jumlah_masuk, 10), 0);

    return res.json({
      tahun: year,
      bulan: month,
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
