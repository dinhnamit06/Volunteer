const db = require('./src/config/db');

async function setup() {
    try {
        console.log('Creating test event...');
        const [res] = await db.promise().query("INSERT INTO event (EventName, DateTime, Location, Status, description) VALUES ('Test Export Event', NOW(), 'Online', 'COMPLETED', '{\"ecc_points_volunteer\": 5}')");
        const eventId = res.insertId;

        console.log('Registering student 24100099...');
        await db.promise().query("INSERT INTO registration (Status, StudentId, EventId, Role) VALUES ('CONFIRMED', 24100099, ?, 'VOLUNTEER')", [eventId]);

        const [regRes] = await db.promise().query("SELECT RegistrationId FROM registration WHERE EventId = ? AND StudentId = 24100099", [eventId]);
        const regId = regRes[0].RegistrationId;

        console.log('Checking in student...');
        await db.promise().query("INSERT INTO attendance (AttendanceId, CheckInTime, RegistrationId) VALUES (?, NOW(), ?)", ['ATT_TEST_EXP', regId]);

        console.log('Test data created successfully! Event ID:', eventId);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

setup();
