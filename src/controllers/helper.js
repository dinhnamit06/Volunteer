const db = require('../config/db');
const Staff = require('../../models/Staff');
const Student = require('../../models/Student');

// Used by controllers
exports.getSpecializedUser = async (userId) => {
    const parsedId = parseInt(userId);
    if (isNaN(parsedId)) return null;

    const [rows] = await db.promise().query(
        "SELECT u.*, s.Major, s.Class FROM user u LEFT JOIN student s ON u.UserId = s.UserId WHERE u.UserId = ?",
        [parsedId]
    );
    if (rows.length === 0) return null;

    const [staffRows] = await db.promise().query("SELECT * FROM staff WHERE UserId = ?", [parsedId]);
    if (staffRows.length > 0) {
        const data = rows[0];
        data.role = 'STAFF';
        return new Staff(data);
    }
    const studentData = rows[0];
    studentData.role = 'STUDENT';
    return new Student(studentData);
};

exports.parseSemesterDates = (semesterStr, yearStr) => {
    if (!semesterStr || !yearStr || semesterStr === 'All' || yearStr === 'All') return null;

    const parts = yearStr.split('-');
    if (parts.length !== 2) return null;

    const year = parseInt(parts[0], 10);
    let startDate = new Date(year, 0, 1);
    let endDate = new Date(year, 11, 31, 23, 59, 59);

    if (semesterStr === '1') {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 3, 30, 23, 59, 59);
    } else if (semesterStr === '2') {
        startDate = new Date(year, 4, 1);
        endDate = new Date(year, 7, 31, 23, 59, 59);
    } else if (semesterStr === '3') {
        startDate = new Date(year, 8, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    return { startDate, endDate };
};
