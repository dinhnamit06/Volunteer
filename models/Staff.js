const User = require('./User');
const db = require('../src/config/db');

class Staff extends User {
    constructor(data) {
        super(data);
    }

    async createEvent(data) {
        const {
            title, activity_code, org_level, activity_type, activity_nature,
            description, start_time, end_time, location, capacity,
            target_audience, secret_key, ecc_points_volunteer, ecc_points_organizer
        } = data;

        // Pack extra metadata into a JSON string within the description
        const metadata = {
            activity_code,
            org_level,
            activity_type,
            activity_nature,
            end_time,
            capacity,
            target_audience,
            ecc_points_volunteer,
            ecc_points_organizer,
            original_description: description
        };

        const finalDescription = JSON.stringify(metadata);

        const [result] = await db.promise().query(
            `INSERT INTO event (
                EventName, DateTime, Location, Description, Status, StaffId
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                title, start_time, location, finalDescription, 'UPCOMING', this.userId
            ]
        );
        return result.insertId;
    }

    async editEvent(eventId, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        await db.promise().query(`UPDATE event SET ${setClause} WHERE EventId = ?`, [...values, eventId]);
    }

    async cancelEvent(eventId) {
        await db.promise().query("DELETE FROM event WHERE EventId = ?", [eventId]);
    }

    async exportAttendanceReport(eventId) {
        const [rows] = await db.promise().query(
            `SELECT u.Name as name, u.Email as email, u.UserId as student_id, s.Major as major, s.Class as class, r.RegistrationDate as registered_at, a.CheckInTime as checkin_time,
            (CASE WHEN a.AttendanceId IS NOT NULL THEN 'Đã điểm danh' ELSE 'Chưa điểm danh' END) as attendance_status,
            r.Role as participant_role
            FROM registration r
            JOIN user u ON r.StudentId = u.UserId
            LEFT JOIN student s ON u.UserId = s.UserId
            LEFT JOIN attendance a ON r.RegistrationId = a.RegistrationId
            WHERE r.EventId = ?
            ORDER BY r.RegistrationDate DESC`,
            [eventId]
        );
        return rows;
    }
}

module.exports = Staff;
