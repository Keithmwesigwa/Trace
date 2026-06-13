const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireVendor } = require('../middleware/auth');

// GET /api/vendor/inventory
router.get('/inventory', authenticateToken, requireVendor, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT vi.id as inventory_id, vi.stock, p.*, c.name as category_name
            FROM vendor_inventory vi
            JOIN products p ON vi.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE vi.vendor_id = ?
        `, [req.user.id]);
        
        res.json(rows.map(r => ({
            ...r,
            specs: typeof r.specs === 'string' ? JSON.parse(r.specs || '{}') : r.specs,
            images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : r.images
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/vendor/inventory
router.post('/inventory', authenticateToken, requireVendor, async (req, res) => {
    const { product_id, stock } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Product ID required' });
    
    try {
        await db.query(
            'INSERT INTO vendor_inventory (vendor_id, product_id, stock) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE stock = ?',
            [req.user.id, product_id, stock || 1, stock || 1]
        );
        res.json({ message: 'Added to inventory' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/vendor/inventory/:productId
router.delete('/inventory/:productId', authenticateToken, requireVendor, async (req, res) => {
    try {
        await db.query('DELETE FROM vendor_inventory WHERE vendor_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
        res.json({ message: 'Removed from inventory' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
