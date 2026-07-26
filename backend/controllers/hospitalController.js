const bcrypt = require('bcrypt');
const db = require('../config/db');

// Add a Doctor to the Hospital Network
exports.addDoctor = async (req, res) => {
    try {
        // Grab the logged-in Hospital's ID
        const hospitalId = req.user.userId || req.user.id;
const { name, email, password, license_number = null } = req.body;
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
            (name, email, password, role, is_active, approval_status, license_number, hospital_id) 
            VALUES (?, ?, ?, 'Doctor', true, 'Approved', ?, ?)`,
            [name, email, hashedPassword, license_number, hospitalId]
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
            'SELECT id, name, email, license_number, is_active FROM users WHERE hospital_id = ? AND role = "Doctor"',
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

// Get Patient Complaints for this Hospital (UPDATED WITH PATIENT NAME)
exports.getComplaints = async (req, res) => {
    try {
        const hospitalId = req.user.userId || req.user.id;
        
        // Using JOIN to get the patient's name from the users table
        const [complaints] = await db.execute(
            `SELECT c.*, u.name AS patient_name 
             FROM complaints c 
             JOIN users u ON c.patient_id = u.id 
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