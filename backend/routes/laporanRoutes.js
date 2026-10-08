const express = require('express');
const router = express.Router();
const { getLaporanLabaRugi } = require('../controllers/laporanController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/laba-rugi', getLaporanLabaRugi);

module.exports = router;
