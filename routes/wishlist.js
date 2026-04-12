const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Toggle wishlist item
router.post('/', authenticateToken, async (req, res) => {
    const productId = parseInt(req.body.productId);
    if (!productId || isNaN(productId)) return res.status(400).json({ error: 'Valid Product ID required.' });
    
    try {
        console.log(`Wishlist toggle: User ${req.user.id}, Product ${productId}`);
        const [existing] = await db.query('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
        if (existing.length > 0) {
            await db.query('DELETE FROM wishlists WHERE id = ?', [existing[0].id]);
            return res.json({ status: 'removed' });
        } else {
            await db.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
            return res.json({ status: 'added' });
        }
    } catch (err) {
        console.error('Wishlist Error:', err);
        res.status(500).json({ error: 'Server error processing wishlist.' });
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
        res.json(rows.map(p => ({
            ...p,
            specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
            images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : p.images
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
