const express = require('express');
const router = express.Router();
const modController = require('../controllers/modController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All master MOD routes require authenticated session
router.use(verifyToken);

// GET can be read by authenticated users (Admin gets full data with harga_beli, used for dropdowns)
router.get('/', modController.getAllMod);

// Create, Update, Delete strictly Admin only
router.post('/', requireRole('admin'), modController.createMod);
router.put('/:id', requireRole('admin'), modController.updateMod);
router.delete('/:id', requireRole('admin'), modController.deleteMod);

module.exports = router;
