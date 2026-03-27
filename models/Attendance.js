const db = require('../src/config/db');

class Attendance {
    constructor(data) {
        this.attendanceId = data.id;
        this.checkInTime = data.checkin_time;
        this.registrationId = data.registration_id;
    }

    static async record(registrationId) {
        const [result] = await db.promise().query(
            "INSERT INTO attendance (registration_id) VALUES (?)",
            [registrationId]
        );
        return result.insertId;
    }

    static async getByRegistrationId(registrationId) {
        const [rows] = await db.promise().query("SELECT * FROM attendance WHERE registration_id = ?", [registrationId]);
        return rows.length > 0 ? new Attendance(rows[0]) : null;
    }
}

module.exports = Attendance;
