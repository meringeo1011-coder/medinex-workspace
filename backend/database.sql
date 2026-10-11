-- Medinex database schema (structure only, no data)
-- Import with: mysql -u root -p < database.sql   (or via phpMyAdmin > Import)

CREATE DATABASE IF NOT EXISTS `medinex_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `medinex_db`;

CREATE TABLE IF NOT EXISTS `complaints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `prescription_id` int DEFAULT NULL,
  `patient_id` int NOT NULL,
  `doctor_name` varchar(255) NOT NULL,
  `patient_name` varchar(255) NOT NULL,
  `complaint_text` text NOT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hospital_id` (`hospital_id`),
  KEY `patient_id` (`patient_id`),
  KEY `prescription_id` (`prescription_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `lab_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `summary` text,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `pharmacist_patient_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pharmacist_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `access_count` int NOT NULL DEFAULT '1',
  `last_accessed` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pharmacist_patient` (`pharmacist_id`,`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `pharmacy_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prescription_id` int DEFAULT NULL,
  `pharmacist_id` int DEFAULT NULL,
  `medicines_given` text,
  `days_supplied` int DEFAULT NULL,
  `dispensed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `prescriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `medicine_name` varchar(255) DEFAULT NULL,
  `dosage` varchar(100) DEFAULT NULL,
  `duration_days` int DEFAULT NULL,
  `instructions` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) DEFAULT 'Active',
  `hospital_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Hospital','Doctor','Patient','Pharmacist') NOT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `license_file` varchar(255) DEFAULT NULL,
  `approval_status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `license_number` varchar(100) DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `is_email_verified` tinyint(1) DEFAULT '0',
  `email_verification_token` varchar(255) DEFAULT NULL,
  `reset_password_token` varchar(255) DEFAULT NULL,
  `reset_password_expires` datetime DEFAULT NULL,
  `patient_unique_id` varchar(50) DEFAULT NULL,
  `allergies` text,
  `current_otp` varchar(6) DEFAULT NULL,
  `otp_expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `patient_unique_id` (`patient_unique_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
