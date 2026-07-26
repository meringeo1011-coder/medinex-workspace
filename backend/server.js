require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./config/db'); 
const authMiddleware = require('./middleware/authMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes'); 

const app = express();

// 1. Security Headers & OPEN CORS
app.use(helmet());
app.use(cors());

// 2. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// 3. Body Parser & Static Files
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/pharmacist', require('./routes/pharmacistRoutes')); // Uncomment when Pharmacist file exists

// 5. Test Routes
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Medinex API is running securely...' });
});

app.get('/api/dashboard/data', authMiddleware, (req, res) => {
    res.status(200).json({ 
        message: 'Secure connection established!', 
        userData: req.user 
    });
});

// 6. Server Initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is successfully running on port ${PORT}`);
});