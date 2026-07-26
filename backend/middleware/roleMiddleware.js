// This middleware checks if the user's role matches the required role
module.exports = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
        }
        next(); // User has the correct role, proceed to the route
    };
};