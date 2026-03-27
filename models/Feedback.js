const db = require('../src/config/db');

class Feedback {
    constructor(data) {
        this.feedbackId = data.FeedbackId || data.id;
        this.rating = data.Rating || data.rating;
        this.comment = data.Comment || data.comment;
        this.submittedDate = data.SubmittedDate || data.submitted_date;
        this.userId = data.StudentId || data.user_id;
        this.eventId = data.EventId || data.event_id;
    }

    static async createFeedback(userId, eventId, rating, comment) {
        const [result] = await db.promise().query(
            "INSERT INTO feedback (FeedbackId, Rating, Comment, SubmittedDate, StudentId, EventId) VALUES (?, ?, ?, NOW(), ?, ?)",
            ['FB_' + Math.random().toString(36).substring(7).toUpperCase(), rating, comment, userId, eventId]
        );
        return result.insertId;
    }

    static async getFeedbackByEvent(eventId) {
        const [rows] = await db.promise().query("SELECT * FROM feedback WHERE EventId = ?", [eventId]);
        return rows.map(r => new Feedback(r));
    }
}

module.exports = Feedback;
