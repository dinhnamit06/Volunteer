const db = require('../config/db');
const User = require('../../models/User');
const Student = require('../../models/Student');
const Staff = require('../../models/Staff');

// Helper to get specialized User object (Moved from index.js)
async function getSpecializedUser(userId) {
    const parsedId = parseInt(userId);
    if (isNaN(parsedId)) return null;

    const [rows] = await db.promise().query(
        "SELECT u.*, s.Major, s.Class FROM user u LEFT JOIN student s ON u.UserId = s.UserId WHERE u.UserId = ?",
        [parsedId]
    );
    if (rows.length === 0) return null;

    const [staffRows] = await db.promise().query("SELECT * FROM staff WHERE UserId = ?", [parsedId]);
    if (staffRows.length > 0) {
        const data = rows[0];
        data.role = 'STAFF';
        return new Staff(data);
    }
    const studentData = rows[0];
    studentData.role = 'STUDENT';
    return new Student(studentData);
}

exports.register = async (req, res) => {
    const { email, password, name, student_id, faculty, major, class_name, dob, phone, address } = req.body;

    if (!email || !email.endsWith('@st.phenikaa-uni.edu.vn')) {
        return res.status(400).json({ message: "Vui lòng sử dụng email Phenikaa (@st.phenikaa-uni.edu.vn)" });
    }

    try {
        const autoSid = email.split('@')[0];
        const msvInt = parseInt(autoSid);
        const finalUserId = !isNaN(msvInt) ? msvInt : Math.floor(Math.random() * 90000000) + 10000000;

        await db.promise().query("START TRANSACTION");

        await db.promise().query(
            "INSERT INTO user (UserId, Email, Password, Name, Dob, Phone, Address) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [finalUserId, email, password, name, dob || null, phone || '', address || '']
        );

        await db.promise().query(
            "INSERT INTO student (UserId, Major, Class) VALUES (?, ?, ?)",
            [finalUserId, major || '', class_name || '']
        );

        await db.promise().query("COMMIT");
        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (err) {
        if (db.promise().query) await db.promise().query("ROLLBACK").catch(() => { });
        console.error("Register Error:", err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Email hoặc mã sinh viên đã tồn tại!" });
        res.status(500).json({ message: "Lỗi hệ thống khi đăng ký", error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const userData = await User.login(email, password);
        if (userData) {
            res.json({ user: userData });
        } else {
            res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
        }
    } catch (err) {
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.googleLogin = async (req, res) => {
    const { email, name } = req.body;

    if (!email || !email.endsWith('@st.phenikaa-uni.edu.vn')) {
        return res.status(400).json({ message: "Vui lòng sử dụng email của trường (@st.phenikaa-uni.edu.vn) để đăng nhập." });
    }

    try {
        const [users] = await db.promise().query("SELECT * FROM user WHERE Email = ?", [email]);

        let userData;
        if (users.length > 0) {
            const [staffRows] = await db.promise().query("SELECT * FROM staff WHERE UserId = ?", [users[0].UserId]);
            let role = staffRows.length > 0 ? 'STAFF' : 'STUDENT';
            userData = {
                id: users[0].UserId,
                email: users[0].Email,
                name: users[0].Name,
                role: role
            };
        } else {
            const autoSid = email.split('@')[0];
            const msvInt = parseInt(autoSid);

            await db.promise().query("START TRANSACTION");

            const autoPass = Math.random().toString(36).slice(-10);
            const finalUserId = !isNaN(msvInt) ? msvInt : Math.floor(Math.random() * 90000000) + 10000000;

            await db.promise().query(
                "INSERT INTO user (UserId, Email, Password, Name, Dob, Phone, Address) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [finalUserId, email, autoPass, name || autoSid, null, '', '']
            );

            await db.promise().query(
                "INSERT INTO student (UserId, Major, Class) VALUES (?, ?, ?)",
                [finalUserId, '', '']
            );

            await db.promise().query("COMMIT");

            userData = {
                id: finalUserId,
                email: email,
                name: name || autoSid,
                role: 'STUDENT'
            };
        }

        res.json({
            message: "Google Login Successful",
            user: userData
        });

    } catch (err) {
        if (db.promise().query) await db.promise().query("ROLLBACK").catch(() => { });
        console.error("Google Login Error:", err);
        res.status(500).json({ message: "Lỗi hệ thống khi đăng nhập Google", error: err.message });
    }
};
