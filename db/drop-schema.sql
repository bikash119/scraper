-- IGRO Odisha Scraper Database Drop Schema
-- This script drops all tables, views, and functions created by the schema.sql file

-- Drop views first (in reverse dependency order)
DROP VIEW IF EXISTS current_market_rate_values;
DROP VIEW IF EXISTS current_plots;
DROP VIEW IF EXISTS current_villages;
DROP VIEW IF EXISTS current_registration_offices;
DROP VIEW IF EXISTS current_districts;
DROP VIEW IF EXISTS current_states;
DROP VIEW IF EXISTS latest_version;

-- Drop tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS market_rate_values CASCADE;
DROP TABLE IF EXISTS plots CASCADE;
DROP TABLE IF EXISTS villages CASCADE;
DROP TABLE IF EXISTS registration_offices CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS states CASCADE;
DROP TABLE IF EXISTS versions CASCADE;
DROP TABLE IF EXISTS task_queue CASCADE;

-- Note: We don't drop the UUID extension as it might be used by other applications
-- If you want to drop it, uncomment the following line:
DROP EXTENSION IF EXISTS "uuid-ossp"; 