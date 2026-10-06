const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to search for a patient by ID
router.get('/search-patient/:uniqueId', authMiddleware, doctorController.searchPatient);

// Route to add a prescription
router.post('/add-prescription', authMiddleware, doctorController.addPrescription);
// Route to update medication status
router.put('/update-prescription/:id', authMiddleware, doctorController.updatePrescriptionStatus);
// Add this near your other doctor routes
router.post('/check-interaction', authMiddleware, doctorController.checkInteraction);
// Recent patients for the doctor workspace
router.get('/recent-patients', authMiddleware, doctorController.getRecentPatients);
module.exports = router;