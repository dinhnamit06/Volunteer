const db = require('../config/db');
const Student = require('../../models/Student');
const { getSpecializedUser, parseSemesterDates } = require('./helper');

exports.getDashboardStats = async (req, res) => {
    try {
        const { semester, year } = req.query;
        let eventSql = "SELECT COUNT(*) as total_events FROM event";
        let eventParams = [];
        let userSql = "SELECT COUNT(*) as total_users FROM student";

        if (semester && year && semester !== 'All' && year !== 'All') {
            const dates = parseSemesterDates(semester, year);
            if (dates) {
                eventSql += " WHERE DateTime >= ? AND DateTime <= ?";
                eventParams.push(dates.startDate, dates.endDate);
            }
        }

        const [eResults] = await db.promise().query(eventSql, eventParams);
        const [uResults] = await db.promise().query(userSql);

        res.json({
            events: { total_events: eResults[0].total_events, upcoming_events: 0 },
            students: { total_volunteers: uResults[0].total_users, total_registrations: 0 }
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi" });
    }
};

exports.getStudents = async (req, res) => {
    try {
        const { semester, year } = req.query;
        let startDate = null;
        let endDate = null;

        if (semester && year && semester !== 'All' && year !== 'All') {
            const dates = parseSemesterDates(semester, year);
            if (dates) {
                startDate = dates.startDate;
                endDate = dates.endDate;
            }
        }

        const sql = `
            SELECT u.UserId as id, u.Name as name, u.Email as email, s.Major as major, s.Class as class,
            (SELECT COUNT(*) FROM staff st WHERE st.UserId = u.UserId) as is_staff
            FROM user u
            LEFT JOIN student s ON u.UserId = s.UserId
        `;
        const [users] = await db.promise().query(sql);

        const result = await Promise.all(users.map(async (u) => {
            const role = u.is_staff ? 'STAFF' : 'STUDENT';
            const points = (role === 'STUDENT') ? await Student.getTotalPoints(u.id, startDate, endDate) : 0;

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                major: u.major || '',
                class: u.class || '',
                role,
                msv: u.id,
                points
            };
        }));

        res.json(result);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: "Lỗi tải danh sách người dùng", error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { requester_id, target_user_id } = req.body;
    try {
        const requester = await getSpecializedUser(requester_id);
        if (!requester || !['STAFF', 'SCHOOL_STAFF'].includes(requester.role)) {
            return res.status(403).json({ message: "Chỉ Staff cấp trường mới có quyền này" });
        }

        await db.promise().query("DELETE FROM user WHERE UserId = ?", [target_user_id]);
        res.json({ message: "Xoá tài khoản thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi xoá tài khoản", error: err.message });
    }
};

exports.addPoints = async (req, res) => {
    const { requester_id, amount, reason } = req.body;
    const studentId = req.params.id;

    try {
        const staff = await getSpecializedUser(requester_id);
        if (!staff || (staff.role !== 'SCHOOL_STAFF' && staff.role !== 'REGULAR_STAFF' && staff.role !== 'STAFF')) {
            return res.status(403).json({ message: "Không có quyền thực hiện" });
        }

        const student = await getSpecializedUser(studentId);
        if (!student || student.role !== 'STUDENT') {
            return res.status(400).json({ message: "Chỉ cộng điểm cho tình nguyện viên/sinh viên" });
        }

        if (!amount || isNaN(amount) || amount == 0) {
            return res.status(400).json({ message: "Số điểm không hợp lệ" });
        }

        const VIRTUAL_EVENT_NAME = 'Hệ thống Quản lý điểm';
        let [events] = await db.promise().query("SELECT EventId FROM event WHERE EventName = ? LIMIT 1", [VIRTUAL_EVENT_NAME]);
        let eventId;

        if (events.length === 0) {
            const [result] = await db.promise().query(
                "INSERT INTO event (EventName, DateTime, Location, Description, Status, StaffId) VALUES (?, NOW(), 'System', 'Hệ thống quản lý điểm ảo', 'COMPLETED', ?)",
                [VIRTUAL_EVENT_NAME, requester_id]
            );
            eventId = result.insertId;
        } else {
            eventId = events[0].EventId;
        }

        const commentData = {
            amount: parseFloat(amount),
            reason: reason || "Cộng điểm ngoại khoá",
            staff_id: requester_id,
            staff_name: staff.name
        };

        const feedbackId = 'PT_' + Math.random().toString(36).substring(7).toUpperCase();
        await db.promise().query(
            "INSERT INTO feedback (FeedbackId, Rating, Comment, SubmittedDate, StudentId, EventId) VALUES (?, ?, ?, NOW(), ?, ?)",
            [feedbackId, 0, JSON.stringify(commentData), studentId, eventId]
        );

        res.json({ message: "Cập nhật điểm thành công!" });
    } catch (err) {
        console.error("Add Points Error:", err);
        res.status(500).json({ message: "Lỗi hệ thống", error: err.message });
    }
};

exports.getPointsHistory = async (req, res) => {
    try {
        const sql = `
            SELECT Comment, SubmittedDate 
            FROM feedback 
            WHERE StudentId = ? 
            AND EventId = (SELECT EventId FROM event WHERE EventName = 'Hệ thống Quản lý điểm' LIMIT 1)
            ORDER BY SubmittedDate DESC
        `;
        const [rows] = await db.promise().query(sql, [req.params.id]);

        const history = rows.map(r => {
            let data = {};
            try {
                if (r.Comment && r.Comment.startsWith('{')) {
                    data = JSON.parse(r.Comment);
                }
            } catch (e) { }
            return {
                amount: data.amount || 0,
                reason: data.reason || 'N/A',
                staff_name: data.staff_name || 'System',
                date: r.SubmittedDate
            };
        });

        res.json(history);
    } catch (err) {
        res.status(500).json({ message: "Lỗi tải lịch sử điểm" });
    }
};

exports.getStudentCertificate = async (req, res) => {
    try {
        const studentId = req.params.id;
        const eventId = req.params.eventId;

        const [userRows] = await db.promise().query(
            "SELECT u.Name, u.UserId, s.Class, s.Major FROM user u JOIN student s ON u.UserId = s.UserId WHERE u.UserId = ?",
            [studentId]
        );

        if (userRows.length === 0) return res.status(404).json({ message: "Không tìm thấy sinh viên" });
        const user = userRows[0];

        const [attRows] = await db.promise().query(
            `SELECT a.CheckinTime 
             FROM attendance a 
             JOIN registration r ON a.RegistrationId = r.RegistrationId 
             WHERE r.StudentId = ? AND r.EventId = ? AND r.Status = 'CONFIRMED'`,
            [studentId, eventId]
        );

        if (attRows.length === 0) return res.status(400).json({ message: "Sinh viên chưa điểm danh sự kiện này." });

        const [eventRows] = await db.promise().query("SELECT * FROM event WHERE EventId = ?", [eventId]);
        if (eventRows.length === 0) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

        const event = eventRows[0];
        let points = 5;
        let orgLevel = "Trường Đại học Phenikaa";

        if (event.Description && event.Description.startsWith('{')) {
            try {
                const meta = JSON.parse(event.Description);
                if (meta.ecc_points_volunteer) points = parseFloat(meta.ecc_points_volunteer);
                if (meta.org_level) orgLevel = meta.org_level;
            } catch (e) { }
        }

        res.json({
            studentName: user.Name,
            studentId: user.UserId,
            studentClass: user.Class || 'N/A',
            studentMajor: user.Major || 'N/A',
            eventName: event.EventName,
            eventDate: event.DateTime,
            eventLocation: event.Location,
            orgLevel: orgLevel,
            points: points,
            issueDate: new Date().toISOString()
        });

    } catch (err) {
        console.error("Certificate Data Error:", err);
        res.status(500).json({ message: "Lỗi máy chủ khi tạo dữ liệu chứng chỉ" });
    }
};

exports.updateParticipantRole = async (req, res) => {
    const { eventId, studentId } = req.params;
    const { role, requester_id } = req.body;

    try {
        const staff = await getSpecializedUser(requester_id);
        if (!staff || !['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(staff.role)) {
            return res.status(403).json({ message: "Không có quyền thực hiện" });
        }

        if (!['VOLUNTEER', 'ORGANIZER'].includes(role)) {
            return res.status(400).json({ message: "Vai trò không hợp lệ" });
        }

        const [result] = await db.promise().query(
            "UPDATE registration SET Role = ? WHERE EventId = ? AND StudentId = ?",
            [role, eventId, studentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy dữ liệu đăng ký" });
        }

        res.json({ message: "Cập nhật vai trò thành công!" });
    } catch (err) {
        console.error("Update Participant Role Error:", err);
        res.status(500).json({ message: "Lỗi hệ thống", error: err.message });
    }
};
