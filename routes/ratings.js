const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Submit a rating
router.post('/', authenticateToken, validate({
    score: { required: true },
    comment: { required: true, minLength: 5 }
}), async (req, res) => {
    const { score, comment } = req.body;
    try {
        await db.query('INSERT INTO ratings (user_id, score, comment) VALUES (?, ?, ?)', 
            [req.user.id, score, comment]);
        res.json({ message: 'Rating submitted. Thank you!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get all ratings (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, u.name as user_name, u.email as user_email 
            FROM ratings r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
