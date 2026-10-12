const pool = require('../config/db');
const { hargaToMod } = require('../utils/modHelper');

// 1. Get all MODs (Full data with harga_beli for Admin)
const getAllMod = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        m.id,
        m.nama_mod,
        m.harga_beli,
        m.keterangan,
        m.created_at,
        m.updated_at,
        COUNT(b.id) as total_barang_pakai
      FROM master_mod m
      LEFT JOIN barang b ON b.\`MOD\` = m.nama_mod AND b.deleted_at IS NULL
      GROUP BY m.id, m.nama_mod, m.harga_beli, m.keterangan, m.created_at, m.updated_at
      ORDER BY m.harga_beli ASC, m.nama_mod ASC
    `);

    return res.json(rows);
  } catch (err) {
    console.error('getAllMod error:', err);
    return res.status(500).json({ error: 'Gagal memuat daftar master MOD.' });
  }
};

// 2. Create new MOD
const createMod = async (req, res) => {
  try {
    let { nama_mod, harga_beli, keterangan } = req.body;

    const hargaNum = parseFloat(harga_beli);
    if (isNaN(hargaNum) || hargaNum < 0) {
      return res.status(400).json({ error: 'Harga beli harus berupa angka nominal yang valid.' });
    }

    // Jika nama_mod kosong, hitung otomatis dari harga beli sesuai rumus Citra 23
    if (!nama_mod && hargaNum > 0) {
      nama_mod = hargaToMod(hargaNum);
    }

    if (!nama_mod || typeof nama_mod !== 'string') {
      return res.status(400).json({ error: 'Nama / Kode MOD wajib diisi.' });
    }

    nama_mod = nama_mod.trim().toUpperCase();
    if (!nama_mod) {
      return res.status(400).json({ error: 'Nama / Kode MOD tidak boleh kosong.' });
    }

    // Check duplicate
    const [existing] = await pool.execute(
      'SELECT id FROM master_mod WHERE nama_mod = ?',
      [nama_mod]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: `Kode MOD "${nama_mod}" sudah terdaftar sebelumnya.` });
    }

    const [result] = await pool.execute(
      'INSERT INTO master_mod (nama_mod, harga_beli, keterangan) VALUES (?, ?, ?)',
      [nama_mod, hargaNum, (keterangan || '').trim()]
    );

    return res.status(201).json({
      message: `Master MOD "${nama_mod}" berhasil ditambahkan.`,
      mod: {
        id: result.insertId,
        nama_mod,
        harga_beli: hargaNum,
        keterangan: (keterangan || '').trim()
      }
    });
  } catch (err) {
    console.error('createMod error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan master MOD baru.' });
  }
};

// 3. Update MOD
const updateMod = async (req, res) => {
  try {
    const { id } = req.params;
    let { nama_mod, harga_beli, keterangan } = req.body;

    if (!nama_mod || typeof nama_mod !== 'string') {
      return res.status(400).json({ error: 'Nama / Kode MOD wajib diisi.' });
    }

    nama_mod = nama_mod.trim().toUpperCase();
    const hargaNum = parseFloat(harga_beli);
    if (isNaN(hargaNum) || hargaNum < 0) {
      return res.status(400).json({ error: 'Harga beli harus berupa angka nominal yang valid.' });
    }

    // Check duplicate on other IDs
    const [duplicate] = await pool.execute(
      'SELECT id FROM master_mod WHERE nama_mod = ? AND id != ?',
      [nama_mod, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({ error: `Kode MOD "${nama_mod}" sudah digunakan oleh data lain.` });
    }

    // Get old MOD name
    const [oldMod] = await pool.execute('SELECT nama_mod FROM master_mod WHERE id = ?', [id]);
    if (oldMod.length === 0) {
      return res.status(404).json({ error: 'Data master MOD tidak ditemukan.' });
    }

    const oldName = oldMod[0].nama_mod;

    await pool.execute(
      'UPDATE master_mod SET nama_mod = ?, harga_beli = ?, keterangan = ? WHERE id = ?',
      [nama_mod, hargaNum, (keterangan || '').trim(), id]
    );

    // If MOD name changed, update barang with old MOD name as well
    if (oldName !== nama_mod) {
      await pool.execute(
        'UPDATE barang SET `MOD` = ? WHERE `MOD` = ?',
        [nama_mod, oldName]
      );
    }

    return res.json({
      message: `Master MOD "${nama_mod}" berhasil diperbarui.`,
      mod: {
        id: parseInt(id, 10),
        nama_mod,
        harga_beli: hargaNum,
        keterangan: (keterangan || '').trim()
      }
    });
  } catch (err) {
    console.error('updateMod error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui data master MOD.' });
  }
};

// 4. Delete MOD
const deleteMod = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT nama_mod FROM master_mod WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Data master MOD tidak ditemukan.' });
    }

    const modName = rows[0].nama_mod;

    // Check if any barang uses this MOD
    const [usedInBarang] = await pool.execute(
      'SELECT id FROM barang WHERE `MOD` = ? AND deleted_at IS NULL LIMIT 1',
      [modName]
    );

    if (usedInBarang.length > 0) {
      return res.status(400).json({
        error: `Kode MOD "${modName}" tidak dapat dihapus karena masih digunakan pada data barang aktif.`
      });
    }

    await pool.execute('DELETE FROM master_mod WHERE id = ?', [id]);

    return res.json({ message: `Master MOD "${modName}" berhasil dihapus.` });
  } catch (err) {
    console.error('deleteMod error:', err);
    return res.status(500).json({ error: 'Gagal menghapus master MOD.' });
  }
};

module.exports = {
  getAllMod,
  createMod,
  updateMod,
  deleteMod
};
