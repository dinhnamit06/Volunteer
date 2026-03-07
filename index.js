require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

const apiRoutes = require('./src/routes/index');

app.use(cors());
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
