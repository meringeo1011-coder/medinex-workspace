const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const authMiddleware = require('../middleware/authMiddleware');

// Doctor Management Routes (Matches your new frontend exactly)
router.get('/doctors', authMiddleware, hospitalController.getHospitalDoctors);
router.post('/doctors', authMiddleware, hospitalController.addDoctor); 
router.delete('/doctors/:id', authMiddleware, hospitalController.removeDoctor);

// Complaints Management Routes
router.get('/complaints', authMiddleware, hospitalController.getComplaints);
router.put('/complaints/:id/status', authMiddleware, hospitalController.updateComplaintStatus);

module.exports = router;