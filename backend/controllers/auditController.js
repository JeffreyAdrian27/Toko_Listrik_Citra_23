const pool = require('../config/db');

const getAuditLogs = async (req, res) => {
  try {
    const { tanggal, user_id, aksi, limit = 100 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (tanggal) {
      whereClause += ' AND DATE(a.waktu) = ?';
      params.push(tanggal);
    }

    if (user_id) {
      whereClause += ' AND a.user_id = ?';
      params.push(user_id);
    }

    if (aksi) {
      whereClause += ' AND a.aksi LIKE ?';
      params.push(`%${aksi}%`);
    }

    const query = `
      SELECT 
        a.id, a.waktu, a.user_id, a.role, a.aksi, a.entitas,
        a.entitas_id, a.detail, a.ip_address,
        u.nama as user_nama, u.username
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.id DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(query, [...params, parseInt(limit, 10)]);

    return res.json({ data: rows });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data audit log.' });
  }
};

module.exports = { getAuditLogs };
