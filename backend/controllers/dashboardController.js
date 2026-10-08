const pool = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 1. Total Barang & Stok Menipis
    const [barangStats] = await pool.execute(`
      SELECT 
        COUNT(id) as total_barang,
        SUM(CASE WHEN stok_akhir <= 5 THEN 1 ELSE 0 END) as stok_menipis,
        SUM(stok_akhir) as total_unit_stok
      FROM barang
      WHERE deleted_at IS NULL
    `);

    // 2. Transaksi & Omzet Hari Ini
    const [todaySales] = await pool.execute(`
      SELECT 
        COUNT(id) as transaksi_hari_ini,
        COALESCE(SUM(omzet_penjualan), 0) as omzet_hari_ini
      FROM penjualan
      WHERE tanggal = ? AND status = 'aktif'
    `, [today]);

    // 3. Omzet Bulan Ini
    const [monthSales] = await pool.execute(`
      SELECT 
        COUNT(id) as transaksi_bulan_ini,
        COALESCE(SUM(omzet_penjualan), 0) as omzet_bulan_ini,
        COALESCE(SUM(jumlah), 0) as unit_terjual_bulan_ini
      FROM penjualan
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ? AND status = 'aktif'
    `, [currentYear, currentMonth]);

    // 4. Pembelian Bulan Ini
    const [monthPurchases] = await pool.execute(`
      SELECT 
        COUNT(id) as pasokan_bulan_ini,
        COALESCE(SUM(jumlah_masuk), 0) as unit_masuk_bulan_ini
      FROM pembelian
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?
    `, [currentYear, currentMonth]);

    // 5. Barang Terlaris (Top 5)
    const [topItems] = await pool.execute(`
      SELECT 
        kode_barang, nama_barang,
        SUM(jumlah) as total_terjual,
        SUM(omzet_penjualan) as total_omzet
      FROM penjualan
      WHERE status = 'aktif'
      GROUP BY barang_id, kode_barang, nama_barang
      ORDER BY total_terjual DESC
      LIMIT 5
    `);

    // 6. 6 Transaksi Terakhir
    const [recentSales] = await pool.execute(`
      SELECT 
        p.id, p.kode_barang, p.nama_barang, p.jumlah, p.omzet_penjualan,
        p.tanggal, p.status, u.nama as kasir_nama
      FROM penjualan p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.id DESC
      LIMIT 6
    `);

    return res.json({
      summary: {
        total_barang: barangStats[0].total_barang || 0,
        stok_menipis: barangStats[0].stok_menipis || 0,
        total_unit_stok: barangStats[0].total_unit_stok || 0,
        transaksi_hari_ini: todaySales[0].transaksi_hari_ini || 0,
        omzet_hari_ini: parseFloat(todaySales[0].omzet_hari_ini || 0),
        omzet_bulan_ini: parseFloat(monthSales[0].omzet_bulan_ini || 0),
        unit_terjual_bulan_ini: parseInt(monthSales[0].unit_terjual_bulan_ini || 0, 10),
        pasokan_bulan_ini: parseInt(monthPurchases[0].pasokan_bulan_ini || 0, 10),
        unit_masuk_bulan_ini: parseInt(monthPurchases[0].unit_masuk_bulan_ini || 0, 10)
      },
      top_items: topItems,
      recent_sales: recentSales
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ error: 'Gagal memuat ringkasan dashboard.' });
  }
};

module.exports = { getDashboardStats };
