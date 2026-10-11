const PDFDocument = require('pdfkit');
const db = require('../config/db');
const { autoCompleteExpiredPrescriptions } = require('../utils/prescriptionUtils');

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const docLabel = (n = '') => (/^dr\.?\s/i.test(n) ? n : `Dr. ${n}`);
const STATUS = {
  Active:    { label: 'Awaiting pickup', color: '#d97706' },
  Dispensed: { label: 'Taking now',      color: '#0284c7' },
  Completed: { label: 'Completed',       color: '#16a34a' },
  Stopped:   { label: 'Stopped',         color: '#dc2626' }
};

exports.downloadAll = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const filter = ['all', 'current', 'history'].includes(req.query.filter) ? req.query.filter : 'all';
    await autoCompleteExpiredPrescriptions();

    const [users] = await db.execute(
      'SELECT name, email, patient_unique_id, allergies FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });
    const patient = users[0];

    let [rows] = await db.execute(`
      SELECT p.id, p.medicine_name, p.dosage, p.instructions, p.status, p.created_at, p.duration_days,
             u.name AS doctor_name, h.name AS hospital_name,
             (SELECT MAX(r.dispensed_at) FROM pharmacy_records r WHERE r.prescription_id = p.id) AS dispensed_at,
             (SELECT r.days_supplied FROM pharmacy_records r WHERE r.prescription_id = p.id ORDER BY r.id DESC LIMIT 1) AS days_supplied
      FROM prescriptions p
      JOIN users u ON p.doctor_id = u.id
      LEFT JOIN users h ON h.id = u.hospital_id AND h.role = 'Hospital'
      WHERE p.patient_id = ? ORDER BY p.created_at DESC, p.id DESC`, [userId]);

    if (filter === 'current') rows = rows.filter(r => r.status === 'Active' || r.status === 'Dispensed');
    if (filter === 'history') rows = rows.filter(r => r.status === 'Completed' || r.status === 'Stopped');

    // ---------- PDF ----------
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const M = 40, W = doc.page.width - M * 2;
    const BRAND = '#0f766e', INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Medinex-Prescription-History.pdf"');
    doc.pipe(res);

    const ensureSpace = (h) => {
      if (doc.y + h > doc.page.height - 60) { doc.addPage(); doc.y = M; }
    };

    // Header band
    doc.rect(0, 0, doc.page.width, 90).fill(BRAND);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(24).text('Medinex', M, 28, { lineBreak: false });
    doc.font('Helvetica').fontSize(11).text('Complete Prescription History', M, 58, { lineBreak: false });
    doc.fontSize(9).text(`Generated ${fmt(new Date())}`, M, 38, { width: W, align: 'right', lineBreak: false });
    doc.text(`Filter: ${filter === 'all' ? 'All prescriptions' : filter === 'current' ? 'Current only' : 'History only'}`,
      M, 52, { width: W, align: 'right', lineBreak: false });

    // Patient box
    let y = 108;
    doc.roundedRect(M, y, W, 66, 8).fillAndStroke('#f8fafc', LINE);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
      .text('PATIENT', M + 14, y + 10, { lineBreak: false })
      .text('EMAIL', M + 200, y + 10, { lineBreak: false })
      .text('PATIENT ID', M + 400, y + 10, { lineBreak: false });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11)
      .text(patient.name, M + 14, y + 22, { width: 180, lineBreak: false })
      .text(patient.email, M + 200, y + 22, { width: 190, lineBreak: false })
      .text(patient.patient_unique_id || 'Not assigned', M + 400, y + 22, { width: 110, lineBreak: false });
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('KNOWN ALLERGIES', M + 14, y + 42, { lineBreak: false });
    doc.fillColor(patient.allergies ? '#dc2626' : INK).font('Helvetica-Bold').fontSize(9)
      .text(patient.allergies ? patient.allergies.replace(/\s*\n\s*/g, ', ') : 'None recorded', M + 100, y + 41, { width: W - 115, lineBreak: false, ellipsis: true });

    // Summary strip
    y += 80;
    const count = (s) => rows.filter(r => s.includes(r.status)).length;
    const stats = [['Total', rows.length], ['Awaiting pickup', count(['Active'])], ['Taking now', count(['Dispensed'])], ['Completed / stopped', count(['Completed', 'Stopped'])]];
    const bw = (W - 30) / 4;
    stats.forEach(([label, n], i) => {
      const x = M + i * (bw + 10);
      doc.roundedRect(x, y, bw, 44, 6).stroke(LINE);
      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16).text(String(n), x + 12, y + 6, { lineBreak: false });
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label, x + 12, y + 28, { lineBreak: false });
    });
    doc.y = y + 62;

    // Prescriptions grouped by date
    if (!rows.length) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(11).text('No prescriptions found for this filter.', M, doc.y, { width: W, align: 'center' });
    }

    let lastDay = null;
    rows.forEach((rx) => {
      const day = new Date(rx.created_at).toDateString();
      const instrH = rx.instructions ? doc.font('Helvetica-Oblique').fontSize(9).heightOfString(`Instructions: ${rx.instructions}`, { width: W - 30 }) + 6 : 0;
      const cardH = 78 + instrH;

      if (day !== lastDay) {
        ensureSpace(30 + cardH);
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(11)
          .text(new Date(rx.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), M, doc.y, { width: W });
        doc.moveTo(M, doc.y + 2).lineTo(M + W, doc.y + 2).strokeColor(BRAND).lineWidth(1).stroke();
        doc.y += 10;
        lastDay = day;
      } else {
        ensureSpace(cardH + 8);
      }

      const top = doc.y, st = STATUS[rx.status] || { label: rx.status, color: MUTED };
      doc.roundedRect(M, top, W, cardH, 6).lineWidth(0.8).strokeColor(LINE).stroke();
      doc.rect(M, top + 4, 4, cardH - 8).fill(st.color);

      doc.fillColor(INK).font('Helvetica-Bold').fontSize(11.5)
        .text(rx.medicine_name, M + 16, top + 10, { width: W - 140, lineBreak: false, ellipsis: true });
      doc.fillColor(st.color).font('Helvetica-Bold').fontSize(9)
        .text(st.label.toUpperCase(), M + W - 120, top + 12, { width: 108, align: 'right', lineBreak: false });

      const duration = (rx.days_supplied ?? rx.duration_days) ? `${rx.days_supplied ?? rx.duration_days} days` : '—';
      doc.fillColor(INK).font('Helvetica').fontSize(9.5)
        .text(`Dosage: ${rx.dosage || '—'}      Duration: ${duration}`, M + 16, top + 28, { width: W - 30, lineBreak: false });
      doc.fillColor(MUTED).fontSize(9)
        .text(`Prescribed by ${docLabel(rx.doctor_name)}${rx.hospital_name ? ' · ' + rx.hospital_name : ''} · ${fmt(rx.created_at)}`, M + 16, top + 43, { width: W - 30, lineBreak: false, ellipsis: true });

      let courseLine = 'Not yet collected from pharmacy';
      if (rx.dispensed_at) {
        const d = rx.days_supplied ?? rx.duration_days;
        const end = d ? new Date(new Date(rx.dispensed_at).setDate(new Date(rx.dispensed_at).getDate() + Number(d))) : null;
        courseLine = `Collected ${fmt(rx.dispensed_at)}${end ? ' · course ends ' + fmt(end) : ''}`;
      } else if (rx.status === 'Stopped') courseLine = 'Stopped early by doctor';
      doc.fillColor(MUTED).text(courseLine, M + 16, top + 57, { width: W - 30, lineBreak: false });

      if (rx.instructions) {
        doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9)
          .text(`Instructions: ${rx.instructions}`, M + 16, top + 74, { width: W - 30 });
      }
      doc.y = top + cardH + 8;
    });

    // Disclaimer + page numbers
    ensureSpace(40);
    doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8)
      .text('This document is a summary generated from your Medinex account and is not a substitute for medical advice. Always follow your doctor\'s and pharmacist\'s instructions.', M, doc.y + 6, { width: W, align: 'center' });

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.page.margins.bottom = 0;           // allows writing in the footer area
      doc.fillColor(MUTED).font('Helvetica').fontSize(8)
        .text(`Medinex · ${patient.name} · Page ${i + 1} of ${range.count}`, M, doc.page.height - 30, { width: W, align: 'center', lineBreak: false });
    }
    doc.end();
  } catch (error) {
    console.error('Full prescription PDF error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Could not generate the PDF.' });
  }
};