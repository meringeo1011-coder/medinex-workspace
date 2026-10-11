const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const requireApprovedDoctor = require('../middleware/doctorMiddleware');

// Every doctor route needs: valid token + Doctor role + a registered, approved hospital
router.use(authMiddleware, roleMiddleware('Doctor'), requireApprovedDoctor);

// Route to search for a patient by ID
router.get('/search-patient/:uniqueId', doctorController.searchPatient);

// Route to add a prescription
router.post('/add-prescription', doctorController.addPrescription);
// Route to update medication status
router.put('/update-prescription/:id', doctorController.updatePrescriptionStatus);
// Add this near your other doctor routes
router.post('/check-interaction', doctorController.checkInteraction);
// Recent patients for the doctor workspace
router.get('/recent-patients', doctorController.getRecentPatients);
module.exports = router;