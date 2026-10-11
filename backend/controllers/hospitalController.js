const bcrypt = require('bcrypt');
const db = require('../config/db');

// Add a Doctor to the Hospital Network
exports.addDoctor = async (req, res) => {
    try {
        // Grab the logged-in Hospital's ID
        const hospitalId = req.user.userId || req.user.id;
const { name, email, password, license_number = null, specialization = null } = req.body;
        // 1. Verify the Hospital is actually approved before they can add doctors
        const [hospitalCheck] = await db.execute('SELECT approval_status FROM users WHERE id = ?', [hospitalId]);
        if (hospitalCheck[0].approval_status !== 'Approved') {
            return res.status(403).json({ message: 'Your hospital account is not approved yet.' });
        }

        // 2. Check if the doctor's email already exists
        const [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email is already registered in the system.' });
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Insert the Doctor, automatically linking them to this hospital_id
        await db.execute(
            `INSERT INTO users 
            (name, email, password, role, is_active, approval_status, license_number, hospital_id, specialization) 
            VALUES (?, ?, ?, 'Doctor', true, 'Approved', ?, ?, ?)`,
            [name, email, hashedPassword, license_number, hospitalId, specialization]
        );

        res.status(201).json({ message: 'Doctor successfully added to your hospital network!' });
    } catch (error) {
        console.error("Error adding doctor:", error);
        res.status(500).json({ message: 'Server error while adding doctor.' });
    }
};

// Fetch all doctors belonging to this hospital
exports.getHospitalDoctors = async (req, res) => {
    try {
        const hospitalId = req.user.userId || req.user.id;
        const [doctors] = await db.execute(
            'SELECT id, name, email, license_number, specialization, is_active FROM users WHERE hospital_id = ? AND role = "Doctor"',
            [hospitalId]
        );
        res.status(200).json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching doctors.' });
    }
};
// Remove a Doctor
exports.removeDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = req.user.userId || req.user.id;
        
        // Ensure the hospital actually owns this doctor before deleting
        await db.execute('DELETE FROM users WHERE id = ? AND hospital_id = ? AND role = "Doctor"', [id, hospitalId]);
        res.status(200).json({ message: 'Doctor removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing doctor.' });
    }
};

// Get Patient Complaints for this Hospital -- each one comes with the full
// details of the prescription it is about.
exports.getComplaints = async (req, res) => {
    try {
        const hospitalId = req.user.userId || req.user.id;

        const [complaints] = await db.execute(
            `SELECT c.id, c.prescription_id, c.doctor_name, c.complaint_text, c.status, c.created_at,
                    u.name AS patient_name, u.patient_unique_id, u.allergies AS patient_allergies,
                    p.medicine_name, p.dosage, p.duration_days, p.instructions,
                    p.status AS prescription_status, p.created_at AS prescribed_on,
                    (SELECT MAX(r.dispensed_at) FROM pharmacy_records r WHERE r.prescription_id = p.id) AS dispensed_at,
                    (SELECT r.days_supplied FROM pharmacy_records r WHERE r.prescription_id = p.id ORDER BY r.id DESC LIMIT 1) AS days_supplied
             FROM complaints c
             JOIN users u ON c.patient_id = u.id
             LEFT JOIN prescriptions p ON c.prescription_id = p.id
             WHERE c.hospital_id = ?
             ORDER BY c.created_at DESC`,
            [hospitalId]
        );

        res.status(200).json(complaints);
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(500).json({ message: 'Error fetching complaints.' });
    }
};

// Update Complaint Status
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const hospitalId = req.user.userId || req.user.id;

        await db.execute(
            'UPDATE complaints SET status = ? WHERE id = ? AND hospital_id = ?',
            [status, id, hospitalId]
        );
        res.status(200).json({ message: `Complaint marked as ${status}.` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating complaint status.' });
    }
};