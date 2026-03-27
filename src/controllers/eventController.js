const db = require('../config/db');
const Event = require('../../models/Event');
const Student = require('../../models/Student');
const Staff = require('../../models/Staff');
const QrCode = require('../../models/QrCode');
const Feedback = require('../../models/Feedback');
const Certificate = require('../../models/Certificate');
const { getSpecializedUser, parseSemesterDates } = require('./helper');

exports.getEvents = async (req, res) => {
    try {
        await db.promise().query("UPDATE event SET Status = 'COMPLETED' WHERE DateTime < NOW() AND Status != 'CANCELLED' AND Status != 'COMPLETED'");

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

        const student = new Student({});
        const events = await student.viewEventDetails(startDate, endDate);
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách sự kiện" });
    }
};

exports.createEvent = async (req, res) => {
    const { created_by } = req.body;
    try {
        const staff = await getSpecializedUser(created_by);
        if (!staff || !['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(staff.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const payload = { ...req.body };
        payload.secret_key = "QR_" + Math.random().toString(36).substring(7).toUpperCase();

        const eventId = await staff.createEvent(payload);

        const qrObj = new QrCode({ secret_key: payload.secret_key, qr_expiry_date: payload.end_time || null });
        const qrImage = await qrObj.generateQrCode();

        await db.promise().query(
            "INSERT INTO qrcode (QRCodeId, QRCodeImage, ValidationData, ExpiryDate, EventId) VALUES (?, ?, ?, ?, ?)",
            ['QR_' + Math.random().toString(36).substring(7).toUpperCase(), null, payload.secret_key, payload.end_time || null, eventId]
        );

        res.status(201).json({ message: "Tạo sự kiện thành công", id: eventId });
    } catch (err) {
        res.status(500).json({ message: "Lỗi tạo sự kiện", error: err.message });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = new Event({ id: req.params.id });
        await event.updateInfo({ Status: 'CANCELLED' });
        await db.promise().query("DELETE FROM event WHERE EventId = ?", [req.params.id]);
        res.json({ message: "Xóa sự kiện thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi xóa sự kiện" });
    }
};

exports.updateEvent = async (req, res) => {
    const { created_by, ...payload } = req.body;
    try {
        const staff = await getSpecializedUser(created_by);
        if (!staff || !['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(staff.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

        // Rebuild description JSON
        const descriptionObj = {
            original_description: payload.description || event.description,
            activity_code: payload.activity_code || event.activityCode,
            org_level: payload.org_level || event.orgLevel,
            activity_type: payload.activity_type || event.activityType,
            activity_nature: payload.activity_nature || event.activityNature,
            end_time: payload.end_time || event.endTime,
            capacity: payload.capacity || event.capacity,
            target_audience: payload.target_audience || event.targetAudience,
            ecc_points_volunteer: payload.ecc_points_volunteer || event.eccPointsVolunteer,
            ecc_points_organizer: payload.ecc_points_organizer || event.eccPointsOrganizer
        };

        const updateData = {
            EventName: payload.title || event.eventName,
            DateTime: payload.start_time || event.dateTime,
            Location: payload.location || event.location,
            Description: JSON.stringify(descriptionObj)
        };

        const eventToUpdate = new Event({ id: req.params.id });
        await eventToUpdate.updateInfo(updateData);

        // Update QR code expiry if end_time changed
        if (payload.end_time) {
            await db.promise().query(
                "UPDATE qrcode SET ExpiryDate = ? WHERE EventId = ?",
                [payload.end_time, req.params.id]
            );
        }

        res.json({ message: "Cập nhật thành công!" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cập nhật sự kiện", error: err.message });
    }
};

exports.getEventQr = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Không tìm thấy" });

        const qrImage = await event.displayQr();
        res.json({ qr_image_url: qrImage, qr_code: event.secretKey });
    } catch (e) {
        res.status(500).json({ message: "Lỗi tạo QR" });
    }
};

exports.getEventFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.getFeedbackByEvent(req.params.id);
        res.json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: "Lỗi tải danh sách feedback" });
    }
};

exports.submitFeedback = async (req, res) => {
    const { user_id, rating, comment } = req.body;
    try {
        await Feedback.createFeedback(user_id, req.params.id, rating, comment);
        res.json({ message: "Gửi đánh giá thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi lưu đánh giá" });
    }
};

exports.issueCertificate = async (req, res) => {
    const { student_id } = req.body;
    try {
        const email = `${student_id}@st.phenikaa-uni.edu.vn`;
        const [users] = await db.promise().query("SELECT UserId FROM user WHERE Email = ?", [email]);
        if (users.length === 0) return res.status(404).json({ message: "Không tìm thấy sinh viên với MSV này" });

        const userId = users[0].UserId;
        const certificate = await Certificate.generateCertificate(userId, req.params.id);
        res.json({ message: "Cấp chứng nhận thành công", certificate });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cấp chứng nhận" });
    }
};

exports.registerEvent = async (req, res) => {
    const { user_id, event_id } = req.body;
    try {
        const student = await getSpecializedUser(user_id);
        if (!student || student.role !== 'STUDENT') throw new Error("Chỉ sinh viên mới có thể đăng ký");

        await student.registerEvent(event_id);
        res.json({ message: "Đăng ký thành công!" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.getEventCheckins = async (req, res) => {
    try {
        const staff = new Staff({});
        const checkins = await staff.exportAttendanceReport(req.params.id);
        res.json(checkins);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách" });
    }
};

exports.scanAttendance = async (req, res) => {
    const { user_id, qr_code } = req.body;
    try {
        const student = await getSpecializedUser(user_id);
        if (!student || student.role !== 'STUDENT') throw new Error("Unauthorized");

        const result = await student.scanQRCode(qr_code);
        res.json({ message: "Điểm danh thành công!", extracurricular_points: result.points, event_id: result.event_id });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
