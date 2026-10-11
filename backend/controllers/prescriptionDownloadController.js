const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { autoCompleteExpiredPrescriptions } = require('../utils/prescriptionUtils');

const BRAND = '#0f766e', INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0', SOFT = '#f8fafc';
const STATUS = {
    Active:    { label: 'Awaiting pickup', color: '#d97706' },
    Dispensed: { label: 'Taking now',      color: '#0284c7' },
    Completed: { label: 'Completed',       color: '#16a34a' },
    Stopped:   { label: 'Stopped',         color: '#dc2626' }
};
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const docLabel = (n = '') => (/^dr\.?\s/i.test(n) ? n : `Dr. ${n}`);

exports.download = async (req, res) => {
    try {
        const patientId = req.user.userId || req.user.id;
        await autoCompleteExpiredPrescriptions();

        const [rows] = await db.execute(`
            SELECT p.*, patient.name AS patient_name, patient.email AS patient_email,
                   patient.patient_unique_id, patient.allergies,
                   doctor.name AS doctor_name, hospital.name AS hospital_name,
                   (SELECT MAX(r.dispensed_at) FROM pharmacy_records r WHERE r.prescription_id = p.id) AS dispensed_at,
                   (SELECT r.days_supplied FROM pharmacy_records r WHERE r.prescription_id = p.id ORDER BY r.id DESC LIMIT 1) AS days_supplied
            FROM prescriptions p
            JOIN users patient ON patient.id = p.patient_id
            JOIN users doctor ON doctor.id = p.doctor_id
            LEFT JOIN users hospital ON hospital.id = doctor.hospital_id AND hospital.role = 'Hospital'
            WHERE p.id = ? AND p.patient_id = ? AND patient.role = 'Patient'`,
            [req.params.id, patientId]);
        if (!rows.length) return res.status(404).json({ message: 'Prescription not found.' });
        const rx = rows[0];

        const st = STATUS[rx.status] || { label: rx.status, color: MUTED };
        const days = rx.days_supplied ?? rx.duration_days;
        let courseEnd = null;
        if (rx.dispensed_at && days) {
            courseEnd = new Date(rx.dispensed_at);
            courseEnd.setDate(courseEnd.getDate() + Number(days));
        }

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const M = 40, W = doc.page.width - M * 2;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Medinex-Prescription-${rx.id}.pdf"`);
        res.setHeader('Cache-Control', 'no-store');
        doc.pipe(res);

        // ---------- Header band ----------
        doc.rect(0, 0, doc.page.width, 90).fill(BRAND);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(24).text('Medinex', M, 28, { lineBreak: false });
        doc.font('Helvetica').fontSize(11).text('Digital Prescription Record', M, 58, { lineBreak: false });
        doc.fontSize(9).text(`Prescription #${rx.id}`, M, 38, { width: W, align: 'right', lineBreak: false });
        doc.text(`Generated ${fmt(new Date())}`, M, 52, { width: W, align: 'right', lineBreak: false });

        // ---------- Title + status ----------
        let y = 112;
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(rx.medicine_name, M, y, { width: W - 150, lineBreak: false, ellipsis: true });
        doc.roundedRect(M + W - 130, y - 2, 130, 26, 13).fill(st.color);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9.5)
            .text(st.label.toUpperCase(), M + W - 130, y + 6, { width: 130, align: 'center', lineBreak: false });
        doc.fillColor(MUTED).font('Helvetica').fontSize(10)
            .text(`Prescribed on ${new Date(rx.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`, M, y + 28, { lineBreak: false });

        // ---------- Allergy warning ----------
        y += 56;
        if (rx.allergies && rx.allergies.trim()) {
            doc.roundedRect(M, y, W, 30, 6).fillAndStroke('#fef2f2', '#fecaca');
            doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(9)
                .text('KNOWN ALLERGIES:', M + 12, y + 10, { continued: true, lineBreak: false })
                .font('Helvetica').text(`  ${rx.allergies.replace(/\s*\n\s*/g, ', ')}`, { width: W - 24, lineBreak: false, ellipsis: true });
            y += 44;
        }

        // ---------- Two info cards: patient / prescriber ----------
        const half = (W - 12) / 2;
        const infoCard = (x, title, lines) => {
            doc.roundedRect(x, y, half, 92, 8).fillAndStroke(SOFT, LINE);
            doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(8.5).text(title, x + 14, y + 12, { lineBreak: false });
            lines.forEach(([label, value], i) => {
                const ly = y + 30 + i * 20;
                doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label, x + 14, ly, { lineBreak: false });
                doc.fillColor(INK).font('Helvetica-Bold').fontSize(10)
                    .text(String(value || '—'), x + 14, ly + 9, { width: half - 28, lineBreak: false, ellipsis: true });
            });
        };
        infoCard(M, 'PATIENT', [['Name', rx.patient_name], ['Patient ID', rx.patient_unique_id || 'Not assigned']]);
        infoCard(M + half + 12, 'PRESCRIBED BY', [['Doctor', docLabel(rx.doctor_name)], ['Hospital', rx.hospital_name || 'Independent doctor']]);
        y += 108;

        // ---------- Medication details ----------
        doc.roundedRect(M, y, W, 104, 8).lineWidth(0.8).strokeColor(LINE).stroke();
        doc.rect(M, y + 6, 4, 92).fill(st.color);
        doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(8.5).text('MEDICATION', M + 18, y + 12, { lineBreak: false });
        const cell = (x, label, value) => {
            doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label, x, y + 34, { lineBreak: false });
            doc.fillColor(INK).font('Helvetica-Bold').fontSize(12)
                .text(String(value || '—'), x, y + 46, { width: (W - 40) / 3 - 8, lineBreak: false, ellipsis: true });
        };
        const cw = (W - 40) / 3;
        cell(M + 18, 'Dosage', rx.dosage);
        cell(M + 18 + cw, 'Duration', days ? `${days} days` : 'Not specified');
        cell(M + 18 + cw * 2, 'Status', st.label);

        let courseLine = 'Not yet collected from the pharmacy';
        if (rx.dispensed_at) courseLine = `Collected from pharmacy on ${fmt(rx.dispensed_at)}${courseEnd ? `  ·  course ends ${fmt(courseEnd)}` : ''}`;
        else if (rx.status === 'Stopped') courseLine = 'Stopped early by the prescribing doctor';
        doc.moveTo(M + 18, y + 72).lineTo(M + W - 18, y + 72).lineWidth(0.5).strokeColor(LINE).stroke();
        doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(courseLine, M + 18, y + 82, { width: W - 36, lineBreak: false, ellipsis: true });
        y += 124;

        // ---------- Instructions ----------
        const instr = rx.instructions && rx.instructions.trim() ? rx.instructions.trim() : 'No special instructions given.';
        doc.font('Helvetica').fontSize(10.5);
        const instrH = doc.heightOfString(instr, { width: W - 36, lineGap: 2 });
        const boxH = instrH + 44;
        doc.roundedRect(M, y, W, boxH, 8).fillAndStroke('#f0fdfa', '#99f6e4');
        doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(8.5).text('INSTRUCTIONS', M + 18, y + 12, { lineBreak: false });
        doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(instr, M + 18, y + 28, { width: W - 36, lineGap: 2 });
        y += boxH + 20;

        // ---------- Disclaimer + footer ----------
        doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8)
            .text('This is a downloaded copy of the prescription stored in Medinex. It does not add a doctor signature or change the original prescription. Always follow your prescribing doctor\'s and pharmacist\'s instructions.', M, y, { width: W, align: 'center' });

        doc.fillColor(MUTED).font('Helvetica').fontSize(8)
            .text(`Medinex  ·  ${rx.patient_name}  ·  Prescription #${rx.id}`, M, doc.page.height - 48, { width: W, align: 'center', lineBreak: false });

        doc.end();
    } catch (error) {
        console.error('Prescription PDF error:', error);
        if (!res.headersSent) res.status(500).json({ message: 'Could not download the prescription.' });
        else res.end();
    }
};