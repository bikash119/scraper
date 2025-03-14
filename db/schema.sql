-- IGRO Odisha Scraper Database Schema
-- This schema defines a versioned, denormalized structure for storing IGRO data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Versioning Helper Functions
-- ==========================================

-- Function to get the current timestamp in UTC
CREATE OR REPLACE FUNCTION get_current_timestamp()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN NOW() AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Core Tables
-- ==========================================

-- Districts Table
CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(district_id, version)
);

-- Registration Offices Table
CREATE TABLE IF NOT EXISTS registration_offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_office_id TEXT NOT NULL,
  name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES districts(id),
  district_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(village_id, version)
);

-- Plots Table
CREATE TABLE IF NOT EXISTS plots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id TEXT NOT NULL,
  plot_no TEXT NOT NULL,
  khata_no TEXT NOT NULL,
  area NUMERIC,
  area_unit TEXT,
  plot_type TEXT,
  village_id UUID NOT NULL REFERENCES villages(id),
  village_name TEXT NOT NULL,
  registration_office_id UUID NOT NULL REFERENCES registration_offices(id),
  registration_office_name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES districts(id),
  district_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
  market_value NUMERIC,
  market_value_unit TEXT,
  valuation_date DATE,
  road_type TEXT,
  plot_type TEXT,
  plot_category TEXT,
  mouza_rate NUMERIC,
  additional_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Scraping Sessions Table
CREATE TABLE IF NOT EXISTS scraping_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT get_current_timestamp(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  items_scraped INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

-- ==========================================
-- Indexes
-- ==========================================

-- Districts indexes
CREATE INDEX IF NOT EXISTS idx_districts_district_id ON districts(district_id);
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);
CREATE INDEX IF NOT EXISTS idx_districts_version ON districts(version);
CREATE INDEX IF NOT EXISTS idx_districts_is_active ON districts(is_active);

