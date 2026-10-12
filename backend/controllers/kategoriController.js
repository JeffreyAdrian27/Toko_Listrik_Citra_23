const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');
const { logActivity } = require('./activityController');

const getAllKategori = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : '%';
    const [rows] = await pool.execute(`
      SELECT k.id, k.nama_kategori, k.created_at, COUNT(b.id) as total_barang
      FROM kategori k
      LEFT JOIN barang b ON k.id = b.kategori_id AND b.deleted_at IS NULL
      WHERE k.nama_kategori LIKE ?
      GROUP BY k.id, k.nama_kategori, k.created_at
      ORDER BY k.nama_kategori ASC
    `, [search]);
    return res.json({ data: rows });
  } catch (err) {
    console.error('getAllKategori error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data kategori.' });
  }
};

const createKategori = async (req, res) => {
  const { nama_kategori } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  if (!nama_kategori || !nama_kategori.trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO kategori (nama_kategori) VALUES (?)',
      [nama_kategori.trim()]
    );

    // 1. Audit Trail (Immutable Log)
    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      aksi: 'Tambah Kategori',
      entitas: 'Kategori',
      entitasId: result.insertId,
      detail: `Menambahkan kategori: ${nama_kategori.trim()}`,
      ipAddress: clientIp
    });

    // 2. Log Aktivitas Toko (Notifikasi Lonceng)
    await logActivity({
      tipe: 'kategori',
      judul: 'Kategori Baru Ditambahkan',
      detail: `Kategori "${nama_kategori.trim()}" berhasil ditambahkan ke inventaris.`
    });

    return res.status(201).json({
      message: 'Kategori berhasil ditambahkan.',
      data: { id: result.insertId, nama_kategori: nama_kategori.trim() }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Kategori dengan nama tersebut sudah ada.' });
    }
    console.error('createKategori error:', err);
    return res.status(500).json({ error: 'Gagal menyimpan kategori.' });
  }
};

const updateKategori = async (req, res) => {
  const { id } = req.params;
  const { nama_kategori } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  if (!nama_kategori || !nama_kategori.trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  }

  try {
    await pool.execute(
      'UPDATE kategori SET nama_kategori = ? WHERE id = ?',
      [nama_kategori.trim(), id]
    );

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      aksi: 'Ubah Kategori',
      entitas: 'Kategori',
      entitasId: id,
      detail: `Mengubah nama kategori menjadi '${nama_kategori.trim()}'`,
      ipAddress: clientIp
    });

    await logActivity({
      tipe: 'kategori',
      judul: 'Kategori Diperbarui',
      detail: `Nama kategori berhasil diubah menjadi "${nama_kategori.trim()}".`
    });

    return res.json({ message: 'Kategori berhasil diperbarui.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Kategori dengan nama tersebut sudah ada.' });
    }
    console.error('updateKategori error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui kategori.' });
  }
};

const deleteKategori = async (req, res) => {
  const { id } = req.params;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  try {
    // Check if category is used by items (FR-KAT-2)
    const [usedItems] = await pool.execute(
      'SELECT id, nama_barang FROM barang WHERE kategori_id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );

    if (usedItems.length > 0) {
      return res.status(400).json({
        error: 'Kategori tidak dapat dihapus karena masih digunakan oleh barang.'
      });
    }

    const [cat] = await pool.execute('SELECT nama_kategori FROM kategori WHERE id = ?', [id]);
    const catName = cat.length > 0 ? cat[0].nama_kategori : id;

    await pool.execute('DELETE FROM kategori WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      aksi: 'Hapus Kategori',
      entitas: 'Kategori',
      entitasId: id,
      detail: `Menghapus kategori '${catName}'`,
      ipAddress: clientIp
    });

    await logActivity({
      tipe: 'kategori',
      judul: 'Kategori Dihapus',
      detail: `Kategori "${catName}" telah dihapus dari sistem.`
    });

    return res.json({ message: 'Kategori berhasil dihapus.' });
  } catch (err) {
    console.error('deleteKategori error:', err);
    return res.status(500).json({ error: 'Gagal menghapus kategori.' });
  }
};

module.exports = { getAllKategori, createKategori, updateKategori, deleteKategori };
