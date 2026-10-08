const pool = require('../config/db');

const getLaporanLabaRugi = async (req, res) => {
  try {
    const { tahun, bulan, dari_tanggal, sampai_tanggal } = req.query;

    let dateConditionPenjualan = '';
    let dateConditionPembelian = '';
    const paramsPenjualan = [];
    const paramsPembelian = [];

    if (dari_tanggal && sampai_tanggal) {
      dateConditionPenjualan = 'AND p.tanggal BETWEEN ? AND ?';
      dateConditionPembelian = 'WHERE pb.tanggal BETWEEN ? AND ?';
      paramsPenjualan.push(dari_tanggal, sampai_tanggal);
      paramsPembelian.push(dari_tanggal, sampai_tanggal);
    } else {
      const yr = parseInt(tahun || new Date().getFullYear(), 10);
      const mo = bulan ? parseInt(bulan, 10) : null;

      if (mo) {
        dateConditionPenjualan = 'AND YEAR(p.tanggal) = ? AND MONTH(p.tanggal) = ?';
        dateConditionPembelian = 'WHERE YEAR(pb.tanggal) = ? AND MONTH(pb.tanggal) = ?';
        paramsPenjualan.push(yr, mo);
        paramsPembelian.push(yr, mo);
      } else {
        dateConditionPenjualan = 'AND YEAR(p.tanggal) = ?';
        dateConditionPembelian = 'WHERE YEAR(pb.tanggal) = ?';
        paramsPenjualan.push(yr);
        paramsPembelian.push(yr);
      }
    }

    // 1. Rincian per barang dari penjualan aktif
    const queryPerBarang = `
      SELECT 
        p.barang_id,
        p.kode_barang,
        p.nama_barang,
        p.harga_modal as MOD_kode,
        SUM(p.jumlah) as total_terjual,
        SUM(p.omzet_penjualan) as total_omzet
      FROM penjualan p
      WHERE p.status = 'aktif' ${dateConditionPenjualan}
      GROUP BY p.barang_id, p.kode_barang, p.nama_barang, p.harga_modal
      ORDER BY total_omzet DESC
    `;
    const [itemRows] = await pool.execute(queryPerBarang, paramsPenjualan);

    // 2. Data Pembelian
    const queryPembelian = `
      SELECT 
        COALESCE(SUM(pb.jumlah_masuk), 0) as total_item_masuk,
        COUNT(pb.id) as count_transaksi_beli
      FROM pembelian pb
      ${dateConditionPembelian}
    `;
    const [pembelianResult] = await pool.execute(queryPembelian, paramsPembelian);

    // 3. Ringkasan
    const totalOmzet = itemRows.reduce((sum, r) => sum + parseFloat(r.total_omzet), 0);
    const totalQtyTerjual = itemRows.reduce((sum, r) => sum + parseInt(r.total_terjual, 10), 0);
    const totalItemMasuk = parseInt(pembelianResult[0].total_item_masuk || 0, 10);

    return res.json({
      filter: {
        tahun: tahun || null,
        bulan: bulan || null,
        dari_tanggal: dari_tanggal || null,
        sampai_tanggal: sampai_tanggal || null
      },
      ringkasan: {
        total_omzet: totalOmzet,
        total_qty_terjual: totalQtyTerjual,
        total_pembelian_unit: totalItemMasuk,
        total_transaksi_beli: pembelianResult[0].count_transaksi_beli || 0
      },
      rincian_barang: itemRows
    });
  } catch (err) {
    console.error('getLaporanLabaRugi error:', err);
    return res.status(500).json({ error: 'Gagal menghasilkan laporan keuangan.' });
  }
};

module.exports = { getLaporanLabaRugi };
