const express = require('express');
const router = express.Router();
const pharmacistController = require('../controllers/pharmacistController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Every pharmacist route requires a valid token AND the Pharmacist role
router.use(authMiddleware, roleMiddleware('Pharmacist'));

router.post('/request-access', pharmacistController.requestPatientAccess);
router.post('/verify-access', pharmacistController.verifyOtpAndGetRecords);
router.put('/mark-dispensed/:id', pharmacistController.markDispensed);

// Patients this pharmacist has recently served (name + ID only, no medical data)
router.get('/recent-patients', pharmacistController.getRecentPatients);

module.exports = router;
