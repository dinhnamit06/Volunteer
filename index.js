require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

const apiRoutes = require('./src/routes/index');

app.use(cors({
    origin: [
        'http://localhost:5000',
        'http://localhost:5500',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:5500',
        'https://dinhnamit06.github.io',
        'https://jade-treacle-32d00e.netlify.app',
        'https://volunteer-2.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('frontend'));

// Basic logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
