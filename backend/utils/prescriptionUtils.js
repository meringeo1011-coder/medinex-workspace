const db = require('../config/db');

// Automatically flips a prescription's status to "Completed" once its
// course of medicine is over. This now covers BOTH cases:
//
//   1. "Active" prescriptions that were never picked up from the pharmacy
//      but have a doctor-entered duration_days that has elapsed.
//   2. "Dispensed" prescriptions (the normal path: doctor -> pharmacist
//      hands out the medicine) -- these complete based on days_supplied
//      from the pharmacy_records row, counted from when it was dispensed.
//      If no pharmacy_records row/days_supplied exists for some reason,
//      it falls back to the prescription's own duration_days.
//
// This runs on every fetch (patient view, doctor view, pharmacist view),
// so it also cleans up any already-existing "Dispensed"/"Active" rows in
// the database the first time it runs after their course has ended --
// nothing else needs to be done for existing data.
async function autoCompleteExpiredPrescriptions() {
    // 1. Active prescriptions whose duration has passed (never dispensed)
    await db.execute(`
        UPDATE prescriptions
        SET status = 'Completed'
        WHERE status = 'Active'
          AND duration_days IS NOT NULL
          AND DATE_ADD(created_at, INTERVAL duration_days DAY) <= NOW()
    `);

    // 2. Dispensed prescriptions whose supplied course has run out
    await db.execute(`
        UPDATE prescriptions p
        LEFT JOIN (
            SELECT prescription_id, dispensed_at, days_supplied
            FROM pharmacy_records
            WHERE id IN (
                SELECT MAX(id) FROM pharmacy_records GROUP BY prescription_id
            )
        ) pr ON pr.prescription_id = p.id
        SET p.status = 'Completed'
        WHERE p.status = 'Dispensed'
          AND (
                (pr.days_supplied IS NOT NULL AND DATE_ADD(pr.dispensed_at, INTERVAL pr.days_supplied DAY) <= NOW())
             OR (pr.prescription_id IS NULL AND p.duration_days IS NOT NULL AND DATE_ADD(p.created_at, INTERVAL p.duration_days DAY) <= NOW())
          )
    `);
}

module.exports = { autoCompleteExpiredPrescriptions };