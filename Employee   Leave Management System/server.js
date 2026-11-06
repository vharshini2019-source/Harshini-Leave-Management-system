
const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Harshini Employee Leave Management System is running!'
    });
});

// Frontend Pages
const pages = [
    'login',
    'register',
    'dashboard',
    'apply-leave',
    'my-leaves',
    'leave-balance',
    'admin-dashboard'
];

pages.forEach((page) => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(
            path.join(__dirname, 'public', `${page}.html`)
        );
    });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

