const db = require('../config/db');
const Student = require('../../models/Student');
const { getSpecializedUser } = require('./helper');

exports.getHistory = async (req, res) => {
    const sql = `
        SELECT e.EventId as event_id, e.EventName as title, e.Location as location, e.DateTime as start_time, e.Description as description,
        a.CheckInTime, a.AttendanceId,
        c.CertificateUrl as certificate_url, f.FeedbackId as has_feedback
        FROM registration r
        JOIN event e ON r.EventId = e.EventId
        LEFT JOIN attendance a ON r.RegistrationId = a.RegistrationId
        LEFT JOIN certificate c ON (c.EventId = e.EventId AND c.StudentId = r.StudentId)
        LEFT JOIN feedback f ON (f.EventId = e.EventId AND f.StudentId = r.StudentId)
        WHERE r.StudentId = ?
        ORDER BY e.DateTime DESC
    `;
    try {
        const [results] = await db.promise().query(sql, [req.params.id]);
        const processed = results.map(row => {
            let points = 0;
            let status = 'Đã đăng ký (Chờ diễn ra)';
            let endTime = null;

            if (row.description && row.description.startsWith('{')) {
                try {
                    const meta = JSON.parse(row.description);
                    points = meta.ecc_points_volunteer || 0;
                    endTime = meta.end_time;
                } catch (e) { }
            }

            if (row.AttendanceId) {
                status = 'Đã điểm danh';
            } else if (endTime && new Date() > new Date(endTime)) {
                status = 'Vắng mặt';
            } else if (!endTime && new Date() > new Date(row.start_time)) {
                status = 'Vắng mặt';
            }

            return {
                ...row,
                ecc_points_volunteer: points,
                attendance_status: status
            };
        });
        res.json(processed);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy lịch sử" });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await getSpecializedUser(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const profile = user.viewProfile();
        if (user.role === 'STUDENT') {
            profile.extracurricular_points = await Student.getTotalPoints(req.params.id);
        }

        res.json(profile);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await getSpecializedUser(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        await user.updateProfile(req.body);
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error(`[Profile POST /${req.params.id}] Error:`, err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
