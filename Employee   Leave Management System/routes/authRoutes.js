
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// ==========================================
// 1. EMPLOYEE REGISTRATION
// ==========================================

router.post('/register', async (req, res) => {
    let connection;

    try {
        const {
            name,
            email,
            password,
            department,
            designation,
            joining_date
        } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required.'
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid name and email.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters.'
            });
        }

        // Check duplicate email
        const [existing] = await db.promise().query(
            `SELECT user_id FROM users WHERE email = ?
             UNION
             SELECT user_id FROM employees WHERE email = ?`,
            [cleanEmail, cleanEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        connection = await db.promise().getConnection();

        await connection.beginTransaction();

        // Create user account
        const [userResult] = await connection.query(
            `INSERT INTO users (email, password, role)
             VALUES (?, ?, 'employee')`,
            [cleanEmail, hashedPassword]
        );

        const userId = userResult.insertId;

        // Create employee profile
        await connection.query(
            `INSERT INTO employees
            (
                user_id,
                name,
                email,
                department,
                designation,
                joining_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [
                userId,
                cleanName,
                cleanEmail,
                department || null,
                designation || null,
                joining_date || null
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Employee registered successfully!',
            user: {
                id: userId,
                name: cleanName,
                email: cleanEmail,
                role: 'employee'
            }
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        console.error('Registration Error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Registration failed. Please check server terminal.'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// ==========================================
// 2. USER LOGIN
// ==========================================

router.post('/login', async (req, res) => {

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Find user and employee profile
        const [users] = await db.promise().query(
            `SELECT
                u.user_id,
                u.email,
                u.password,
                u.role,
                e.employee_id,
                e.name
             FROM users u
             LEFT JOIN employees e
                ON u.user_id = e.user_id
             WHERE u.email = ?`,
            [cleanEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Employee profile check
        if (user.role === 'employee' && !user.employee_id) {
            return res.status(403).json({
                success: false,
                message: 'Employee profile not found. Contact admin.'
            });
        }

        // Generate JWT
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is missing in .env file.');
        }

        const token = jwt.sign(
            {
                userId: user.user_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        return res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user.user_id,
                employeeId: user.employee_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        console.error('Login Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

module.exports = router;
