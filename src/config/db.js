require('dotenv').config(); // Kích hoạt đọc file .env
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    // TiDB Cloud Serverless requires SSL
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

db.connect(err => {
    if (err) {
        console.error('❌ Kết nối thất bại:', err.message);
    } else {
        console.log('✅ Đã nối ống dẫn vào Database an toàn!');
    }
});

module.exports = db;