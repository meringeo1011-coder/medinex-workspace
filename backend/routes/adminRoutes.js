const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware, roleMiddleware('Admin'));

router.get('/hospitals', adminController.getAllHospitals); // Changed route name
router.put('/hospitals/:id/status', adminController.updateHospitalStatus); // Unified status route

module.exports = router;