-- Registration Offices indexes
CREATE INDEX IF NOT EXISTS idx_registration_offices_registration_office_id ON registration_offices(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_registration_offices_name ON registration_offices(name);
CREATE INDEX IF NOT EXISTS idx_registration_offices_district_id ON registration_offices(district_id);
CREATE INDEX IF NOT EXISTS idx_registration_offices_version ON registration_offices(version);
CREATE INDEX IF NOT EXISTS idx_registration_offices_is_active ON registration_offices(is_active);

-- Villages indexes
CREATE INDEX IF NOT EXISTS idx_villages_village_id ON villages(village_id);
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages(name);
CREATE INDEX IF NOT EXISTS idx_villages_registration_office_id ON villages(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_villages_district_id ON villages(district_id);
CREATE INDEX IF NOT EXISTS idx_villages_version ON villages(version);
CREATE INDEX IF NOT EXISTS idx_villages_is_active ON villages(is_active);

-- Plots indexes
CREATE INDEX IF NOT EXISTS idx_plots_plot_id ON plots(plot_id);
CREATE INDEX IF NOT EXISTS idx_plots_plot_no ON plots(plot_no);
CREATE INDEX IF NOT EXISTS idx_plots_khata_no ON plots(khata_no);
CREATE INDEX IF NOT EXISTS idx_plots_village_id ON plots(village_id);
CREATE INDEX IF NOT EXISTS idx_plots_registration_office_id ON plots(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_plots_district_id ON plots(district_id);
CREATE INDEX IF NOT EXISTS idx_plots_version ON plots(version);
CREATE INDEX IF NOT EXISTS idx_plots_is_active ON plots(is_active);

-- Market Rate Values indexes
CREATE INDEX IF NOT EXISTS idx_market_rate_values_plot_id ON market_rate_values(plot_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_village_id ON market_rate_values(village_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_registration_office_id ON market_rate_values(registration_office_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_district_id ON market_rate_values(district_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_version ON market_rate_values(version);
CREATE INDEX IF NOT EXISTS idx_market_rate_values_is_active ON market_rate_values(is_active);

-- ==========================================
-- Views
-- ==========================================

-- Current Districts View (only active and latest version)
CREATE OR REPLACE VIEW current_districts AS
SELECT d.*
FROM districts d
INNER JOIN (
  SELECT district_id, MAX(version) as max_version
  FROM districts
  WHERE is_active = TRUE
  GROUP BY district_id
) latest ON d.district_id = latest.district_id AND d.version = latest.max_version
WHERE d.is_active = TRUE;

-- Current Registration Offices View
CREATE OR REPLACE VIEW current_registration_offices AS
SELECT ro.*
FROM registration_offices ro
INNER JOIN (
  SELECT registration_office_id, MAX(version) as max_version
  FROM registration_offices
  WHERE is_active = TRUE
  GROUP BY registration_office_id
) latest ON ro.registration_office_id = latest.registration_office_id AND ro.version = latest.max_version
WHERE ro.is_active = TRUE;

-- Current Villages View
CREATE OR REPLACE VIEW current_villages AS
SELECT v.*
FROM villages v
INNER JOIN (
  SELECT village_id, MAX(version) as max_version
  FROM villages
  WHERE is_active = TRUE
  GROUP BY village_id
) latest ON v.village_id = latest.village_id AND v.version = latest.max_version
WHERE v.is_active = TRUE;

-- Current Plots View
CREATE OR REPLACE VIEW current_plots AS
SELECT p.*
FROM plots p
INNER JOIN (
  SELECT plot_id, MAX(version) as max_version
  FROM plots
  WHERE is_active = TRUE
  GROUP BY plot_id
) latest ON p.plot_id = latest.plot_id AND p.version = latest.max_version
WHERE p.is_active = TRUE;

-- Current Market Rate Values View
CREATE OR REPLACE VIEW current_market_rate_values AS
SELECT mrv.*
FROM market_rate_values mrv
INNER JOIN (
  SELECT plot_id, MAX(version) as max_version
  FROM market_rate_values
  WHERE is_active = TRUE
  GROUP BY plot_id
) latest ON mrv.plot_id = latest.plot_id AND mrv.version = latest.max_version
WHERE mrv.is_active = TRUE;

-- ==========================================
-- Versioning Triggers
-- ==========================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = get_current_timestamp();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for districts
CREATE TRIGGER update_districts_updated_at
BEFORE UPDATE ON districts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for registration_offices
CREATE TRIGGER update_registration_offices_updated_at
BEFORE UPDATE ON registration_offices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for villages
CREATE TRIGGER update_villages_updated_at
BEFORE UPDATE ON villages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for plots
CREATE TRIGGER update_plots_updated_at
BEFORE UPDATE ON plots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for market_rate_values
CREATE TRIGGER update_market_rate_values_updated_at
BEFORE UPDATE ON market_rate_values
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Helper Functions for Data Management
-- ==========================================

-- Function to create a new version of a district
CREATE OR REPLACE FUNCTION create_new_district_version(
  p_district_id TEXT,
  p_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_latest_version INTEGER;
  v_new_id UUID;
BEGIN
  -- Get the latest version
  SELECT COALESCE(MAX(version), 0) INTO v_latest_version
  FROM districts
  WHERE district_id = p_district_id;
  
  -- Insert new version
  INSERT INTO districts (
    district_id,
    name,
    version
  ) VALUES (
    p_district_id,
    p_name,
    v_latest_version + 1
  ) RETURNING id INTO v_new_id;
  
  -- Mark previous versions as inactive
  UPDATE districts
  SET is_active = FALSE
  WHERE district_id = p_district_id
    AND version < v_latest_version + 1;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new version of a registration office
CREATE OR REPLACE FUNCTION create_new_registration_office_version(
  p_registration_office_id TEXT,
  p_name TEXT,
  p_district_id UUID,
  p_district_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_latest_version INTEGER;
  v_new_id UUID;
BEGIN
  -- Get the latest version
  SELECT COALESCE(MAX(version), 0) INTO v_latest_version
  FROM registration_offices
  WHERE registration_office_id = p_registration_office_id;
  
  -- Insert new version
  INSERT INTO registration_offices (
    registration_office_id,
    name,
    district_id,
    district_name,
    version
  ) VALUES (
    p_registration_office_id,
    p_name,
    p_district_id,
    p_district_name,
    v_latest_version + 1
  ) RETURNING id INTO v_new_id;
  
  -- Mark previous versions as inactive
  UPDATE registration_offices
  SET is_active = FALSE
  WHERE registration_office_id = p_registration_office_id
    AND version < v_latest_version + 1;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new version of a village
CREATE OR REPLACE FUNCTION create_new_village_version(
  p_village_id TEXT,
  p_name TEXT,
  p_registration_office_id UUID,
  p_registration_office_name TEXT,
  p_district_id UUID,
  p_district_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_latest_version INTEGER;
  v_new_id UUID;
BEGIN
  -- Get the latest version
  SELECT COALESCE(MAX(version), 0) INTO v_latest_version
  FROM villages
  WHERE village_id = p_village_id;
  
  -- Insert new version
  INSERT INTO villages (
    village_id,
    name,
    registration_office_id,
    registration_office_name,
    district_id,
    district_name,
    version
  ) VALUES (
    p_village_id,
    p_name,
    p_registration_office_id,
    p_registration_office_name,
    p_district_id,
    p_district_name,
    v_latest_version + 1
  ) RETURNING id INTO v_new_id;
  
  -- Mark previous versions as inactive
  UPDATE villages
  SET is_active = FALSE
  WHERE village_id = p_village_id
    AND version < v_latest_version + 1;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new version of a plot
CREATE OR REPLACE FUNCTION create_new_plot_version(
  p_plot_id TEXT,
  p_plot_no TEXT,
  p_khata_no TEXT,
  p_area NUMERIC,
  p_area_unit TEXT,
  p_plot_type TEXT,
  p_village_id UUID,
  p_village_name TEXT,
  p_registration_office_id UUID,
  p_registration_office_name TEXT,
  p_district_id UUID,
  p_district_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_latest_version INTEGER;
  v_new_id UUID;
BEGIN
  -- Get the latest version
  SELECT COALESCE(MAX(version), 0) INTO v_latest_version
  FROM plots
  WHERE plot_id = p_plot_id;
  
  -- Insert new version
  INSERT INTO plots (
    plot_id,
    plot_no,
    khata_no,
    area,
    area_unit,
    plot_type,
    village_id,
    village_name,
    registration_office_id,
    registration_office_name,
    district_id,
    district_name,
    version
  ) VALUES (
    p_plot_id,
    p_plot_no,
    p_khata_no,
    p_area,
    p_area_unit,
    p_plot_type,
    p_village_id,
    p_village_name,
    p_registration_office_id,
    p_registration_office_name,
    p_district_id,
    p_district_name,
    v_latest_version + 1
  ) RETURNING id INTO v_new_id;
  
  -- Mark previous versions as inactive
  UPDATE plots
  SET is_active = FALSE
  WHERE plot_id = p_plot_id
    AND version < v_latest_version + 1;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new version of a market rate value
CREATE OR REPLACE FUNCTION create_new_market_rate_value_version(
  p_plot_id UUID,
  p_plot_no TEXT,
  p_khata_no TEXT,
  p_village_id UUID,
  p_village_name TEXT,
  p_registration_office_id UUID,
  p_registration_office_name TEXT,
  p_district_id UUID,
  p_district_name TEXT,
  p_market_value NUMERIC,
  p_market_value_unit TEXT,
  p_valuation_date DATE,
  p_road_type TEXT,
  p_plot_type TEXT,
  p_plot_category TEXT,
  p_mouza_rate NUMERIC,
  p_additional_rate NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_latest_version INTEGER;
  v_new_id UUID;
BEGIN
  -- Get the latest version
  SELECT COALESCE(MAX(version), 0) INTO v_latest_version
  FROM market_rate_values
  WHERE plot_id = p_plot_id;
  
  -- Insert new version
  INSERT INTO market_rate_values (
    plot_id,
    plot_no,
    khata_no,
    village_id,
    village_name,
    registration_office_id,
    registration_office_name,
    district_id,
    district_name,
    market_value,
    market_value_unit,
    valuation_date,
    road_type,
    plot_type,
    plot_category,
    mouza_rate,
    additional_rate,
    version
  ) VALUES (
    p_plot_id,
    p_plot_no,
    p_khata_no,
    p_village_id,
    p_village_name,
    p_registration_office_id,
    p_registration_office_name,
    p_district_id,
    p_district_name,
    p_market_value,
    p_market_value_unit,
    p_valuation_date,
    p_road_type,
    p_plot_type,
    p_plot_category,
    p_mouza_rate,
    p_additional_rate,
    v_latest_version + 1
  ) RETURNING id INTO v_new_id;
  
  -- Mark previous versions as inactive
  UPDATE market_rate_values
  SET is_active = FALSE
  WHERE plot_id = p_plot_id
    AND version < v_latest_version + 1;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update scraping session status
CREATE OR REPLACE FUNCTION update_scraping_session(
  p_session_id UUID,
  p_status TEXT,
  p_items_scraped INTEGER,
  p_error_count INTEGER,
  p_notes TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE scraping_sessions
  SET 
    status = p_status,
    items_scraped = p_items_scraped,
    error_count = p_error_count,
    notes = p_notes,
    end_time = CASE WHEN p_status IN ('completed', 'failed') THEN get_current_timestamp() ELSE end_time END
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql; 