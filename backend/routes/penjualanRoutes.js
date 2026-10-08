const express = require('express');
const router = express.Router();
const {
  createPenjualan,
  getPenjualanHariIni,
  getPenjualanHistory,
  getPenjualanStats,
  voidPenjualan
} = require('../controllers/penjualanController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(verifyToken);

// 1. Accessible by both Admin & Pegawai
router.post('/', createPenjualan);
router.get('/hari-ini', getPenjualanHariIni);

// 2. Accessible ONLY by Admin
router.get('/history', requireRole('admin'), getPenjualanHistory);
router.get('/stats', requireRole('admin'), getPenjualanStats);
router.post('/:id/void', requireRole('admin'), voidPenjualan);

// 3. Strictly BLOCK any direct edit or delete attempts (FR-JUAL-5, FR-JUAL-9)
const blockMutation = async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  await logAudit({
    userId: req.user.id,
    role: req.user.role,
    aksi: 'Percobaan Manipulasi Data Penjualan Terblokir',
    entitas: 'Penjualan',
    entitasId: req.params.id || null,
    detail: `Metode HTTP ${req.method} pada /penjualan ditolak. Data penjualan immutable, koreksi hanya melalui Void Admin.`,
    ipAddress: clientIp
  });

  return res.status(403).json({
    error: 'Data penjualan bersifat immutable (tidak dapat diubah atau dihapus secara langsung). Koreksi hanya dapat dilakukan oleh Admin melalui fitur Void.'
  });
};

router.put('/:id', blockMutation);
router.patch('/:id', blockMutation);
router.delete('/:id', blockMutation);

module.exports = router;
