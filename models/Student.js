const User = require('./User');
const db = require('../src/config/db');

class Student extends User {
    constructor(data) {
        super(data);
        this.studentId = data.UserId || data.id; // Map to UserId since ERD doesn't have student_id in Student table (only UserId)
        this.major = data.Major || data.major;
        this.class = data.Class || data.class;
    }

    async registerEvent(eventId) {
        const [eventRows] = await db.promise().query(
            "SELECT DateTime as start_time FROM event WHERE EventId = ?",
            [eventId]
        );

        if (eventRows.length === 0) throw new Error("Event not found");
        const event = eventRows[0];

        if (new Date() > new Date(event.start_time)) throw new Error("Sự kiện này đã bắt đầu hoặc đã kết thúc");

        // Check for duplicate registration
        const [existing] = await db.promise().query(
            "SELECT RegistrationId FROM registration WHERE StudentId = ? AND EventId = ?",
            [this.userId, eventId]
        );
        if (existing.length > 0) throw new Error("Bạn đã đăng ký sự kiện này rồi!");

        await db.promise().query(
            "INSERT INTO registration (RegistrationDate, Status, StudentId, EventId) VALUES (NOW(), 'CONFIRMED', ?, ?)",
            [this.userId, eventId]
        );
    }

    async scanQRCode(qrCode) {
        const [rows] = await db.promise().query(
            `SELECT r.RegistrationId as reg_id, e.SecretKey as secret_key, e.DateTime as start_time FROM registration r 
            JOIN event e ON r.EventId = e.EventId 
            WHERE r.StudentId = ? AND e.SecretKey = ? AND r.Status = 'CONFIRMED'`,
            [this.userId, qrCode]
        );

        if (rows.length === 0) throw new Error("Invalid QR or not registered");

        const { reg_id } = rows[0];

        // Ensure QR validating logic matches new database columns
        const QrCodeInfo = await db.promise().query("SELECT * FROM qrcode WHERE ValidationData = ?", [qrCode]);
        if (QrCodeInfo[0].length > 0) {
            const qrExpiry = QrCodeInfo[0][0].ExpiryDate;
            if (qrExpiry && new Date() > new Date(qrExpiry)) {
                throw new Error("Mã QR đã hết hạn");
            }
        }

        await db.promise().query("INSERT INTO attendance (AttendanceId, CheckInTime, RegistrationId) VALUES (?, NOW(), ?)",
            ['ATT_' + Math.random().toString(36).substring(7).toUpperCase(), reg_id]);

        // Calculate points dynamically from the event metadata
        const [eventData] = await db.promise().query(
            "SELECT e.Description, r.Role as participant_role FROM event e JOIN registration r ON e.EventId = r.EventId WHERE r.RegistrationId = ?",
            [reg_id]
        );
        let points = 5; // Fallback
        if (eventData.length > 0) {
            const role = eventData[0].participant_role || 'VOLUNTEER';
            const desc = eventData[0].Description;
            if (desc && desc.startsWith('{')) {
                try {
                    const meta = JSON.parse(desc);
                    if (role === 'ORGANIZER') {
                        points = meta.ecc_points_organizer || 5;
                    } else {
                        points = meta.ecc_points_volunteer || 5;
                    }
                } catch (e) { }
            }
        }
        return points;
    }

