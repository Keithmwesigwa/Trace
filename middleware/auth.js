const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'electronicsfairprice_secret_2024';

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if user still exists (handles stale sessions after DB reset)
        const db = require('../config/db');
        const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'User no longer exists. Please re-login.' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

module.exports = { authenticateToken, requireAdmin, JWT_SECRET };
