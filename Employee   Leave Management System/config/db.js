
const mysql = require('mysql2');
const path = require('path');

require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

console.log("DB USER:", process.env.DB_USER);
console.log("DB NAME:", process.env.DB_NAME);
console.log("DB PASSWORD LOADED:", Boolean(process.env.DB_PASSWORD));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    waitForConnections: true,
    connectionLimit: 10
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('MySQL Connection Failed:', err.message);
    } else {
        console.log('MySQL Database Connected Successfully!');
        connection.release();
    }
});

module.exports = db;
