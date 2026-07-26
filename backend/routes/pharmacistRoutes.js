const express = require('express');
const router = express.Router();
const pharmacistController = require('../controllers/pharmacistController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/request-access', authMiddleware, pharmacistController.requestPatientAccess);
router.post('/verify-access', authMiddleware, pharmacistController.verifyOtpAndGetRecords);
router.put('/mark-dispensed/:id', authMiddleware, pharmacistController.markDispensed);
module.exports = router;