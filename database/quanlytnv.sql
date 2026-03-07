-- Database Export for Phenikaa Volunteer Management System
-- Generated for GitHub Upload

CREATE DATABASE IF NOT EXISTS `phenikaa_volunteer_db`;
USE `phenikaa_volunteer_db`;

-- 1. Table: user
CREATE TABLE `user` (
  `UserId` int NOT NULL,
  `Name` varchar(100) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Dob` date DEFAULT NULL,
  `Phone` varchar(15) DEFAULT NULL,
  `Address` varchar(255) DEFAULT NULL,
  `Password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Table: staff
CREATE TABLE `staff` (
  `UserId` int NOT NULL,
  PRIMARY KEY (`UserId`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `user` (`UserId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Table: student
CREATE TABLE `student` (
  `UserId` int NOT NULL,
  `Major` varchar(100) DEFAULT NULL,
  `Class` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`UserId`),
  CONSTRAINT `student_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `user` (`UserId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Table: event
CREATE TABLE `event` (
  `EventId` int NOT NULL AUTO_INCREMENT,
  `EventName` varchar(150) DEFAULT NULL,
  `DateTime` datetime DEFAULT NULL,
  `Location` varchar(150) DEFAULT NULL,
  `Description` text,
  `Status` varchar(20) DEFAULT NULL,
  `StaffId` int DEFAULT NULL,
  PRIMARY KEY (`EventId`),
  KEY `StaffId` (`StaffId`),
  CONSTRAINT `event_ibfk_1` FOREIGN KEY (`StaffId`) REFERENCES `staff` (`UserId`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Table: registration
CREATE TABLE `registration` (
  `RegistrationId` int NOT NULL AUTO_INCREMENT,
  `RegistrationDate` datetime DEFAULT NULL,
  `Status` varchar(20) DEFAULT NULL,
  `StudentId` int DEFAULT NULL,
  `EventId` int DEFAULT NULL,
  PRIMARY KEY (`RegistrationId`),
  KEY `StudentId` (`StudentId`),
  KEY `EventId` (`EventId`),
  CONSTRAINT `registration_ibfk_1` FOREIGN KEY (`StudentId`) REFERENCES `student` (`UserId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `registration_ibfk_2` FOREIGN KEY (`EventId`) REFERENCES `event` (`EventId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Table: attendance
CREATE TABLE `attendance` (
  `AttendanceId` varchar(20) NOT NULL,
  `CheckInTime` datetime DEFAULT NULL,
  `RegistrationId` int DEFAULT NULL,
  PRIMARY KEY (`AttendanceId`),
  KEY `RegistrationId` (`RegistrationId`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`RegistrationId`) REFERENCES `registration` (`RegistrationId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Table: qrcode
CREATE TABLE `qrcode` (
  `QRCodeId` varchar(20) NOT NULL,
  `QRCodeImage` varchar(255) DEFAULT NULL,
  `ValidationData` varchar(255) DEFAULT NULL,
  `ExpiryDate` datetime DEFAULT NULL,
  `EventId` int DEFAULT NULL,
  PRIMARY KEY (`QRCodeId`),
  KEY `EventId` (`EventId`),
  CONSTRAINT `qrcode_ibfk_1` FOREIGN KEY (`EventId`) REFERENCES `event` (`EventId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Table: feedback
CREATE TABLE `feedback` (
  `FeedbackId` varchar(20) NOT NULL,
  `Rating` int DEFAULT NULL,
  `Comment` text,
  `SubmittedDate` datetime DEFAULT NULL,
  `StudentId` int DEFAULT NULL,
  `EventId` int DEFAULT NULL,
  PRIMARY KEY (`FeedbackId`),
  KEY `StudentId` (`StudentId`),
  KEY `EventId` (`EventId`),
  CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`StudentId`) REFERENCES `student` (`UserId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `feedback_ibfk_2` FOREIGN KEY (`EventId`) REFERENCES `event` (`EventId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Table: certificate
CREATE TABLE `certificate` (
  `CertificateId` varchar(20) NOT NULL,
  `IssueDate` date DEFAULT NULL,
  `CertificateUrl` varchar(255) DEFAULT NULL,
  `StudentId` int DEFAULT NULL,
  `EventId` int DEFAULT NULL,
  PRIMARY KEY (`CertificateId`),
  KEY `StudentId` (`StudentId`),
  KEY `EventId` (`EventId`),
  CONSTRAINT `certificate_ibfk_1` FOREIGN KEY (`StudentId`) REFERENCES `student` (`UserId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `certificate_ibfk_2` FOREIGN KEY (`EventId`) REFERENCES `event` (`EventId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Initial Data (Sample)
INSERT INTO `user` (`UserId`, `Name`, `Email`, `Password`) VALUES (24100051, 'Admin System', '24100051@st.phenikaa-uni.edu.vn', 'admin123');
INSERT INTO `staff` (`UserId`) VALUES (24100051);
INSERT INTO `user` (`UserId`, `Name`, `Email`, `Password`) VALUES (24100099, 'Student Test', '24100099@st.phenikaa-uni.edu.vn', 'student123');
INSERT INTO `student` (`UserId`, `Major`, `Class`) VALUES (24100099, 'Công nghệ thông tin', 'K15-CNTT1');