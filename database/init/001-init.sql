-- LIA Lab Management System - Database Initialization
-- This file runs when the PostgreSQL container first starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database schema (Drizzle will handle table creation)
-- This file is mainly for extensions and any manual setup

-- Set timezone
SET timezone = 'UTC';

-- Log successful initialization
SELECT 'LIA Database initialized successfully' as status;