    static async getTotalPoints(studentId, startDate = null, endDate = null) {
        let sql = `
            SELECT e.Description, e.DateTime, r.Role as participant_role
            FROM attendance a
            JOIN registration r ON a.RegistrationId = r.RegistrationId
            JOIN event e ON r.EventId = e.EventId
            WHERE r.StudentId = ?
        `;
        const params = [studentId];

        if (startDate && endDate) {
            sql += ` AND e.DateTime >= ? AND e.DateTime <= ?`;
            params.push(startDate, endDate);
        }

        const [rows] = await db.promise().query(sql, params);
        let total = 0;
        rows.forEach(row => {
            const role = row.participant_role || 'VOLUNTEER';
            if (row.Description && row.Description.startsWith('{')) {
                try {
                    const meta = JSON.parse(row.Description);
                    if (role === 'ORGANIZER') {
                        total += parseFloat(meta.ecc_points_organizer) || 0;
                    } else {
                        total += parseFloat(meta.ecc_points_volunteer) || 0;
                    }
                } catch (e) {
                    total += 5; // Fallback if old data format
                }
            } else {
                total += 5; // Default for events without JSON metadata
            }
        });

        // Add points from manual "Bonus Points" system (stored in feedback table)
        let bonusSql = `
            SELECT Comment, SubmittedDate 
            FROM feedback 
            WHERE StudentId = ? 
            AND EventId = (SELECT EventId FROM event WHERE EventName = 'Hệ thống Quản lý điểm' LIMIT 1)
        `;
        const bonusParams = [studentId];

        if (startDate && endDate) {
            bonusSql += ` AND SubmittedDate >= ? AND SubmittedDate <= ?`;
            bonusParams.push(startDate, endDate);
        }

        const [bonusRows] = await db.promise().query(bonusSql, bonusParams);
        bonusRows.forEach(row => {
            if (row.Comment && row.Comment.startsWith('{')) {
                try {
                    const data = JSON.parse(row.Comment);
                    if (data.amount) {
                        total += parseFloat(data.amount);
                    }
                } catch (e) { }
            }
        });

        return total;
    }

    async viewEventDetails(startDate = null, endDate = null) {
        let sql = `
            SELECT e.*, e.DateTime as start_time, e.EventName as title, e.EventId as id, e.Description as description, e.Location as location, e.Status as status,
            (SELECT COUNT(*) FROM registration WHERE EventId = e.EventId AND Status = 'CONFIRMED') as registered_count
            FROM event e 
        `;
        const params = [];

        if (startDate && endDate) {
            sql += ` WHERE e.DateTime >= ? AND e.DateTime <= ?`;
            params.push(startDate, endDate);
        }

        sql += ` ORDER BY e.DateTime DESC`;

        const [rows] = await db.promise().query(sql, params);

        // Metadata Unpacking for each row
        return rows.map(row => {
            if (row.Description && row.Description.startsWith('{')) {
                try {
                    const meta = JSON.parse(row.Description);
                    return {
                        ...row,
                        description: meta.original_description || row.Description,
                        activity_code: meta.activity_code,
                        org_level: meta.org_level,
                        activity_type: meta.activity_type,
                        activity_nature: meta.activity_nature,
                        end_time: meta.end_time,
                        capacity: meta.capacity,
                        target_audience: meta.target_audience,
                        ecc_points_volunteer: meta.ecc_points_volunteer,
                        ecc_points_organizer: meta.ecc_points_organizer
                    };
                } catch (e) {
                    return row;
                }
            }
            return row;
        });
    }

    async feedback(eventId, rating, comment) {
        await db.promise().query(
            "INSERT INTO feedback (FeedbackId, Rating, Comment, SubmittedDate, StudentId, EventId) VALUES (?, ?, ?, NOW(), ?, ?)",
            ['FB_' + Math.random().toString(36).substring(7).toUpperCase(), rating, comment, this.userId, eventId]
        );
    }

    viewProfile() {
        const base = super.viewProfile();
        return {
            ...base,
            studentId: this.studentId,
            major: this.major,
            class: this.class
        };
    }

    async updateProfile(data) {
        const { userId, name, dob, phone, address, major, class: className } = data;

        await db.promise().query("START TRANSACTION");
        try {
            await super.updateProfile({ name, dob, phone, address });

            // If userId changed, update it in 'user' table (Cascades to others)
            if (userId && userId != this.userId) {
                await db.promise().query(
                    "UPDATE user SET UserId = ? WHERE UserId = ?",
                    [userId, this.userId]
                );
                this.userId = userId;
                this.id = userId;
                this.studentId = userId;
            }

            await db.promise().query(
                "UPDATE student SET Major = ?, Class = ? WHERE UserId = ?",
                [major || this.major, className || this.class, this.userId]
            );

            if (major) this.major = major;
            if (className) this.class = className;

            await db.promise().query("COMMIT");
        } catch (err) {
            await db.promise().query("ROLLBACK");
            throw err;
        }
    }
}

module.exports = Student;
