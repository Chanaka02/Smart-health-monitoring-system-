-- MySQL / MariaDB schema for Smart Health Monitor
-- Import this file into phpMyAdmin or run with the `mysql` client to create the database and tables.
-- Usage (phpMyAdmin): Open phpMyAdmin, select SQL, paste contents, run.
-- Usage (CLI): mysql -u root -p < mysql_schema.sql

CREATE DATABASE IF NOT EXISTS `smart_health` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smart_health`;

-- Users table (store hashed password)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Water logs
CREATE TABLE IF NOT EXISTS `water_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ts` BIGINT NOT NULL,
  `user_email` VARCHAR(255) DEFAULT NULL,
  `amount` DECIMAL(8,3) DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX (`user_email`),
  INDEX (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Health logs
CREATE TABLE IF NOT EXISTS `health_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ts` BIGINT NOT NULL,
  `user_email` VARCHAR(255) DEFAULT NULL,
  `heart_rate` INT DEFAULT NULL,
  `steps` INT DEFAULT 0,
  `stress` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX (`user_email`),
  INDEX (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: sample admin row (commented). To use it, replace the PASSWORD_HASH placeholder
-- with a bcrypt hash you generate (e.g., using PHP's password_hash or an online bcrypt tool),
-- then uncomment and run the INSERT.
--
-- INSERT INTO `users` (`name`,`email`,`password`) VALUES
-- ('Admin','admin@example.com','$2y$10$PASSWORD_HASH_GOES_HERE');

-- Optional: a small helper view summarizing counts
CREATE OR REPLACE VIEW `metrics_view` AS
SELECT
  (SELECT COUNT(*) FROM water_logs) AS water_count,
  (SELECT COUNT(*) FROM health_logs) AS health_count,
  (SELECT COALESCE(SUM(amount),0) FROM water_logs) AS water_total;

-- End of schema
