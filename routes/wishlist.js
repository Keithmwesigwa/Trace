const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Toggle wishlist item
router.post('/', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product ID required.' });
    
    try {
        const [existing] = await db.query('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
        if (existing.length > 0) {
            await db.query('DELETE FROM wishlists WHERE id = ?', [existing[0].id]);
            return res.json({ status: 'removed' });
        } else {
            await db.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
            return res.json({ status: 'added' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get user's wishlist
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, c.name as category_name 
            FROM wishlists w
            JOIN products p ON w.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE w.user_id = ?
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
