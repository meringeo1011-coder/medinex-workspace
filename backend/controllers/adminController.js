const db = require('../config/db');

// Fetch ALL hospitals regardless of status
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
        // 🔥 This will print the EXACT reason MySQL is failing to your terminal
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