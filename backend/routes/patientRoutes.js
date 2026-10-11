const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
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
require('fs').mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
const upload = multer({ storage, limits: { fileSize: 4 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) return cb(new Error('Upload a PDF, JPG or PNG.'));
    cb(null, true);
} });

router.use(authMiddleware, roleMiddleware('Patient'));

router.get('/prescriptions/:id/download', require('../controllers/prescriptionDownloadController').download);
router.get('/prescriptions-pdf', require('../controllers/prescriptionHistoryController').downloadAll);
router.get('/profile', patientController.getProfile);
router.get('/prescriptions', patientController.getPatientPrescriptions);

// New Phase 3 Routes
router.post('/allergies', patientController.updateAllergies);
router.post('/upload-report', upload.single('report'), patientController.uploadLabReport);
router.get('/reports', patientController.getLabReports);
router.post('/complaint', patientController.submitComplaint);
router.get('/my-complaints', patientController.getMyComplaints);
router.post('/ask-ai', patientController.askAIAssistant);
module.exports = router;