const db = require('../config/db');
const nodemailer = require('nodemailer');
const { autoCompleteExpiredPrescriptions } = require('../utils/prescriptionUtils');

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

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found.' });
        }

        if (patient.current_otp !== otp || new Date(patient.otp_expires_at) < now) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        // Keep statuses up to date before showing them
        await autoCompleteExpiredPrescriptions();

        // If OTP is correct, fetch their Active Prescriptions
        const [prescriptions] = await db.execute(`
            SELECT p.*, u.name AS doctor_name 
            FROM prescriptions p
            JOIN users u ON p.doctor_id = u.id
            WHERE p.patient_id = ? AND p.status = 'Active'
            ORDER BY p.created_at DESC
        `, [patient_id]);

        // Recently bought medicines: everything the pharmacy has already dispensed
        // to this patient (newest first), so the pharmacist can see purchase history.
        const [purchases] = await db.execute(`
            SELECT r.id, r.medicines_given, r.days_supplied, r.dispensed_at,
                   p.medicine_name, p.dosage, p.status, p.duration_days,
                   d.name AS doctor_name, ph.name AS pharmacist_name
            FROM pharmacy_records r
            JOIN prescriptions p ON r.prescription_id = p.id
            JOIN users d ON p.doctor_id = d.id
            LEFT JOIN users ph ON r.pharmacist_id = ph.id
            WHERE p.patient_id = ?
            ORDER BY r.dispensed_at DESC, r.id DESC
            LIMIT 30
        `, [patient_id]);

        // Clear the OTP from the database for security
        await db.execute('UPDATE users SET current_otp = NULL, otp_expires_at = NULL WHERE id = ?', [patient_id]);

        // Remember this patient in the pharmacist's "recent patients" list.
        // A failure here must never block the pharmacist from seeing the records.
        try {
            const pharmacistId = req.user.userId || req.user.id;
            await db.execute(
                `INSERT INTO pharmacist_patient_access (pharmacist_id, patient_id, access_count, last_accessed)
                 VALUES (?, ?, 1, NOW())
                 ON DUPLICATE KEY UPDATE access_count = access_count + 1, last_accessed = NOW()`,
                [pharmacistId, patient_id]
            );
        } catch (logError) {
            console.error('Could not record recent patient:', logError.message);
        }

        res.status(200).json({ 
            message: 'Access granted.', 
            allergies: patient.allergies,
            prescriptions: prescriptions,
            purchases: purchases
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

// 4. Recent patients for this pharmacist.
//    Combines patients whose OTP they verified with patients they have dispensed to
//    (so history from before this feature existed still shows up).
//    Returns only name + patient ID - the records stay locked behind a fresh OTP.
exports.getRecentPatients = async (req, res) => {
    try {
        const pharmacistId = req.user.userId || req.user.id;
        const [rows] = await db.execute(`
            SELECT u.id, u.name, u.patient_unique_id,
                   MAX(t.last_at) AS last_visit
            FROM (
                SELECT patient_id, last_accessed AS last_at
                FROM pharmacist_patient_access
                WHERE pharmacist_id = ?
                UNION ALL
                SELECT p.patient_id, r.dispensed_at AS last_at
                FROM pharmacy_records r
                JOIN prescriptions p ON p.id = r.prescription_id
                WHERE r.pharmacist_id = ?
            ) t
            JOIN users u ON u.id = t.patient_id AND u.role = 'Patient'
            GROUP BY u.id, u.name, u.patient_unique_id
            ORDER BY last_visit DESC
            LIMIT 10
        `, [pharmacistId, pharmacistId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Pharmacist recent patients error:', error);
        res.status(500).json({ message: 'Could not load recent patients.' });
    }
};
