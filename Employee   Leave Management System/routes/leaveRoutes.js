
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================
// ADMIN MIDDLEWARE
// ==========================================

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required.'
        });
    }
    next();
};

// ==========================================
// GET LOGGED-IN EMPLOYEE
// ==========================================

async function getEmployee(userId) {
    const [employees] = await db.promise().query(
        `SELECT employee_id, user_id, name, email
         FROM employees
         WHERE user_id = ?`,
        [userId]
    );

    return employees[0] || null;
}

// ==========================================
// 1. APPLY FOR LEAVE
// ==========================================

router.post('/apply', authMiddleware, async (req, res) => {
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;

        if (!leaveType || !fromDate || !toDate || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields.'
            });
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format.'
            });
        }

        if (toDate < fromDate) {
            return res.status(400).json({
                success: false,
                message: 'To Date cannot be earlier than From Date.'
            });
        }

        if (typeof reason !== 'string' || reason.trim().length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Reason must contain at least 5 characters.'
            });
        }

        const employee = await getEmployee(req.user.userId);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee profile not found. Please contact admin.'
            });
        }

        const [types] = await db.promise().query(
            `SELECT leave_type_id, type_name
             FROM leave_types
             WHERE LOWER(TRIM(type_name)) = LOWER(TRIM(?))`,
            [leaveType]
        );

        if (types.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected leave type was not found in database.'
            });
        }

        const start = new Date(fromDate + 'T00:00:00Z');
        const end = new Date(toDate + 'T00:00:00Z');

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid leave dates.'
            });
        }

        const totalDays = Math.floor(
            (end.getTime() - start.getTime()) / 86400000
        ) + 1;

        const leaveTypeId = types[0].leave_type_id;
        const year = Number(fromDate.substring(0, 4));

        // Check leave balance
        const [balances] = await db.promise().query(
            `SELECT total_days, used_days
             FROM leave_balances
             WHERE employee_id = ?
             AND leave_type_id = ?
             AND year = ?`,
            [employee.employee_id, leaveTypeId, year]
        );

        if (balances.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Leave balance is not configured for your account. Please contact admin.'
            });
        }

        const remaining =
            Number(balances[0].total_days) -
            Number(balances[0].used_days || 0);

        if (remaining < totalDays) {
            return res.status(400).json({
                success: false,
                message: `Insufficient leave balance. Available days: ${remaining}.`
            });
        }

        // Insert leave request
        const [result] = await db.promise().query(
            `INSERT INTO leave_requests
            (
                employee_id,
                leave_type_id,
                from_date,
                to_date,
                total_days,
                reason,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [
                employee.employee_id,
                leaveTypeId,
                fromDate,
                toDate,
                totalDays,
                reason.trim()
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully!',
            requestId: result.insertId,
            employeeName: employee.name,
            totalDays
        });

    } catch (error) {
        console.error('Leave Application Error:', error);

        return res.status(500).json({
            success: false,
            message: error.sqlMessage || 'Unable to submit leave application.'
        });
    }
});

// ==========================================
// 2. GET MY LEAVE HISTORY
// ==========================================

async function getMyLeaves(req, res) {
    try {
        const employee = await getEmployee(req.user.userId);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee profile not found.'
            });
        }

        const [leaves] = await db.promise().query(
            `SELECT
                lr.request_id,
                e.name AS employee_name,
                lt.type_name AS leave_type,
                lr.from_date,
                lr.to_date,
                lr.total_days,
                lr.reason,
                lr.status,
                lr.created_at
             FROM leave_requests lr
             JOIN employees e
                ON lr.employee_id = e.employee_id
             JOIN leave_types lt
                ON lr.leave_type_id = lt.leave_type_id
             WHERE lr.employee_id = ?
             ORDER BY lr.created_at DESC`,
            [employee.employee_id]
        );

        return res.json({
            success: true,
            leaves
        });

    } catch (error) {
        console.error('Leave History Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load leave history.'
        });
    }
}

router.get('/my', authMiddleware, getMyLeaves);
router.get('/my-requests', authMiddleware, getMyLeaves);

// ==========================================
// 3. GET LEAVE BALANCE
// ==========================================

router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const employee = await getEmployee(req.user.userId);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee profile not found.'
            });
        }

        const [balances] = await db.promise().query(
            `SELECT
                lt.type_name AS leave_type,
                lb.total_days,
                lb.used_days,
                (lb.total_days - COALESCE(lb.used_days, 0))
                    AS available_days
             FROM leave_balances lb
             JOIN leave_types lt
                ON lb.leave_type_id = lt.leave_type_id
             WHERE lb.employee_id = ?
             AND lb.year = YEAR(CURDATE())`,
            [employee.employee_id]
        );

        return res.json({
            success: true,
            balances,
            availableDays: balances.reduce(
                (sum, item) => sum + Number(item.available_days),
                0
            )
        });

    } catch (error) {
        console.error('Leave Balance Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load leave balance.'
        });
    }
});

// ==========================================
// 4. EMPLOYEE DASHBOARD SUMMARY
// ==========================================

router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const employee = await getEmployee(req.user.userId);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee profile not found.'
            });
        }

        const [summary] = await db.promise().query(
            `SELECT
                COUNT(*) AS total_requests,
                COALESCE(SUM(status = 'pending'), 0)
                    AS pending_requests,
                COALESCE(SUM(status = 'approved'), 0)
                    AS approved_requests,
                COALESCE(SUM(status = 'rejected'), 0)
                    AS rejected_requests
             FROM leave_requests
             WHERE employee_id = ?`,
            [employee.employee_id]
        );

        const [recentLeaves] = await db.promise().query(
            `SELECT
                lr.request_id,
                lt.type_name AS leave_type,
                lr.from_date,
                lr.to_date,
                lr.total_days,
                lr.status
             FROM leave_requests lr
             JOIN leave_types lt
                ON lr.leave_type_id = lt.leave_type_id
             WHERE lr.employee_id = ?
             ORDER BY lr.created_at DESC
             LIMIT 5`,
            [employee.employee_id]
        );

        return res.json({
            success: true,
            employee,
            summary: summary[0],
            recentLeaves
        });

    } catch (error) {
        console.error('Dashboard Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load dashboard.'
        });
    }
});

// ==========================================
// 5. ADMIN - GET ALL PENDING REQUESTS
// ==========================================

router.get(
    '/admin/pending',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const [requests] = await db.promise().query(
                `SELECT
                    lr.request_id,
                    e.name AS employee_name,
                    e.email AS employee_email,
                    lt.type_name AS leave_type,
                    lr.from_date,
                    lr.to_date,
                    lr.total_days,
                    lr.reason,
                    lr.status
                 FROM leave_requests lr
                 JOIN employees e
                    ON lr.employee_id = e.employee_id
                 JOIN leave_types lt
                    ON lr.leave_type_id = lt.leave_type_id
                 WHERE lr.status = 'pending'
                 ORDER BY lr.created_at ASC`
            );

            return res.json({
                success: true,
                requests
            });

        } catch (error) {
            console.error('Admin Pending Error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to load pending requests.'
            });
        }
    }
);

// ==========================================
// 6. ADMIN - APPROVE / REJECT LEAVE
// ==========================================

router.post(
    '/admin/decision/:requestId',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {

        let connection;

        try {
            const requestId = Number(req.params.requestId);
            const { decision, comments } = req.body;

            if (!Number.isInteger(requestId) || requestId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request ID.'
                });
            }

            if (!['approved', 'rejected'].includes(decision)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid decision.'
                });
            }

            const adminEmployee = await getEmployee(req.user.userId);

            if (!adminEmployee) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin employee profile not found.'
                });
            }

            connection = await db.promise().getConnection();

            await connection.beginTransaction();

            const [rows] = await connection.query(
                `SELECT
                    request_id,
                    employee_id,
                    leave_type_id,
                    total_days,
                    status,
                    from_date
                 FROM leave_requests
                 WHERE request_id = ?
                 FOR UPDATE`,
                [requestId]
            );

            if (rows.length === 0) {
                throw new Error('Leave request not found.');
            }

            const leave = rows[0];

            if (leave.status !== 'pending') {
                throw new Error('This request has already been processed.');
            }

            if (decision === 'approved') {
                const leaveYear = new Date(leave.from_date)
                    .getFullYear();

                const [balances] = await connection.query(
                    `SELECT
                        balance_id,
                        total_days,
                        used_days
                     FROM leave_balances
                     WHERE employee_id = ?
                     AND leave_type_id = ?
                     AND year = ?
                     FOR UPDATE`,
                    [
                        leave.employee_id,
                        leave.leave_type_id,
                        leaveYear
                    ]
                );

                if (balances.length === 0) {
                    throw new Error('Leave balance record not found.');
                }

                const balance = balances[0];

                const remaining =
                    Number(balance.total_days) -
                    Number(balance.used_days || 0);

                if (remaining < Number(leave.total_days)) {
                    throw new Error('Insufficient leave balance.');
                }

                await connection.query(
                    `UPDATE leave_balances
                     SET used_days = COALESCE(used_days, 0) + ?
                     WHERE balance_id = ?`,
                    [leave.total_days, balance.balance_id]
                );
            }

            await connection.query(
                `UPDATE leave_requests
                 SET status = ?
                 WHERE request_id = ?`,
                [decision, requestId]
            );

            await connection.query(
                `INSERT INTO leave_approvals
                (request_id, manager_id, decision, comments)
                VALUES (?, ?, ?, ?)`,
                [
                    requestId,
                    adminEmployee.employee_id,
                    decision,
                    comments || null
                ]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: `Leave request ${decision} successfully.`
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Leave Decision Error:', error);

            return res.status(400).json({
                success: false,
                message: error.message ||
                    'Unable to process leave decision.'
            });

        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
