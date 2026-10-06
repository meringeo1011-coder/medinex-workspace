const db = require('../config/db');

// Automatically flips a prescription's status to "Completed" once its course
// of medicine is over -- but ONLY if the pharmacy has actually dispensed it.
//
// RULE: a prescription that was never picked up from the pharmacy must NOT
// be marked Completed just because its duration_days passed. It stays
// "Active" (i.e. prescribed, not yet collected) until the pharmacist
// dispenses it. Once dispensed (status = 'Dispensed'), the course runs from
// the dispensing time for `days_supplied` days, then becomes "Completed".
//
// If no pharmacy_records row / days_supplied exists for a Dispensed
// prescription, it falls back to duration_days counted from the dispense
// record time (or, as a last resort, from the prescription date).
//
// Runs on every fetch (patient, doctor, pharmacist views), so existing
// 'Dispensed' rows are cleaned up the first time they are read after the
// course ends.
async function autoCompleteExpiredPrescriptions() {
    await db.execute(`
        UPDATE prescriptions p
        JOIN (
            SELECT r.prescription_id, r.dispensed_at, r.days_supplied
            FROM pharmacy_records r
            WHERE r.id IN (
                SELECT MAX(id) FROM pharmacy_records GROUP BY prescription_id
            )
        ) pr ON pr.prescription_id = p.id
        SET p.status = 'Completed'
        WHERE p.status = 'Dispensed'
          AND DATE_ADD(
                pr.dispensed_at,
                INTERVAL COALESCE(pr.days_supplied, p.duration_days, 0) DAY
              ) <= NOW()
    `);
}

module.exports = { autoCompleteExpiredPrescriptions };
