const db = require('./db');

const migrate = async () => {
    console.log('🚀 Starting Database Migration to MSV-based IDs...');

    const dropQueries = [
        "DROP TABLE IF EXISTS certificate",
        "DROP TABLE IF EXISTS feedback",
        "DROP TABLE IF EXISTS qrcode",
        "DROP TABLE IF EXISTS attendance",
        "DROP TABLE IF EXISTS registration",
        "DROP TABLE IF EXISTS event",
        "DROP TABLE IF EXISTS student",
        "DROP TABLE IF EXISTS staff",
        "DROP TABLE IF EXISTS user"
    ];

    const createQueries = [
        `CREATE TABLE user (
            UserId INT PRIMARY KEY,
            Name VARCHAR(100),
            Email VARCHAR(100),
            Dob DATE,
            Phone VARCHAR(15),
            Address VARCHAR(255),
            Password VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE staff (
            UserId INT PRIMARY KEY,
            CONSTRAINT staff_ibfk_1 FOREIGN KEY (UserId) REFERENCES user (UserId) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE student (
            UserId INT PRIMARY KEY,
            Major VARCHAR(100),
            Class VARCHAR(50),
            CONSTRAINT student_ibfk_1 FOREIGN KEY (UserId) REFERENCES user (UserId) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE event (
            EventId INT AUTO_INCREMENT PRIMARY KEY,
            EventName VARCHAR(150),
            DateTime DATETIME,
            Location VARCHAR(150),
            Description TEXT,
            Status VARCHAR(20),
            StaffId INT,
            CONSTRAINT event_ibfk_1 FOREIGN KEY (StaffId) REFERENCES staff (UserId) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE registration (
            RegistrationId INT AUTO_INCREMENT PRIMARY KEY,
            RegistrationDate DATETIME,
            Status VARCHAR(20),
            StudentId INT,
            EventId INT,
            CONSTRAINT registration_ibfk_1 FOREIGN KEY (StudentId) REFERENCES student (UserId) ON DELETE CASCADE,
            CONSTRAINT registration_ibfk_2 FOREIGN KEY (EventId) REFERENCES event (EventId) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE attendance (
            AttendanceId VARCHAR(20) PRIMARY KEY,
            CheckInTime DATETIME,
            RegistrationId INT,
            CONSTRAINT attendance_ibfk_1 FOREIGN KEY (RegistrationId) REFERENCES registration (RegistrationId) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE qrcode (
            QRCodeId VARCHAR(20) PRIMARY KEY,
            QRCodeImage VARCHAR(255),
            ValidationData VARCHAR(255),
            ExpiryDate DATETIME,
            EventId INT,
            CONSTRAINT qrcode_ibfk_1 FOREIGN KEY (EventId) REFERENCES event (EventId) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE feedback (
            FeedbackId VARCHAR(20) PRIMARY KEY,
            Rating INT,
            Comment TEXT,
            SubmittedDate DATETIME,
            StudentId INT,
            EventId INT,
            CONSTRAINT feedback_ibfk_1 FOREIGN KEY (StudentId) REFERENCES student (UserId) ON DELETE CASCADE,
            CONSTRAINT feedback_ibfk_2 FOREIGN KEY (EventId) REFERENCES event (EventId) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

        `CREATE TABLE certificate (
            CertificateId VARCHAR(20) PRIMARY KEY,
            IssueDate DATE,
            CertificateUrl VARCHAR(255),
            StudentId INT,
            EventId INT,
            CONSTRAINT certificate_ibfk_1 FOREIGN KEY (StudentId) REFERENCES student (UserId) ON DELETE CASCADE,
            CONSTRAINT certificate_ibfk_2 FOREIGN KEY (EventId) REFERENCES event (EventId) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ];

    try {
        console.log('🗑 Cleaning up old tables...');
        for (const query of dropQueries) {
            await db.promise().query(query);
            console.log(`✅ Dropped table`);
        }

        console.log('🏗 Creating correct schema...');
        for (const query of createQueries) {
            await db.promise().query(query);
            console.log(`✅ Table created.`);
        }

        // Add the initial data specified by user
        console.log('👤 Seeding initial data...');
        // Admin
        await db.promise().query(
            "INSERT INTO user (UserId, Name, Email, Password) VALUES (?, ?, ?, ?)",
            [24100051, 'Admin System', '24100051@st.phenikaa-uni.edu.vn', 'admin123']
        );
        await db.promise().query("INSERT INTO staff (UserId) VALUES (?)", [24100051]);

        // Student
        await db.promise().query(
            "INSERT INTO user (UserId, Name, Email, Password) VALUES (?, ?, ?, ?)",
            [24100099, 'Student Test', '24100099@st.phenikaa-uni.edu.vn', 'student123']
        );
        await db.promise().query(
            "INSERT INTO student (UserId, Major, Class) VALUES (?, ?, ?)",
            [24100099, 'Công nghệ thông tin', 'K15-CNTT1']
        );

        console.log('✨ Migration Completed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    }
};

migrate();
