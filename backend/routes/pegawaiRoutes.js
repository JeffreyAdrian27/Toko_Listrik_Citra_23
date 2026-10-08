const express = require('express');
const router = express.Router();
const {
  getAllPegawai,
  createPegawai,
  updatePegawai,
  resetPasswordPegawai
} = require('../controllers/pegawaiController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', getAllPegawai);
router.post('/', createPegawai);
router.put('/:id', updatePegawai);
router.post('/:id/reset-password', resetPasswordPegawai);

module.exports = router;
