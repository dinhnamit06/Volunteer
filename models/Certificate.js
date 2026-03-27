const db = require('../src/config/db');

class Certificate {
    constructor(data) {
        this.certificateId = data.CertificateId || data.id;
        this.issueDate = data.IssueDate || data.issue_date;
        this.certificateUrl = data.CertificateUrl || data.certificate_url;
        this.userId = data.StudentId || data.user_id;
        this.eventId = data.EventId || data.event_id;
    }

    static async generateCertificate(userId, eventId) {
        const url = `/certificates/cert_${userId}_${eventId}.pdf`;
        const certId = 'CERT_' + Math.random().toString(36).substring(7).toUpperCase();
        await db.promise().query(
            "INSERT INTO certificate (CertificateId, IssueDate, CertificateUrl, StudentId, EventId) VALUES (?, NOW(), ?, ?, ?)",
            [certId, url, userId, eventId]
        );
        return new Certificate({
            id: certId,
            issue_date: new Date(),
            certificate_url: url,
            user_id: userId,
            event_id: eventId
        });
    }

    static async getByUserId(userId) {
        const [rows] = await db.promise().query("SELECT * FROM certificate WHERE StudentId = ?", [userId]);
        return rows.map(r => new Certificate(r));
    }
}

module.exports = Certificate;
