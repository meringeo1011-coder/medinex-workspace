const db = require('../config/db');

async function autoCompleteExpiredPrescriptions() {
    await db.execute(`
        UPDATE prescriptions
        SET status = 'Completed'
        WHERE status = 'Active'
          AND duration_days IS NOT NULL
          AND DATE_ADD(created_at, INTERVAL duration_days DAY) <= NOW()
    `);
}

module.exports = { autoCompleteExpiredPrescriptions };