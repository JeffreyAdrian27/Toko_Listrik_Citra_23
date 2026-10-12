const express = require('express');
const router = express.Router();
const { getActivityLogs, markAllAsRead, deleteActivityLog } = require('../controllers/activityController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getActivityLogs);
router.post('/mark-read', markAllAsRead);
router.delete('/:id', deleteActivityLog);

module.exports = router;
