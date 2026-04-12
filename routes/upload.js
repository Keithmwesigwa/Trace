const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.post('/', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image provided.' });
    }
    // multer-storage-cloudinary attaches the secure_url string to req.file.path
    res.json({ url: req.file.path });
});

module.exports = router;
