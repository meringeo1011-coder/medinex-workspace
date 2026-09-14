const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware, roleMiddleware('Admin'));

// Hospitals
router.get('/hospitals', adminController.getAllHospitals);
router.put('/hospitals/:id/status', adminController.updateHospitalStatus);

// Other Users (Patients / Pharmacists)
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.toggleUserStatus);

module.exports = router;