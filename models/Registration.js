const db = require('../src/config/db');

class Registration {
    constructor(data) {
        this.registrationId = data.id;
        this.registrationDate = data.registered_at;
        this.status = data.status;
        this.userId = data.user_id;
        this.eventId = data.event_id;
    }

    static async create(userId, eventId) {
        const [result] = await db.promise().query(
            "INSERT INTO registrations (user_id, event_id, status, is_approved) VALUES (?, ?, 'CONFIRMED', TRUE)",
            [userId, eventId]
        );
        return result.insertId;
    }

    static async getByUserId(userId) {
        const [rows] = await db.promise().query("SELECT * FROM registrations WHERE user_id = ?", [userId]);
        return rows.map(r => new Registration(r));
    }
}

module.exports = Registration;
