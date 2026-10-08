const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');

const login = async (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, nama, username, password_hash, role, is_active FROM users WHERE username = ?',
      [username.trim()]
    );

    if (rows.length === 0) {
      await logAudit({
        userId: null,
        role: null,
        aksi: 'Login Gagal',
        entitas: 'Auth',
        detail: `Percobaan login gagal untuk username: ${username}`,
        ipAddress: clientIp
      });
      // Generic message per PRD FR-AUTH-4
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      await logAudit({
        userId: user.id,
        role: user.role,
        aksi: 'Login Ditolak (Nonaktif)',
        entitas: 'Auth',
        detail: `Pengguna nonaktif ${username} mencoba login`,
        ipAddress: clientIp
      });
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan. Hubungi Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await logAudit({
        userId: user.id,
        role: user.role,
        aksi: 'Login Gagal',
        entitas: 'Auth',
        detail: `Password salah untuk user: ${username}`,
        ipAddress: clientIp
      });
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'citra23_secret',
      { expiresIn: '12h' }
    );

    await logAudit({
      userId: user.id,
      role: user.role,
      aksi: 'Login Berhasil',
      entitas: 'Auth',
      detail: `User ${user.nama} (${user.username}) berhasil masuk sistem`,
      ipAddress: clientIp
    });

    return res.json({
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem internal.' });
  }
};

const getMe = async (req, res) => {
  return res.json({ user: req.user });
};

const logout = async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  if (req.user) {
    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      aksi: 'Logout',
      entitas: 'Auth',
      detail: `User ${req.user.nama} logout dari sistem`,
      ipAddress: clientIp
    });
  }
  return res.json({ message: 'Logout berhasil.' });
};

module.exports = { login, getMe, logout };
