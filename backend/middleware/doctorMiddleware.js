const db = require('../config/db');

// Allows a request only if the caller is a Doctor whose hospital is a
// registered (Approved) and active Hospital account. The check reads the
// database on every request, so a hospital that is suspended AFTER the doctor
// logged in (the JWT lasts 15 min) is blocked immediately.
module.exports = async (req, res, next) => {
    try {
        const userId = req.user && (req.user.userId || req.user.id);
        const [rows] = await db.execute(
            `SELECT d.id, d.role, d.is_active, d.approval_status, d.hospital_id,
                    h.name AS hospital_name, h.approval_status AS hospital_status, h.is_active AS hospital_active
             FROM users d
             LEFT JOIN users h ON h.id = d.hospital_id AND h.role = 'Hospital'
             WHERE d.id = ?`, [userId]);

        const d = rows[0];
        if (!d || d.role !== 'Doctor') {
            return res.status(403).json({ message: 'Only doctors can add prescriptions.' });
        }
        if (!d.is_active || d.approval_status !== 'Approved') {
            return res.status(403).json({ message: 'Your doctor account is not active.' });
        }
        if (!d.hospital_id || !d.hospital_name || d.hospital_status !== 'Approved' || !d.hospital_active) {
            return res.status(403).json({
                message: 'This prescription cannot be added: your hospital is not registered or approved on Medinex.'
            });
        }
        req.doctor = { id: d.id, hospital_id: d.hospital_id, hospital_name: d.hospital_name };
        next();
    } catch (err) {
        console.error('Doctor verification failed:', err);
        res.status(500).json({ message: 'Could not verify doctor account.' });
    }
};
