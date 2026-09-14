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
        const [prescriptions] = await db.execute(`
            SELECT p.id, p.medicine_name, p.dosage, p.instructions, p.status, p.hospital_name, p.created_at, u.name AS doctor_name 
            FROM prescriptions p JOIN users u ON p.doctor_id = u.id WHERE p.patient_id = ? ORDER BY p.created_at DESC
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

// 6. Get Hospitals List for Complaints
exports.getHospitalsList = async (req, res) => {
    try {
        const [hospitals] = await db.execute('SELECT id, name FROM users WHERE role = "Hospital" AND approval_status = "Approved"');
        res.status(200).json(hospitals);
    } catch (error) {
        console.error("Error fetching hospitals:", error);
        res.status(500).json({ message: 'Failed to load hospitals.' });
    }
};

// 7. Submit Complaint
exports.submitComplaint = async (req, res) => {
    try {
        const patientId = req.user.userId || req.user.id;
        const { hospital_id, doctor_name, complaint_text } = req.body;

        if (!hospital_id || !doctor_name || !complaint_text) {
            return res.status(400).json({ message: 'Please fill in all fields.' });
        }

        await db.execute(
            'INSERT INTO complaints (patient_id, hospital_id, doctor_name, complaint_text, status) VALUES (?, ?, ?, ?, "Pending")',
            [patientId, hospital_id, doctor_name, complaint_text]
        );

        res.status(201).json({ message: 'Complaint submitted successfully. The hospital administration has been notified.' });
    } catch (error) {
        console.error("Complaint Error:", error);
        res.status(500).json({ message: 'Failed to submit complaint.' });
    }
};

// 8. Get Patient Complaints
exports.getMyComplaints = async (req, res) => {
    try {
        const patientId = req.user.userId || req.user.id;
        const [complaints] = await db.execute(
            `SELECT c.*, u.name AS hospital_name 
             FROM complaints c 
             JOIN users u ON c.hospital_id = u.id 
             WHERE c.patient_id = ? 
             ORDER BY c.created_at DESC`,
            [patientId]
        );
        res.status(200).json(complaints);
    } catch (error) {
        console.error("DEBUG: Error fetching patient complaints:", error);
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