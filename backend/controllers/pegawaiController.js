const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');

// Admin: Get all pegawai
const getAllPegawai = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, nama, username, role, is_active, created_at
      FROM users
      WHERE role = 'pegawai'
      ORDER BY id ASC
    `);
    return res.json({ data: rows });
  } catch (err) {
    console.error('getAllPegawai error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data pegawai.' });
  }
};

// Admin: Create Pegawai
const createPegawai = async (req, res) => {
  const { nama, username, password } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  if (!nama || !username || !password) {
    return res.status(400).json({ error: 'Nama, username, dan password wajib diisi.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(`
      INSERT INTO users (nama, username, password_hash, role, is_active)
      VALUES (?, ?, ?, 'pegawai', 1)
    `, [nama.trim(), username.trim().toLowerCase(), hash]);

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      aksi: 'Tambah Akun Pegawai',
      entitas: 'Users',
      entitasId: result.insertId,
      detail: `Membuat akun pegawai baru: ${nama.trim()} (@${username.trim().toLowerCase()})`,
      ipAddress: clientIp
    });

    return res.status(201).json({
      message: 'Akun pegawai berhasil dibuat.',
      data: {
        id: result.insertId,
        nama: nama.trim(),
        username: username.trim().toLowerCase()
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username tersebut sudah digunakan.' });
    }
    console.error('createPegawai error:', err);
    return res.status(500).json({ error: 'Gagal membuat akun pegawai.' });
  }
};

// Admin: Update Pegawai (Edit nama, toggle status aktif)
const updatePegawai = async (req, res) => {
  const { id } = req.params;
  const { nama, is_active } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama pegawai wajib diisi.' });
  }

  try {
    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ? AND role = "pegawai"', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Akun pegawai tidak ditemukan.' });
    }

    const activeStatus = is_active !== undefined ? (is_active ? 1 : 0) : existing[0].is_active;

    await pool.execute(`
      UPDATE users SET nama = ?, is_active = ? WHERE id = ?
    `, [nama.trim(), activeStatus, id]);

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      aksi: 'Ubah Akun Pegawai',
      entitas: 'Users',
      entitasId: id,
      detail: `Update pegawai: ${nama.trim()}, status aktif: ${activeStatus === 1 ? 'Aktif' : 'Nonaktif'}`,
      ipAddress: clientIp
    });

    return res.json({ message: 'Data pegawai berhasil diperbarui.' });
  } catch (err) {
    console.error('updatePegawai error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui akun pegawai.' });
  }
};

// Admin: Reset Password Pegawai
const resetPasswordPegawai = async (req, res) => {
  const { id } = req.params;
  const { password_baru } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  if (!password_baru || password_baru.length < 5) {
    return res.status(400).json({ error: 'Password baru minimal 5 karakter.' });
  }

  try {
    const [existing] = await pool.execute('SELECT nama, username FROM users WHERE id = ? AND role = "pegawai"', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Akun pegawai tidak ditemukan.' });
    }

    const hash = await bcrypt.hash(password_baru, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      aksi: 'Reset Password Pegawai',
      entitas: 'Users',
      entitasId: id,
      detail: `Reset password untuk pegawai: ${existing[0].nama} (@${existing[0].username})`,
      ipAddress: clientIp
    });

    return res.json({ message: 'Password pegawai berhasil direset.' });
  } catch (err) {
    console.error('resetPasswordPegawai error:', err);
    return res.status(500).json({ error: 'Gagal mereset password pegawai.' });
  }
};

module.exports = { getAllPegawai, createPegawai, updatePegawai, resetPasswordPegawai };
