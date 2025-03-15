-- WARNING: This script will drop all tables in the IGRO Odisha Scraper database
-- Only run this if you are sure you want to reset the database

-- Drop views first
DROP VIEW IF EXISTS current_market_rate_values;
DROP VIEW IF EXISTS current_plots;
DROP VIEW IF EXISTS current_villages;
DROP VIEW IF EXISTS current_registration_offices;
DROP VIEW IF EXISTS current_districts;
DROP VIEW IF EXISTS current_states;
DROP VIEW IF EXISTS latest_version;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS market_rate_values;
DROP TABLE IF EXISTS plots;
DROP TABLE IF EXISTS villages;
DROP TABLE IF EXISTS registration_offices;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS states;
DROP TABLE IF EXISTS task_queue;
DROP TABLE IF EXISTS versions;

-- Disable UUID extension if needed
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- Confirmation message
-- DO $$ BEGIN RAISE NOTICE 'Schema has been dropped successfully.'; END $$; 