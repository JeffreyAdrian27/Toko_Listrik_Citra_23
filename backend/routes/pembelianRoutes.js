const express = require('express');
const router = express.Router();
const { createPembelian, getPembelianHistory } = require('../controllers/pembelianController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('admin'));

router.post('/', createPembelian);
router.get('/', getPembelianHistory);

module.exports = router;
