require('dotenv').config(); // Kích hoạt đọc file .env
const mysql = require('mysql2');

// Dùng pool thay vì single connection để tự động xử lý khi TiDB Cloud đóng kết nối idle
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    // TiDB Cloud requires SSL
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Kiểm tra kết nối ban đầu
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Kết nối thất bại:', err.message);
    } else {
        console.log('✅ Đã nối ống dẫn vào Database an toàn!');
        connection.release();
    }
});

module.exports = db;