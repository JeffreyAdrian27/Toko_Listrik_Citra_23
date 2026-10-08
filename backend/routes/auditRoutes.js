const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', getAuditLogs);

module.exports = router;
