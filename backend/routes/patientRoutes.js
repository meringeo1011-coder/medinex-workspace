const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure Multer Storage Engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Creates a unique name: timestamp-filename.ext
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.get('/profile', authMiddleware, patientController.getProfile);
router.get('/prescriptions', authMiddleware, patientController.getPatientPrescriptions);

// New Phase 3 Routes
router.post('/allergies', authMiddleware, patientController.updateAllergies);
router.post('/upload-report', authMiddleware, upload.single('report'), patientController.uploadLabReport);
router.get('/reports', authMiddleware, patientController.getLabReports);
router.post('/complaint', authMiddleware, patientController.submitComplaint);
router.get('/my-complaints', authMiddleware, patientController.getMyComplaints);
router.post('/ask-ai', authMiddleware, patientController.askAIAssistant);
module.exports = router;