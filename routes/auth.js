const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Register
router.post('/register', validate({
    name: { required: true, minLength: 2 },
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
    contact: { required: true, minLength: 8, maxLength: 20 }
}), async (req, res) => {
    const { name, email, password, contact, role, latitude, longitude } = req.body;
    const finalRole = role === 'vendor' ? 'vendor' : 'user';
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(409).json({ error: 'Email already registered.' });
        
        const hashed = await bcrypt.hash(password, 12);
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, contact, role, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashed, contact, finalRole, lat, lng]
        );
        
        const userObj = { id: result.insertId, name, email, role: finalRole };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: userObj });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required.' });
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get current user
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
