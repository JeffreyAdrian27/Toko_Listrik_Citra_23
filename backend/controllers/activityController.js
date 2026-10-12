const pool = require('../config/db');

// Helper to log activities
async function logActivity({ tipe, judul, detail }) {
  try {
    // 1. Bersihkan otomatis hanya log yang usianya sudah melebihi 30 hari dari database
    await pool.execute(`
      DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL 30 DAY
    `);

    await pool.execute(`
      INSERT INTO activity_log (tipe, judul, detail, created_at, is_read)
      VALUES (?, ?, ?, NOW(), 0)
    `, [tipe, judul, detail]);
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

// Get recent activity logs for bell icon dropdown
const getActivityLogs = async (req, res) => {
  try {
    // 1. Hapus yang sudah melebihi 30 hari dari database
    await pool.execute(`
      DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL 30 DAY
    `);

    const limit = parseInt(req.query.limit || '30', 10);
    // 2. Ambil semua log yang usianya belum melebihi 30 hari (baik yang belum dibaca maupun sudah dibaca)
    const [rows] = await pool.execute(`
      SELECT id, tipe, judul, detail, created_at, is_read
      FROM activity_log
      WHERE created_at >= NOW() - INTERVAL 30 DAY
      ORDER BY id DESC
      LIMIT ?
    `, [limit]);

    // 3. Hitung jumlah yang belum dibaca untuk badge lonceng
    const [unreadCount] = await pool.execute(`
      SELECT COUNT(id) as unread 
      FROM activity_log 
      WHERE is_read = 0 AND created_at >= NOW() - INTERVAL 30 DAY
    `);

    return res.json({
      data: rows,
      unread: unreadCount[0].unread || 0
    });
  } catch (err) {
    console.error('getActivityLogs error:', err);
    return res.status(500).json({ error: 'Gagal mengambil notifikasi aktivitas.' });
  }
};

// Tandai Dibaca: Update is_read = 1 tanpa menghapus log yang usianya masih dalam 30 hari
const markAllAsRead = async (req, res) => {
  try {
    // Hapus log yang usianya sudah melebihi 30 hari
    await pool.execute(`
      DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL 30 DAY
    `);

    // Tandai semua log aktif menjadi sudah dibaca
    await pool.execute('UPDATE activity_log SET is_read = 1 WHERE is_read = 0');

    return res.json({ message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui status notifikasi.' });
  }
};

// Hapus satu notifikasi log aktivitas spesifik jika user ingin menghapus
const deleteActivityLog = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM activity_log WHERE id = ?', [id]);
    return res.json({ message: 'Log aktivitas berhasil dihapus.' });
  } catch (err) {
    console.error('deleteActivityLog error:', err);
    return res.status(500).json({ error: 'Gagal menghapus log aktivitas.' });
  }
};

module.exports = { logActivity, getActivityLogs, markAllAsRead, deleteActivityLog };
