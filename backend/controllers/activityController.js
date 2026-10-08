const pool = require('../config/db');

// Helper to log activities
async function logActivity({ tipe, judul, detail }) {
  try {
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
    const limit = parseInt(req.query.limit || '20', 10);
    const [rows] = await pool.execute(`
      SELECT id, tipe, judul, detail, created_at, is_read
      FROM activity_log
      ORDER BY id DESC
      LIMIT ?
    `, [limit]);

    const [unreadCount] = await pool.execute(`
      SELECT COUNT(id) as unread FROM activity_log WHERE is_read = 0
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

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    await pool.execute('UPDATE activity_log SET is_read = 1 WHERE is_read = 0');
    return res.json({ message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui status notifikasi.' });
  }
};

module.exports = { logActivity, getActivityLogs, markAllAsRead };
