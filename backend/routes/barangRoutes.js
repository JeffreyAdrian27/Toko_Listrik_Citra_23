const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // maks 10MB
});

const {
  getAllBarang,
  getBarangById,
  lookupBarang,
  createBarang,
  updateBarang,
  tambahStokBarang,
  deleteBarang,
  downloadTemplateExcel,
  importExcelBarang
} = require('../controllers/barangController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// Accessible by Pegawai & Admin for autocomplete in sales (NO MOD_harga returned)
router.get('/lookup', lookupBarang);

// Accessible only by Admin
router.get('/', requireRole('admin'), getAllBarang);
router.get('/template-excel', requireRole('admin'), downloadTemplateExcel);
router.post('/import-excel', requireRole('admin'), upload.single('file'), importExcelBarang);
router.get('/:id', requireRole('admin'), getBarangById);
router.post('/', requireRole('admin'), createBarang);
router.put('/:id', requireRole('admin'), updateBarang);
router.post('/:id/tambah-stok', requireRole('admin'), tambahStokBarang);
router.delete('/:id', requireRole('admin'), deleteBarang);

module.exports = router;
