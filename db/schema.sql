-- IGRO Odisha Scraper Database Schema
-- This schema defines a versioned, denormalized structure for storing IGRO data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Version Control Table
-- ==========================================

-- Versions Table - Source of truth for versioning
CREATE TABLE IF NOT EXISTS versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'started', -- started, in_progress, completed, failed
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  end_time TIMESTAMP WITH TIME ZONE,
  items_scraped INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  UNIQUE(version_number)
);

-- ==========================================
-- Core Tables
-- ==========================================

-- States Table
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(state_id, version)
);

-- Districts Table
CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id TEXT NOT NULL,
  name TEXT NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id),
  state_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(district_id, version)
);

-- Registration Offices Table
CREATE TABLE IF NOT EXISTS registration_offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_office_id TEXT NOT NULL,
  name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES districts(id),
  district_name TEXT NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id),
  state_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(registration_office_id, version)
);

-- Villages Table
CREATE TABLE IF NOT EXISTS villages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  village_id TEXT NOT NULL,
  name TEXT NOT NULL,
  registration_office_id UUID NOT NULL REFERENCES registration_offices(id),
  registration_office_name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES districts(id),
  district_name TEXT NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id),
  state_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(village_id, version)
);

-- Plots Table
CREATE TABLE IF NOT EXISTS plots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id TEXT NOT NULL,
  plot_no TEXT NOT NULL,
  area NUMERIC,
  area_unit TEXT,
  plot_type TEXT,
  village_id UUID NOT NULL REFERENCES villages(id),
  village_name TEXT NOT NULL,
  registration_office_id UUID NOT NULL REFERENCES registration_offices(id),
  registration_office_name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES districts(id),
  district_name TEXT NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id),
  state_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(plot_id, version)
);

-- Market Rate Values Table
CREATE TABLE IF NOT EXISTS market_rate_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id UUID NOT NULL REFERENCES plots(id),
  plot_no TEXT NOT NULL,
  khata_no TEXT NOT NULL,
  village_id UUID NOT NULL REFERENCES villages(id),
  village_name TEXT NOT NULL,
  registration_office_id UUID NOT NULL REFERENCES registration_offices(id),
  registration_office_name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES districts(id),
  district_name TEXT NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id),
  state_name TEXT NOT NULL,
  market_value NUMERIC,
  market_value_unit TEXT,
  valuation_date DATE,
  road_type TEXT,
  plot_type TEXT,
  plot_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(plot_id, version)
);

-- ==========================================
-- Indexes
-- ==========================================

-- Version indexes
CREATE INDEX IF NOT EXISTS idx_versions_version_number ON versions(version_number);
CREATE INDEX IF NOT EXISTS idx_versions_status ON versions(status);

-- States indexes
CREATE INDEX IF NOT EXISTS idx_states_state_id ON states(state_id);
CREATE INDEX IF NOT EXISTS idx_states_name ON states(name);
CREATE INDEX IF NOT EXISTS idx_states_version ON states(version);

-- Districts indexes
CREATE INDEX IF NOT EXISTS idx_districts_district_id ON districts(district_id);
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);
CREATE INDEX IF NOT EXISTS idx_districts_state_id ON districts(state_id);
CREATE INDEX IF NOT EXISTS idx_districts_version ON districts(version);

-- Registration Offices indexes
CREATE INDEX IF NOT EXISTS idx_registration_offices_registration_office_id ON registration_offices(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_registration_offices_name ON registration_offices(name);
CREATE INDEX IF NOT EXISTS idx_registration_offices_district_id ON registration_offices(district_id);
CREATE INDEX IF NOT EXISTS idx_registration_offices_state_id ON registration_offices(state_id);
CREATE INDEX IF NOT EXISTS idx_registration_offices_version ON registration_offices(version);

-- Villages indexes
CREATE INDEX IF NOT EXISTS idx_villages_village_id ON villages(village_id);
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages(name);
CREATE INDEX IF NOT EXISTS idx_villages_registration_office_id ON villages(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_villages_district_id ON villages(district_id);
CREATE INDEX IF NOT EXISTS idx_villages_state_id ON villages(state_id);
CREATE INDEX IF NOT EXISTS idx_villages_version ON villages(version);

-- Plots indexes
CREATE INDEX IF NOT EXISTS idx_plots_plot_id ON plots(plot_id);
CREATE INDEX IF NOT EXISTS idx_plots_plot_no ON plots(plot_no);
CREATE INDEX IF NOT EXISTS idx_plots_village_id ON plots(village_id);
CREATE INDEX IF NOT EXISTS idx_plots_registration_office_id ON plots(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_plots_district_id ON plots(district_id);
CREATE INDEX IF NOT EXISTS idx_plots_state_id ON plots(state_id);
CREATE INDEX IF NOT EXISTS idx_plots_version ON plots(version);

-- Market Rate Values indexes
CREATE INDEX IF NOT EXISTS idx_market_rate_values_plot_id ON market_rate_values(plot_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_village_id ON market_rate_values(village_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_registration_office_id ON market_rate_values(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_district_id ON market_rate_values(district_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_state_id ON market_rate_values(state_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_version ON market_rate_values(version);

-- ==========================================
-- Views
-- ==========================================

-- Get the latest version number
CREATE OR REPLACE VIEW latest_version AS
SELECT MAX(version_number) as version_number
FROM versions
WHERE status = 'completed';

-- Current States View (only latest version)
CREATE OR REPLACE VIEW current_states AS
SELECT s.*
FROM states s, latest_version lv
WHERE s.version = lv.version_number;

-- Current Districts View (only latest version)
CREATE OR REPLACE VIEW current_districts AS
SELECT d.*
FROM districts d, latest_version lv
WHERE d.version = lv.version_number;

-- Current Registration Offices View
CREATE OR REPLACE VIEW current_registration_offices AS
SELECT ro.*
FROM registration_offices ro, latest_version lv
WHERE ro.version = lv.version_number;

-- Current Villages View
CREATE OR REPLACE VIEW current_villages AS
SELECT v.*
FROM villages v, latest_version lv
WHERE v.version = lv.version_number;

-- Current Plots View
CREATE OR REPLACE VIEW current_plots AS
SELECT p.*
FROM plots p, latest_version lv
WHERE p.version = lv.version_number;

-- Current Market Rate Values View
CREATE OR REPLACE VIEW current_market_rate_values AS
SELECT mrv.*
FROM market_rate_values mrv, latest_version lv
WHERE mrv.version = lv.version_number; 