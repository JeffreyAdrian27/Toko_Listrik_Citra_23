const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');
const { sendResetPasswordEmail } = require('../services/emailService');

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

// 1. Request Reset Password via Email (Anti-Spam & Rate-Limited)
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email salah, harus menggunakan email admin.' });
  }

  const inputEmail = email.trim().toLowerCase();

  try {
    // 1. Ambil data admin
    const [admins] = await pool.execute(
      'SELECT id, nama, username, email, role FROM users WHERE role = "admin" AND is_active = 1 LIMIT 1'
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Akun administrator tidak ditemukan.' });
    }

    const admin = admins[0];
    const registeredAdminEmail = (admin.email || process.env.ADMIN_EMAIL || 'liasinata@gmail.com').trim().toLowerCase();

    // Validasi ketat: Input HARUS cocok dengan email admin terdaftar
    const allowedEmails = [
      registeredAdminEmail,
      (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
      (process.env.SMTP_USER || '').trim().toLowerCase(),
      'liasinata@gmail.com',
      'citra23listrik@gmail.com',
      'jeffreyadrian27@gmail.com',
      'jeffreyadrian2702@gmail.com'
    ].filter(Boolean);

    if (!allowedEmails.includes(inputEmail)) {
      return res.status(400).json({
        error: 'Email salah, harus menggunakan email admin.'
      });
    }

    const targetEmail = inputEmail;

    // Bersihkan token yang sudah expired atau sudah pernah dipakai sebelum proses
    await pool.execute('DELETE FROM password_resets WHERE expires_at < NOW() OR used_at IS NOT NULL');

    // 2. Proteksi Anti-Spam: Cek apakah ada request dalam 10 menit terakhir
    const [recentRequests] = await pool.execute(
      'SELECT id, created_at FROM password_resets WHERE email = ? AND created_at > NOW() - INTERVAL 10 MINUTE',
      [targetEmail]
    );

    if (recentRequests.length > 0) {
      return res.status(429).json({
        error: 'Tautan pemulihan baru saja dikirim. Harap periksa email Anda atau tunggu 10 menit sebelum meminta ulang.'
      });
    }

    // 3. Proteksi Batas Harian: Maksimal 3 kali dalam 24 jam
    const [dailyRequests] = await pool.execute(
      'SELECT COUNT(id) as count FROM password_resets WHERE email = ? AND created_at > NOW() - INTERVAL 24 HOUR',
      [targetEmail]
    );

    if (dailyRequests[0].count >= 3) {
      return res.status(429).json({
        error: 'Batas harian (maksimal 3 kali per hari) telah tercapai untuk keamanan. Silakan coba lagi besok.'
      });
    }

    // 4. Generate token kriptografi 64 karakter (kadaluarsa 15 menit)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    // Simpan ke tabel password_resets
    await pool.execute(
      'INSERT INTO password_resets (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
      [admin.id, targetEmail, token, expiresAt]
    );

    // 5. Kirim email via Google SMTP (Gmail)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await sendResetPasswordEmail({
        to: targetEmail,
        resetUrl,
        adminName: admin.nama
      });
    } catch (sendErr) {
      console.error('sendResetPasswordEmail error:', sendErr.message);
      // Hapus token yang baru dibuat agar tidak menggantung jika pengiriman gagal
      await pool.execute('DELETE FROM password_resets WHERE token = ?', [token]);
      
      return res.status(500).json({
        error: 'Gagal mengirim email pemulihan via Google SMTP. Periksa koneksi internet atau konfigurasi email.'
      });
    }

    return res.json({
      message: `Tautan reset password berhasil dikirim ke ${registeredAdminEmail}. Silakan cek kotak masuk atau folder spam email Anda.`
    });

  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem internal.' });
  }
};

// 2. Verifikasi Token Reset Password
const verifyResetToken = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token tidak valid.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tautan reset tidak ditemukan atau sudah kadaluarsa/dihapus.' });
    }

    const resetReq = rows[0];
    if (resetReq.used_at !== null) {
      // Hapus token yang sudah pernah digunakan
      await pool.execute('DELETE FROM password_resets WHERE id = ?', [resetReq.id]);
      return res.status(400).json({ error: 'Tautan pemulihan ini sudah pernah digunakan sebelumnya.' });
    }

    if (new Date(resetReq.expires_at) < new Date()) {
      // Hapus token yang sudah expired dari database
      await pool.execute('DELETE FROM password_resets WHERE id = ?', [resetReq.id]);
      return res.status(400).json({ error: 'Tautan pemulihan telah kadaluarsa (melewati batas 15 menit).' });
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error('verifyResetToken error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem.' });
  }
};

// 3. Simpan Password Baru Menggunakan Token
const resetPassword = async (req, res) => {
  const { token, new_password } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token pemulihan wajib disertakan.' });
  }

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal harus 6 karakter.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tautan reset tidak ditemukan atau sudah kadaluarsa/dihapus.' });
    }

    const resetReq = rows[0];
    if (resetReq.used_at !== null) {
      // Hapus token yang sudah digunakan
      await pool.execute('DELETE FROM password_resets WHERE id = ?', [resetReq.id]);
      return res.status(400).json({ error: 'Tautan pemulihan ini sudah pernah digunakan.' });
    }

    if (new Date(resetReq.expires_at) < new Date()) {
      // Hapus token yang sudah expired dari database
      await pool.execute('DELETE FROM password_resets WHERE id = ?', [resetReq.id]);
      return res.status(400).json({ error: 'Tautan pemulihan telah kadaluarsa.' });
    }

    // Hash password baru dengan bcrypt (10 rounds)
    const newHash = await bcrypt.hash(new_password, 10);

    // Update password di tabel users
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, resetReq.user_id]);

    // Hapus data token reset dari database setelah sukses digunakan
    await pool.execute('DELETE FROM password_resets WHERE id = ?', [resetReq.id]);

    // Catat ke activity log
    await pool.execute(`
      INSERT INTO activity_log (tipe, judul, detail, is_read)
      VALUES ('barang', 'Password Admin Direset', 'Password akun Administrator berhasil diperbarui via tautan pemulihan email.', 0)
    `);

    return res.json({
      message: 'Password berhasil diperbarui! Silakan masuk dengan password baru Anda.'
    });

  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui password.' });
  }
};

module.exports = {
  login,
  getMe,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword
};
