const db = require('../config/db');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { autoCompleteExpiredPrescriptions } = require('../utils/prescriptionUtils');

// 1. Get Profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const [users] = await db.execute(
            'SELECT id, name, email, patient_unique_id, allergies FROM users WHERE id = ?',
            [userId]
        );
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(users[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

// 2. Get Prescriptions
exports.getPatientPrescriptions = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        await autoCompleteExpiredPrescriptions();
        // hospital_id / hospital_name come from the prescribing doctor's hospital,
        // so a complaint can be routed to the right hospital automatically.
        const [prescriptions] = await db.execute(`
            SELECT p.id, p.medicine_name, p.dosage, p.instructions, p.status, p.created_at, p.duration_days,
                   p.doctor_id, u.name AS doctor_name,
                   u.hospital_id, h.name AS hospital_name,
                   (SELECT MAX(r.dispensed_at) FROM pharmacy_records r WHERE r.prescription_id = p.id) AS dispensed_at,
                   (SELECT r.days_supplied FROM pharmacy_records r WHERE r.prescription_id = p.id ORDER BY r.id DESC LIMIT 1) AS days_supplied
            FROM prescriptions p
            JOIN users u ON p.doctor_id = u.id
            LEFT JOIN users h ON h.id = u.hospital_id AND h.role = 'Hospital'
            WHERE p.patient_id = ? ORDER BY p.created_at DESC
        `, [userId]);
        res.status(200).json(prescriptions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching prescriptions' });
    }
};

// 3. Update Allergies
exports.updateAllergies = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { allergies } = req.body;
        await db.execute('UPDATE users SET allergies = ? WHERE id = ?', [allergies, userId]);
        res.status(200).json({ message: 'Allergies updated successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating allergies.' });
    }
};

// 4. Upload Lab Report — now reads the file and generates an AI summary
exports.uploadLabReport = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

        const fileName = req.file.originalname;
        const filePath = req.file.filename;
        let summary = null;

        try {
            const fileBuffer = fs.readFileSync(req.file.path);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

            const result = await model.generateContent([
                {
                    inlineData: {
                        data: fileBuffer.toString('base64'),
                        mimeType: req.file.mimetype
                    }
                },
                {
                    text: 'You are a clinical assistant. Read this medical/lab document and write a short, plain-language summary (max 100 words) for the patient: what the document is, key results, and anything flagged as abnormal. If you cannot read the file content, say so plainly.'
                }
            ]);
            summary = result.response.text().trim();
        } catch (aiError) {
            console.error("Report summarization failed:", aiError.message);
            summary = 'Automatic summary unavailable for this file.';
        }

        await db.execute(
            'INSERT INTO lab_reports (patient_id, file_name, file_path, summary) VALUES (?, ?, ?, ?)',
            [userId, fileName, filePath, summary]
        );
        res.status(201).json({ message: 'Report uploaded successfully!', summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during upload.' });
    }
};

// 5. Get Lab Reports (includes AI summary)
exports.getLabReports = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const [reports] = await db.execute(
            'SELECT id, file_name, file_path, summary, uploaded_at FROM lab_reports WHERE patient_id = ? ORDER BY uploaded_at DESC',
            [userId]
        );
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lab reports.' });
    }
};

// 7. Submit Complaint -- raised about one of the patient's OWN prescriptions.
//    The hospital and doctor are NOT sent by the browser: they are looked up from
//    the prescription (prescription -> doctor -> hospital), so a complaint always
//    reaches the hospital that issued it.
exports.submitComplaint = async (req, res) => {
    try {
        const patientId = req.user.userId || req.user.id;
        const { prescription_id, complaint_text } = req.body;

        if (!prescription_id || !complaint_text || !complaint_text.trim()) {
            return res.status(400).json({ message: 'Please choose a prescription and describe the issue.' });
        }

        // Prescription must belong to this patient; fetch its doctor + hospital
        const [rx] = await db.execute(
            `SELECT p.id, u.name AS doctor_name, u.hospital_id, h.name AS hospital_name
             FROM prescriptions p
             JOIN users u ON u.id = p.doctor_id
             LEFT JOIN users h ON h.id = u.hospital_id AND h.role = 'Hospital'
             WHERE p.id = ? AND p.patient_id = ?`,
            [prescription_id, patientId]
        );
        if (rx.length === 0) {
            return res.status(403).json({ message: 'You can only file a complaint about your own prescriptions.' });
        }
        if (!rx[0].hospital_id || !rx[0].hospital_name) {
            return res.status(400).json({ message: 'The doctor who wrote this prescription is not linked to a hospital yet, so the complaint cannot be routed.' });
        }

        // Stop the same prescription being reported twice while still open
        const [dupes] = await db.execute(
            'SELECT id FROM complaints WHERE patient_id = ? AND prescription_id = ? AND status <> "Resolved"',
            [patientId, prescription_id]
        );
        if (dupes.length > 0) {
            return res.status(409).json({ message: 'You already have an open complaint for this prescription.' });
        }

        const [me] = await db.execute('SELECT name FROM users WHERE id = ?', [patientId]);

        await db.execute(
            'INSERT INTO complaints (patient_id, patient_name, hospital_id, prescription_id, doctor_name, complaint_text, status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
            [patientId, me[0]?.name || '', rx[0].hospital_id, prescription_id, rx[0].doctor_name, complaint_text.trim()]
        );

        res.status(201).json({ message: `Complaint submitted. ${rx[0].hospital_name} has been notified.` });
    } catch (error) {
        console.error("Complaint Error:", error);
        res.status(500).json({ message: 'Failed to submit complaint.' });
    }
};

// 8. Get Patient Complaints (with the prescription each one is about)
exports.getMyComplaints = async (req, res) => {
    try {
        const patientId = req.user.userId || req.user.id;
        const [complaints] = await db.execute(
            `SELECT c.id, c.hospital_id, c.prescription_id, c.doctor_name, c.complaint_text, c.status, c.created_at,
                    u.name AS hospital_name, p.medicine_name, p.created_at AS prescribed_on
             FROM complaints c
             JOIN users u ON c.hospital_id = u.id
             LEFT JOIN prescriptions p ON c.prescription_id = p.id
             WHERE c.patient_id = ?
             ORDER BY c.created_at DESC`,
            [patientId]
        );
        res.status(200).json(complaints);
    } catch (error) {
        console.error("Error fetching patient complaints:", error);
        res.status(500).json({ message: 'Failed to load your complaints.' });
    }
};

// 9. Medinex AI Assistant Chatbot
exports.askAIAssistant = async (req, res) => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const { question, patientContext } = req.body;

        if (!question) return res.status(400).json({ message: 'Question required.' });

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = `
        You are "Medinex Assistant", a helpful, empathetic, and professional AI embedded in a patient's healthcare portal. 
        
        PATIENT MEDICAL CONTEXT:
        The patient's current active medications are: ${patientContext || 'None on record'}.
        
        The patient is asking you this question: "${question}"
        
        RULES:
        1. Keep answers concise, easy to read, and format nicely using bullet points if needed.
        2. You may answer questions about their specific medicines, storage, side effects, and wellness.
        3. STRICT RULE: You are not a doctor. If they ask for a diagnosis, politely tell them to consult their doctor.
        `;

        const result = await model.generateContent(prompt);
        res.status(200).json({ reply: result.response.text() });

    } catch (error) {
        console.error("AI Chatbot Error:", error);
        res.status(500).json({ message: 'AI Assistant is currently resting. Try again later.' });
    }
};