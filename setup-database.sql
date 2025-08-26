-- Analytics Dashboard Demo Database Setup
-- Run this script in your MySQL database

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS analytics_demo;
USE analytics_demo;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'analyst', 'viewer') DEFAULT 'viewer',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert demo users (passwords will be hashed by the application)
-- These are just placeholders - the actual hashed passwords will be created by the app
INSERT INTO users (email, firstName, lastName, password, role) VALUES
('admin@demo.com', 'Admin', 'User', 'placeholder', 'admin'),
('manager@demo.com', 'Manager', 'User', 'placeholder', 'manager'),
('analyst@demo.com', 'Analyst', 'User', 'placeholder', 'analyst'),
('viewer@demo.com', 'Viewer', 'User', 'placeholder', 'viewer');

-- Note: The application will automatically hash these passwords and update them
-- when you first run the backend with the seed function enabled.

SELECT 'Database setup complete!' as status;
