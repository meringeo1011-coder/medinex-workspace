const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads folder exists automatically
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configure where files are saved
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Register route now looks for a single file called 'license_file'
router.post('/register', upload.single('license_file'), authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
module.exports = router;