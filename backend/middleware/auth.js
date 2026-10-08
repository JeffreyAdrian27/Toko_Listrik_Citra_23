const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logAudit } = require('./audit');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Sesi tidak valid atau belum login.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'citra23_secret');
    
    // Check if user still exists and is_active in database
    const [rows] = await pool.execute(
      'SELECT id, nama, username, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({ error: 'Akun telah dinonaktifkan atau tidak ditemukan.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token sesi kedaluwarsa atau tidak sah.' });
  }
};

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log 403 attempt to audit log as required by PRD FR-LOG-1 & FR-JUAL-5
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      await logAudit({
        userId: req.user.id,
        role: req.user.role,
        aksi: 'Percobaan Akses Ditolak (403 Forbidden)',
        entitas: req.baseUrl + req.path,
        entitasId: null,
        detail: `User role '${req.user.role}' mencoba mengakses endpoint yang membutuhkan role [${allowedRoles.join(', ')}]`,
        ipAddress: clientIp
      });

      return res.status(403).json({
        error: 'Akses terlarang. Anda tidak memiliki izin untuk fitur ini.'
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };
