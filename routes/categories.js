const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/categories
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/categories (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required.' });
    try {
        const [result] = await db.query('INSERT INTO categories (name, icon) VALUES (?, ?)', [name, icon || '📦']);
        res.status(201).json({ id: result.insertId, name, icon });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
