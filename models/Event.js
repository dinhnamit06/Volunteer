const db = require('../src/config/db');
const QRCode = require('qrcode');

class Event {
    constructor(data) {
        this.eventId = data.EventId || data.id;
        this.eventName = data.EventName || data.title;
        this.dateTime = data.DateTime || data.start_time;
        this.location = data.Location || data.location;
        this.status = data.Status || data.status;
        this.staffId = data.StaffId || data.created_by;
        this.secretKey = data.SecretKey || data.ValidationData || data.secret_key;

        // Metadata Unpacking
        this.description = data.Description || data.description;
        try {
            if (this.description && this.description.startsWith('{')) {
                const meta = JSON.parse(this.description);
                this.description = meta.original_description || this.description;
                this.activityCode = meta.activity_code;
                this.orgLevel = meta.org_level;
                this.activityType = meta.activity_type;
                this.activityNature = meta.activity_nature;
                this.endTime = meta.end_time;
                this.capacity = meta.capacity;
                this.targetAudience = meta.target_audience;
                this.eccPointsVolunteer = meta.ecc_points_volunteer;
                this.eccPointsOrganizer = meta.ecc_points_organizer;

                // For direct DB rows mapping to FE property names
                this.activity_code = meta.activity_code;
                this.org_level = meta.org_level;
                this.ecc_points_volunteer = meta.ecc_points_volunteer;
            }
        } catch (e) {
            // Not JSON, keep original description
        }
    }

    static async findById(id) {
        const [rows] = await db.promise().query(`
            SELECT e.*, q.ValidationData 
            FROM event e 
            LEFT JOIN qrcode q ON e.EventId = q.EventId 
            WHERE e.EventId = ?
        `, [id]);
        return rows.length > 0 ? new Event(rows[0]) : null;
    }

    async displayQr() {
        if (!this.secretKey) return null;
        try {
            return await QRCode.toDataURL(this.secretKey);
        } catch (e) {
            console.error("QR Generation Error:", e);
            return null;
        }
    }

    async updateInfo(data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return;
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        await db.promise().query(`UPDATE event SET ${setClause} WHERE EventId = ?`, [...values, this.eventId]);
    }

    async changeStatus(newStatus) {
        await db.promise().query("UPDATE event SET Status = ? WHERE EventId = ?", [newStatus, this.eventId]);
        this.status = newStatus;
    }

    isExpired() {
        return new Date() > new Date(this.dateTime);
    }
}

module.exports = Event;
