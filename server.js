require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with automatic .html extension resolution
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    index: 'index.html'
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/upload', require('./routes/upload'));

// Fallback to index.html for unknown HTML/Navigation requests (SPA support)
app.get('*', (req, res) => {
    // If it's a request for a file (like an image or JS) that's missing, return 404
    if (req.path.includes('.')) {
        return res.status(404).json({ error: 'File Not Found' });
    }
    
    // For navigation requests, fallback to index.html
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'Not Found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
