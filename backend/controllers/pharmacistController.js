const db = require('../config/db');
const nodemailer = require('nodemailer');

// Set up the Email Engine (Reusing your .env credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. Pharmacist requests access (Sends OTP to Patient)
exports.requestPatientAccess = async (req, res) => {
    try {
        const { unique_id } = req.body;
        
        console.log("Searching for Patient ID in DB:", unique_id); 
        
        const [patients] = await db.execute(
            'SELECT id, name, email FROM users WHERE patient_unique_id = ? AND role = "Patient"', 
            [unique_id]
        );

        console.log("Database result count:", patients.length);

        if (patients.length === 0) {
            return res.status(404).json({ message: 'Patient not found.' });
        }

        const patient = patients[0];
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); 

        await db.execute(
            'UPDATE users SET current_otp = ?, otp_expires_at = ? WHERE id = ?',
            [otp, expiresAt, patient.id]
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: patient.email,
            subject: 'Medinex Security - Pharmacy Access Code',
            text: `Hello ${patient.name}, your code is: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent.', patient_id: patient.id, patient_name: patient.name });

    } catch (error) {
        console.error("OTP Error:", error);
        res.status(500).json({ message: 'Failed to send OTP.' });
    }
};
// 2. Pharmacist verifies OTP to view Active Prescriptions & Allergies
exports.verifyOtpAndGetRecords = async (req, res) => {
    try {
        const { patient_id, otp } = req.body;

        // Check if OTP matches and is not expired
        const [users] = await db.execute(
            'SELECT allergies, current_otp, otp_expires_at FROM users WHERE id = ?',
            [patient_id]
        );

        const patient = users[0];
        const now = new Date();

        if (patient.current_otp !== otp || new Date(patient.otp_expires_at) < now) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        // If OTP is correct, fetch their Active Prescriptions
        const [prescriptions] = await db.execute(`
            SELECT p.*, u.name AS doctor_name 
            FROM prescriptions p
            JOIN users u ON p.doctor_id = u.id
            WHERE p.patient_id = ? AND p.status = 'Active'
            ORDER BY p.created_at DESC
        `, [patient_id]);

        // Clear the OTP from the database for security
        await db.execute('UPDATE users SET current_otp = NULL, otp_expires_at = NULL WHERE id = ?', [patient_id]);

        res.status(200).json({ 
            message: 'Access granted.', 
            allergies: patient.allergies,
            prescriptions: prescriptions 
        });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: 'Server error during verification.' });
    }
};

// 3. Mark prescription as Dispensed
exports.markDispensed = async (req, res) => {
    try {
        const { id } = req.params;
        const { medicines_given, days_supplied } = req.body;
        const pharmacist_id = req.user.userId; // fixed: JWT payload uses "userId", not "id"

        await db.execute(
            'UPDATE prescriptions SET status = ? WHERE id = ?',
            ['Dispensed', id]
        );

        await db.execute(
            'INSERT INTO pharmacy_records (prescription_id, pharmacist_id, medicines_given, days_supplied) VALUES (?, ?, ?, ?)',
            [id, pharmacist_id, medicines_given, days_supplied]
        );

        res.status(200).json({ message: 'Prescription marked as Dispensed.' });
    } catch (error) {
        console.error("Dispensing Error:", error);
        res.status(500).json({ message: 'Error updating prescription status.' });
    }
};