const db = require('../config/db');

// ================= HOSPITALS =================

// Fetch ALL hospitals regardless of status
exports.getAllHospitals = async (req, res) => {
    try {
        console.log("Admin requesting hospital list...");

        const [hospitals] = await db.execute(
            "SELECT id, name, email, created_at, approval_status, license_file, license_number FROM users WHERE role = 'Hospital' ORDER BY created_at DESC"
        );

        console.log(`Success! Found ${hospitals.length} hospitals in the database.`);
        res.status(200).json(hospitals);

    } catch (error) {
        console.error("\n❌ DATABASE CRASH in getAllHospitals:", error.message, "\n");
        res.status(500).json({ message: 'Server error while fetching hospitals.' });
    }
};

// Approve or Reject a hospital
exports.updateHospitalStatus = async (req, res) => {
    try {
        const hospitalId = req.params.id;
        const { status } = req.body; // Expects 'Approved' or 'Rejected'

        const isActive = status === 'Approved' ? true : false;

        await db.execute(
            "UPDATE users SET approval_status = ?, is_active = ? WHERE id = ?",
            [status, isActive, hospitalId]
        );
        res.status(200).json({ message: `Hospital ${status} successfully!` });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating status.' });
    }
};

// ================= OTHER USERS (Patients / Pharmacists) =================

// Fetch all users of a given role ('Patient' or 'Pharmacist')
exports.getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;

        if (!['Patient', 'Pharmacist'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role filter. Use Patient or Pharmacist.' });
        }

        const [users] = await db.execute(
            "SELECT id, name, email, created_at, is_active, patient_unique_id FROM users WHERE role = ? ORDER BY created_at DESC",
            [role]
        );

        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res.status(500).json({ message: 'Server error while fetching users.' });
    }
};

// Remove (deactivate) or Restore a Patient/Pharmacist
// We deactivate rather than hard-delete so linked records (prescriptions,
// lab reports, complaints) aren't orphaned or blocked by foreign keys.
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body; // true or false

        const [rows] = await db.execute("SELECT role FROM users WHERE id = ?", [id]);
        const user = rows[0];

        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (user.role === 'Hospital') {
            return res.status(400).json({ message: 'Use the hospital status action for hospitals.' });
        }

        await db.execute("UPDATE users SET is_active = ? WHERE id = ?", [is_active, id]);
        res.status(200).json({ message: is_active ? 'User restored.' : 'User removed.' });
    } catch (error) {
        console.error("Error toggling user status:", error.message);
        res.status(500).json({ message: 'Server error while updating user.' });
    }
};