const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role, license_number } = req.body;
        
        // Safely handle missing files or licenses for Patients
        const licenseFile = req.file ? req.file.filename : null;
        const safeLicenseNumber = license_number || null;

        if (role === 'Hospital' && (!licenseFile || !safeLicenseNumber)) {
            return res.status(400).json({ message: 'A license number and document are mandatory for Hospitals.' });
        }

        const [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) return res.status(400).json({ message: 'Email already registered.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const approvalStatus = (role === 'Hospital') ? 'Pending' : 'Approved';
        const isActive = (approvalStatus === 'Approved') ? true : false;

        let patientUniqueId = null;
        if (role === 'Patient') {
            const randomNumbers = Math.floor(100000 + Math.random() * 900000); 
            patientUniqueId = `PT-${randomNumbers}`;
        }

        await db.execute(
            'INSERT INTO users (name, email, password, role, is_active, approval_status, license_file, license_number, patient_unique_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, isActive, approvalStatus, licenseFile, safeLicenseNumber, patientUniqueId]
        );

        res.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });

        const user = users[0];

        // 1. Check basic user approval status
        if (user.approval_status === 'Pending') return res.status(403).json({ message: 'Your account is pending Admin approval.' });
        if (user.approval_status === 'Rejected') return res.status(403).json({ message: 'Your registration was rejected by the Admin.' });
        if (!user.is_active) return res.status(403).json({ message: 'Account is deactivated.' });

        // 2. STRICT HOSPITAL CHECK FOR DOCTORS
        if (user.role === 'Doctor') {
            if (!user.hospital_id) {
                return res.status(403).json({ message: 'Login denied: You are not assigned to a registered hospital.' });
            }

            // Find the hospital this doctor belongs to
            const [hospitals] = await db.execute('SELECT approval_status FROM users WHERE id = ? AND role = "Hospital"', [user.hospital_id]);
            
            if (hospitals.length === 0 || hospitals[0].approval_status !== 'Approved') {
                return res.status(403).json({ message: 'Login denied: Your employing hospital is currently unregistered or suspended.' });
            }
        }

        // 3. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.status(200).json({ message: 'Login successful!', token, role: user.role, name: user.name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};
// --- FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'No account found with that email.' });
        }

        const user = users[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
        
        await db.execute(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [resetToken, tokenExpiry, user.id]
        );

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
        const message = `
            <h2>Medinex Password Reset</h2>
            <p>You requested a password reset. Please click the button below to set a new password. This link is valid for 1 hour.</p>
            <a href="${resetUrl}" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
        `;

        await sendEmail({ email: user.email, subject: 'Medinex - Password Reset Request', html: message });
        res.status(200).json({ message: 'Password reset link sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending email. Please try again later.' });
    }
};

// --- RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const [users] = await db.execute(
            'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }

        const user = users[0];
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.execute(
            'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.status(200).json({ message: 'Password reset successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while resetting password.' });
    }
};