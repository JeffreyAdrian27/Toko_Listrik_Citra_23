const express = require('express');
const router = express.Router();
const { getAllKategori, createKategori, updateKategori, deleteKategori } = require('../controllers/kategoriController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All kategori CRUD is Admin only
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', getAllKategori);
router.post('/', createKategori);
router.put('/:id', updateKategori);
router.delete('/:id', deleteKategori);

module.exports = router;
