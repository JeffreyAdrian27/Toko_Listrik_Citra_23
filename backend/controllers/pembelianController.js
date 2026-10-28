const pool = require('../config/db');
const { logActivity } = require('./activityController');

// Admin: Input Pembelian
const createPembelian = async (req, res) => {
  const {
    barang_id,
    harga_beli = 0,
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, kode_barang, nama_barang, modal_harga_beli, total_masuk, stok_akhir, deleted_at FROM barang WHERE id = ? FOR UPDATE',
      [barang_id]
    );

    if (rows.length === 0 || rows[0].deleted_at !== null) {
      await connection.rollback();
      return res.status(404).json({ error: 'Barang tidak ditemukan atau telah dinonaktifkan.' });
    }

    const item = rows[0];

    // Tentukan harga beli modal satuan riil
    const existingModal = parseFloat(item.modal_harga_beli || 0);
    const unitCost = hargaNum > 0 ? hargaNum : existingModal;
    const totalPembayaran = unitCost * qty;
    const hargaLamaText = existingModal > 0 ? String(existingModal) : '-';
    let hargaBaruText = '-';
    if (existingModal <= 0 && unitCost > 0) {
      hargaBaruText = String(unitCost);
    } else if (unitCost > 0 && Math.abs(unitCost - existingModal) > 0.01) {
      hargaBaruText = String(unitCost);
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
      hargaLamaText,
      hargaBaruText,
      qty,
      totalPembayaran,
      purchaseDate,
      req.user.id
    ]);

    // 2. Update barang: kosongkan MOD, simpan modal_harga_beli, perbarui total_masuk & stok_akhir
    await connection.execute(`
      UPDATE barang
      SET 
        modal_harga_beli = ?,
        total_masuk = total_masuk + ?,
        stok_akhir = stok_akhir + ?
      WHERE id = ?
    `, [unitCost, qty, qty, item.id]);

    // 3. Log Activity for Bell Notification
    await logActivity({
      tipe: 'pembelian',
      judul: 'Pembelian / Pasokan Barang Baru',
      detail: `Masuk ${qty} unit [${item.kode_barang}] ${item.nama_barang}. Harga Beli Satuan: Rp ${unitCost.toLocaleString('id-ID')}.`
    });

    await connection.commit();

    return res.status(201).json({
      message: 'Transaksi pembelian berhasil disimpan.',
      data: {
        id: result.insertId,
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        harga_lama: hargaLamaText,
        harga_baru: hargaBaruText,
        harga_beli: unitCost,
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

// Admin: Edit / Koreksi Transaksi Pembelian & Sesuaikan Stok
const updatePembelian = async (req, res) => {
  const { id } = req.params;
  const { jumlah_masuk, harga_beli, tanggal } = req.body;

  const newQty = parseInt(jumlah_masuk, 10);
  if (isNaN(newQty) || newQty <= 0) {
    return res.status(400).json({ error: 'Jumlah masuk harus lebih besar dari 0.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, barang_id, kode_barang, nama_barang, jumlah_masuk, total_pembayaran, tanggal, harga_baru_modal_satuan FROM pembelian WHERE id = ? FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Data pembelian tidak ditemukan.' });
    }

    const pb = rows[0];
    const oldQty = parseInt(pb.jumlah_masuk, 10) || 0;
    const diffQty = newQty - oldQty;

    let barangInfo = null;
    if (pb.barang_id) {
      const [bRows] = await connection.execute(
        'SELECT id, kode_barang, nama_barang, modal_harga_beli, stok_akhir, total_masuk FROM barang WHERE id = ? FOR UPDATE',
        [pb.barang_id]
      );
      if (bRows.length > 0) barangInfo = bRows[0];
    }

    if (barangInfo && diffQty < 0) {
      const currentStock = parseInt(barangInfo.stok_akhir, 10) || 0;
      if (currentStock + diffQty < 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `Pengurangan jumlah melebihi stok yang ada saat ini (${currentStock} unit) karena barang sebagian sudah terjual.`
        });
      }
    }

    // Tentukan modal riil
    let unitCost = parseFloat(barangInfo?.modal_harga_beli || 0);

    if (harga_beli !== undefined && harga_beli !== null && !isNaN(harga_beli) && Number(harga_beli) > 0) {
      unitCost = parseFloat(harga_beli);
    } else if (pb.harga_baru_modal_satuan && pb.harga_baru_modal_satuan !== '-') {
      const parsed = parseFloat(pb.harga_baru_modal_satuan);
      if (!isNaN(parsed) && parsed > 0) {
        unitCost = parsed;
      }
    }

    const totalPembayaran = unitCost * newQty;
    const finalDate = tanggal || pb.tanggal;
    const costText = unitCost > 0 ? String(unitCost) : '-';

    const existingDateStr = pb.tanggal ? new Date(pb.tanggal).toISOString().split('T')[0] : '';
    const newDateStr = tanggal ? String(tanggal).split('T')[0] : existingDateStr;
    const isSameQty = parseInt(oldQty, 10) === parseInt(newQty, 10);
    const isSameDate = existingDateStr === newDateStr;
    const isSameCost = parseFloat(pb.total_pembayaran || 0) === parseFloat(totalPembayaran || 0);

    if (isSameQty && isSameDate && isSameCost) {
      await connection.rollback();
      return res.json({
        message: 'Tidak ada perubahan pada data transaksi pembelian.',
        data: {
          id: pb.id,
          jumlah_masuk: pb.jumlah_masuk,
          total_pembayaran: pb.total_pembayaran
        }
      });
    }

    await connection.execute(`
      UPDATE pembelian
      SET jumlah_masuk = ?, total_pembayaran = ?, tanggal = ?, harga_baru_modal_satuan = ?
      WHERE id = ?
    `, [newQty, totalPembayaran, finalDate, costText, id]);

    if (barangInfo) {
      const newStock = (parseInt(barangInfo.stok_akhir, 10) || 0) + diffQty;
      const newTotalMasuk = Math.max(0, (parseInt(barangInfo.total_masuk, 10) || 0) + diffQty);

      await connection.execute(`
        UPDATE barang
        SET stok_akhir = ?, total_masuk = ?, modal_harga_beli = ?
        WHERE id = ?
      `, [newStock, newTotalMasuk, unitCost, barangInfo.id]);
    }

    await connection.commit();

    await logActivity({
      tipe: 'pembelian',
      judul: 'Pembelian Dikoreksi',
      detail: `Transaksi pembelian [${pb.kode_barang}] ${pb.nama_barang} diubah dari ${oldQty} unit menjadi ${newQty} unit. Stok disesuaikan.`
    });

    return res.json({
      message: 'Transaksi pembelian berhasil diperbarui dan stok telah disesuaikan.',
      data: {
        id: pb.id,
        jumlah_masuk: newQty,
        total_pembayaran: totalPembayaran
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('updatePembelian error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui transaksi pembelian.' });
  } finally {
    connection.release();
  }
};

// Admin: Batalkan / Hapus Transaksi Pembelian & Rollback Stok Barang
const deletePembelian = async (req, res) => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, barang_id, kode_barang, nama_barang, jumlah_masuk, total_pembayaran, tanggal, harga_baru_modal_satuan FROM pembelian WHERE id = ? FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Data pembelian tidak ditemukan.' });
    }

    const pb = rows[0];
    const qtyMasuk = parseInt(pb.jumlah_masuk, 10) || 0;

    // Periksa barang terkait
    let barangInfo = null;
    if (pb.barang_id) {
      const [barangRows] = await connection.execute(
        'SELECT id, kode_barang, nama_barang, modal_harga_beli, stok_akhir, total_masuk FROM barang WHERE id = ? FOR UPDATE',
        [pb.barang_id]
      );
      if (barangRows.length > 0) {
        barangInfo = barangRows[0];
      }
    }

    // Jika barang ditemukan, kurangi stoknya
    if (barangInfo) {
      const currentStock = parseInt(barangInfo.stok_akhir, 10) || 0;
      if (currentStock < qtyMasuk) {
        await connection.rollback();
        return res.status(400).json({
          error: `Tidak dapat membatalkan transaksi ini karena sisa stok saat ini (${currentStock} unit) lebih sedikit dari jumlah yang dibatalkan (${qtyMasuk} unit) akibat sebagian barang sudah terjual.`
        });
      }

      const newStock = currentStock - qtyMasuk;
      const newTotalMasuk = Math.max(0, (parseInt(barangInfo.total_masuk, 10) || 0) - qtyMasuk);

      await connection.execute(`
        UPDATE barang 
        SET stok_akhir = ?, total_masuk = ?
        WHERE id = ?
      `, [newStock, newTotalMasuk, barangInfo.id]);
    }

    // Hapus dari tabel pembelian
    await connection.execute('DELETE FROM pembelian WHERE id = ?', [id]);

    await connection.commit();

    await logActivity({
      tipe: 'pembelian',
      judul: 'Pembelian Dibatalkan',
      detail: `Transaksi pembelian [${pb.kode_barang}] ${pb.nama_barang} sebanyak ${qtyMasuk} unit dibatalkan. Stok otomatis dikurangi kembali.`
    });

    return res.json({
      message: `Transaksi pembelian berhasil dibatalkan. Stok barang otomatis dikurangi ${qtyMasuk} unit.`,
      data: {
        id: pb.id,
        kode_barang: pb.kode_barang,
        nama_barang: pb.nama_barang,
        qty_dikurangi: qtyMasuk
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('deletePembelian error:', err);
    return res.status(500).json({ error: 'Gagal membatalkan transaksi pembelian.' });
  } finally {
    connection.release();
  }
};

module.exports = { createPembelian, getPembelianHistory, updatePembelian, deletePembelian };
