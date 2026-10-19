const express = require('express');
const router = express.Router();
const {
  getAllPegawai,
  createPegawai,
  updatePegawai,
  resetPasswordPegawai,
  deletePegawai
} = require('../controllers/pegawaiController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', getAllPegawai);
router.post('/', createPegawai);
router.put('/:id', updatePegawai);
router.post('/:id/reset-password', resetPasswordPegawai);
router.delete('/:id', deletePegawai);

module.exports = router;
