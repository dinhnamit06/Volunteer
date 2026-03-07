const db = require('../src/config/db');

class User {
    constructor(data) {
        this.id = data.UserId || data.id; // Ensure consistent 'id' for frontend
        this.userId = this.id;
        this.name = data.Name || data.name;
        this.email = data.Email || data.email;
        this.dob = data.Dob || data.dob;
        this.phone = data.Phone || data.phone;
        this.address = data.Address || data.address;
        this.password = data.Password || data.password;
        this.role = data.role || 'STUDENT';
    }

    static async login(email, password) {
        const [rows] = await db.promise().query(
            "SELECT * FROM user WHERE Email = ? AND Password = ?",
            [email, password]
        );
        if (rows.length > 0) {
            const user = rows[0];
            const [staffRows] = await db.promise().query("SELECT * FROM staff WHERE UserId = ?", [user.UserId]);
            let role = staffRows.length > 0 ? 'STAFF' : 'STUDENT';
            // Return structured object that frontend expects
            return {
                id: user.UserId,
                name: user.Name,
                email: user.Email,
                role: role
            };
        }
        return null;
    }

    viewProfile() {
        return {
            id: this.id,
            userId: this.id,
            name: this.name,
            email: this.email,
            dob: this.dob,
            phone: this.phone,
            address: this.address,
            role: this.role
        };
    }

    async updateProfile(data) {
        const { name, dob, phone, address } = data;
        await db.promise().query(
            "UPDATE user SET Name = ?, Dob = ?, Phone = ?, Address = ? WHERE UserId = ?",
            [name || this.name, dob || this.dob, phone || this.phone, address || this.address, this.userId]
        );
        if (name) this.name = name;
        if (dob) this.dob = dob;
        if (phone) this.phone = phone;
        if (address) this.address = address;
    }

    async downloadCertificate(eventId) {
        const [rows] = await db.promise().query(
            "SELECT CertificateUrl FROM certificate WHERE StudentId = ? AND EventId = ?",
            [this.userId, eventId]
        );
        return rows.length > 0 ? rows[0].CertificateUrl : null;
    }
}

module.exports = User;
