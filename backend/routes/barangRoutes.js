const express = require('express');
const router = express.Router();
const {
  getAllBarang,
  getBarangById,
  lookupBarang,
  createBarang,
  updateBarang,
  tambahStokBarang,
  deleteBarang
} = require('../controllers/barangController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// Accessible by Pegawai & Admin for autocomplete in sales (NO MOD_harga returned)
router.get('/lookup', lookupBarang);

// Accessible only by Admin
router.get('/', requireRole('admin'), getAllBarang);
router.get('/:id', requireRole('admin'), getBarangById);
router.post('/', requireRole('admin'), createBarang);
router.put('/:id', requireRole('admin'), updateBarang);
router.post('/:id/tambah-stok', requireRole('admin'), tambahStokBarang);
router.delete('/:id', requireRole('admin'), deleteBarang);

module.exports = router;
