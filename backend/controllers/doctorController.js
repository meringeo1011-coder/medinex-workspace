const db = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { autoCompleteExpiredPrescriptions } = require('../utils/prescriptionUtils');
// 1. Search Patient by Unique ID
exports.searchPatient = async (req, res) => {
    try {
        const { uniqueId } = req.params;
        
        // Find the patient
        const [patients] = await db.execute(
            'SELECT id, name, email, patient_unique_id, allergies FROM users WHERE patient_unique_id = ? AND role = "Patient"',
            [uniqueId]
        );
        
        if (patients.length === 0) return res.status(404).json({ message: 'Patient not found. Check the ID.' });
        
        const patient = patients[0];
        
        // Find their uploaded lab reports
        const [reports] = await db.execute(
            'SELECT id, file_name, file_path, uploaded_at FROM lab_reports WHERE patient_id = ? ORDER BY uploaded_at DESC',
            [patient.id]
        );
        await autoCompleteExpiredPrescriptions();

        // Fetch their Prescription History
        const [prescriptions] = await db.execute(`
            SELECT p.id, p.medicine_name, p.dosage, p.instructions, p.status, p.created_at, u.name AS doctor_name 
            FROM prescriptions p
            JOIN users u ON p.doctor_id = u.id
            WHERE p.patient_id = ?
            ORDER BY p.created_at DESC
        `, [patient.id]);
        
        // Send everything back to React!
        res.status(200).json({ profile: patient, reports, prescriptions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while searching for patient.' });
    }
};

// 2. Write a New Prescription
exports.addPrescription = async (req, res) => {
    try {
        const doctorId = req.user.userId || req.user.id;
        const { patient_id, medicine_name, dosage, instructions, duration_days } = req.body;
        
        const hospitalName = "Medinex Partner Network"; 

        await db.execute(
            'INSERT INTO prescriptions (patient_id, doctor_id, medicine_name, dosage, duration_days, instructions, status, hospital_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [patient_id, doctorId, medicine_name, dosage, duration_days || null, instructions, 'Active', hospitalName]
        );
        
        res.status(201).json({ message: 'Prescription securely added to patient record!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding prescription.' });
    }
};

// 3. Update Prescription Status
exports.updatePrescriptionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Active', 'Completed', or 'Stopped'
        
        await db.execute(
            'UPDATE prescriptions SET status = ? WHERE id = ?',
            [status, id]
        );
        
        res.status(200).json({ message: `Medication marked as ${status}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating medication status.' });
    }
};

// 4. AI Interaction Checker
exports.checkInteraction = async (req, res) => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const { currentMedicines, newMedicine } = req.body;

        if (!newMedicine) {
            return res.status(400).json({ message: 'New medicine name is required.' });
        }

        // FIXED: Explicitly using gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });      
 const prompt = `
    Act as a strict clinical pharmacist. 
    A patient is currently taking these medications: ${currentMedicines.length > 0 ? currentMedicines.join(', ') : 'None'}.
    The doctor is planning to prescribe a new medication: ${newMedicine}.
    Check for any known severe or moderate drug-drug interactions, duplicate therapies (like prescribing multiple antibiotics), or redundant treatments. 
    If it is generally safe and logical, reply with EXACTLY the word: "SAFE". 
    If there is an interaction or duplicate therapy warning, reply with a brief 1-2 sentence warning explaining the risk. Do not write a long essay.
`;

        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text().trim();

        if (aiResponse.toUpperCase().includes('SAFE') && aiResponse.length < 10) {
            res.status(200).json({ status: 'safe', message: 'No major interactions detected.' });
        } else {
            res.status(200).json({ status: 'warning', message: aiResponse });
        }

    } catch (error) {
        console.error("AI Checker Error:", error);
        res.status(500).json({ message: 'Failed to check interaction.' });
    }
};