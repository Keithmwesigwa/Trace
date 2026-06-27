const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/products — search, filter, paginate
router.get('/', async (req, res) => {
    const { search, category, brand, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];

    if (search) {
        conditions.push('(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) { conditions.push('c.name = ?'); params.push(category); }
    if (brand) { conditions.push('p.brand = ?'); params.push(brand); }
    if (minPrice) { conditions.push('COALESCE(p.price_new, p.price_refurbished, p.price_used) >= ?'); params.push(parseFloat(minPrice)); }
    if (maxPrice) { conditions.push('COALESCE(p.price_new, p.price_refurbished, p.price_used) <= ?'); params.push(parseFloat(maxPrice)); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'COALESCE(p.price_new, p.price_refurbished, p.price_used) ASC';
    else if (sort === 'price_desc') orderBy = 'COALESCE(p.price_new, p.price_refurbished, p.price_used) DESC';
    else if (sort === 'name') orderBy = 'p.name ASC';

    try {
        const [countRows] = await db.query(
            `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`,
            params
        );
        const total = countRows[0].total;

        const [rows] = await db.query(
            `SELECT p.*, c.name as category_name, c.icon as category_icon 
             FROM products p LEFT JOIN categories c ON p.category_id = c.id 
             ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            products: rows.map(p => ({
                ...p,
                specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
                variations: typeof p.variations === 'string' ? JSON.parse(p.variations || '{}') : p.variations,
                images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : p.images
            })),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/products/brands — unique brands
router.get('/brands', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT brand FROM products ORDER BY brand');
        res.json(rows.map(r => r.brand));
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, c.name as category_name, c.icon as category_icon 
             FROM products p LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
        const product = rows[0];
        if (typeof product.specs === 'string') product.specs = JSON.parse(product.specs || '{}');
        if (typeof product.variations === 'string') product.variations = JSON.parse(product.variations || '{}');
        if (typeof product.images === 'string') product.images = JSON.parse(product.images || '[]');

        // Related products
        const [related] = await db.query(
            `SELECT p.*, c.name as category_name FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.category_id = ? AND p.id != ? LIMIT 4`,
            [product.category_id, product.id]
        );
        res.json({ product, related });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/products (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { name, brand, category_id, price_new, price_refurbished, price_used, description, specs, variations, images } = req.body;
    if (!name || !category_id) return res.status(400).json({ error: 'Name and category required.' });
    try {
        const [result] = await db.query(
            'INSERT INTO products (name, brand, category_id, price_new, price_refurbished, price_used, description, specs, variations, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, brand, category_id, price_new || null, price_refurbished || null, price_used || null, description,
                JSON.stringify(specs || {}), JSON.stringify(variations || {}), JSON.stringify(images || [])]
        );
        res.status(201).json({ id: result.insertId, message: 'Product created.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PUT /api/products/:id (admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { name, brand, category_id, price_new, price_refurbished, price_used, description, specs, variations, images } = req.body;
    try {
        await db.query(
            'UPDATE products SET name=?, brand=?, category_id=?, price_new=?, price_refurbished=?, price_used=?, description=?, specs=?, variations=?, images=? WHERE id=?',
            [name, brand, category_id, price_new || null, price_refurbished || null, price_used || null, description,
                JSON.stringify(specs || {}), JSON.stringify(variations || {}), JSON.stringify(images || []), req.params.id]
        );
        res.json({ message: 'Product updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
