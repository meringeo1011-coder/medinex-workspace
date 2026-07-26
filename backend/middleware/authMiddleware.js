const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    // 1. Get the token from the request header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No valid token provided.' });
    }

    // Extract the actual token string
    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify the token using your secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Attach the user data (id, role) to the request object so the next function can use it
        req.user = decoded;
        
        // 4. Move on to the actual route handler
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is invalid or has expired.' });
    }
};