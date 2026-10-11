const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const authMiddleware = require('../middleware/authMiddleware');

// Every route below requires a valid token, and only Hospital accounts may use them
router.use(authMiddleware, (req, res, next) => {
  if (req.user.role !== 'Hospital') {
    return res.status(403).json({ message: 'Hospitals only.' });
  }
  next();
});

router.get('/doctors', hospitalController.getHospitalDoctors);
router.post('/doctors', hospitalController.addDoctor);
router.delete('/doctors/:id', hospitalController.removeDoctor);

router.get('/complaints', hospitalController.getComplaints);
router.put('/complaints/:id/status', hospitalController.updateComplaintStatus);

module.exports = router;