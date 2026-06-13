const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireVendor } = require('../middleware/auth');

// POST /api/orders (User places an order)
router.post('/', authenticateToken, async (req, res) => {
    const { product_id, latitude, longitude } = req.body;
    if (!product_id || !latitude || !longitude) {
        return res.status(400).json({ error: 'Product ID and location required.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO orders (user_id, product_id, user_lat, user_lng, status) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, product_id, latitude, longitude, 'pending']
        );
        res.status(201).json({ message: 'Order placed, broadcasting to vendors...', order_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/orders/nearby (Vendor checks for incoming orders)
router.get('/nearby', authenticateToken, requireVendor, async (req, res) => {
    try {
        // Get vendor location
        const [vRow] = await db.query('SELECT latitude, longitude FROM users WHERE id = ?', [req.user.id]);
        if (!vRow.length || !vRow[0].latitude) return res.status(400).json({ error: 'Vendor location not set.' });
        const { latitude: vLat, longitude: vLng } = vRow[0];

        // Haversine formula for distance in km
        const [orders] = await db.query(`
            SELECT o.*, p.name as product_name, p.brand, p.price, 
                   u.name as customer_name,
                   (6371 * acos(cos(radians(?)) * cos(radians(o.user_lat)) 
                   * cos(radians(o.user_lng) - radians(?)) + sin(radians(?)) 
                   * sin(radians(o.user_lat)))) AS distance
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN users u ON o.user_id = u.id
            JOIN vendor_inventory vi ON o.product_id = vi.product_id AND vi.vendor_id = ?
            WHERE o.status = 'pending'
            HAVING distance < 50 -- 50km radius
            ORDER BY distance ASC
        `, [vLat, vLng, vLat, req.user.id]);

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/orders/:id/accept (Vendor accepts order)
router.post('/:id/accept', authenticateToken, requireVendor, async (req, res) => {
    try {
        // We use a transaction or simply rely on row update count to prevent race conditions
        const [result] = await db.query(
            "UPDATE orders SET status = 'accepted', vendor_id = ? WHERE id = ? AND status = 'pending'",
            [req.user.id, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: 'Order already accepted by another vendor or does not exist.' });
        }

        res.json({ message: 'Order accepted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/orders/my-orders (Users and Vendors view their history)
router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const isVendor = req.user.role === 'vendor';
        const condition = isVendor ? 'o.vendor_id = ?' : 'o.user_id = ?';
        
        const [orders] = await db.query(`
            SELECT o.*, p.name as product_name, p.price, p.images,
                   c.name as customer_name, c.contact as customer_contact,
                   v.name as vendor_name, v.contact as vendor_contact
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN users c ON o.user_id = c.id
            LEFT JOIN users v ON o.vendor_id = v.id
            WHERE ${condition}
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        res.json(orders.map(o => ({
            ...o,
            images: typeof o.images === 'string' ? JSON.parse(o.images || '[]') : o.images
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
