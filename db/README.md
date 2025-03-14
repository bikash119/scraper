# IGRO Odisha Scraper Database

This directory contains the database schema and setup scripts for the IGRO Odisha Scraper project.

## Database Structure

The database is designed with a versioned, denormalized structure to efficiently store and query data from the IGRO Odisha website. The schema includes:

### Core Tables

1. **districts** - Stores district information
   - Primary fields: district_id, name
   - Versioning fields: version, is_active, created_at, updated_at

2. **registration_offices** - Stores registration office information
   - Primary fields: registration_office_id, name, district_id, district_name
   - Versioning fields: version, is_active, created_at, updated_at

3. **villages** - Stores village information
   - Primary fields: village_id, name, registration_office_id, registration_office_name, district_id, district_name
   - Versioning fields: version, is_active, created_at, updated_at

4. **plots** - Stores plot information
   - Primary fields: plot_id, plot_no, khata_no, area, area_unit, plot_type, village_id, village_name, registration_office_id, registration_office_name, district_id, district_name
   - Versioning fields: version, is_active, created_at, updated_at

5. **market_rate_values** - Stores market rate values for plots
   - Primary fields: plot_id, plot_no, khata_no, village_id, village_name, registration_office_id, registration_office_name, district_id, district_name, market_value, market_value_unit, valuation_date, road_type, plot_type, plot_category, mouza_rate, additional_rate
   - Versioning fields: version, is_active, created_at, updated_at

6. **scraping_sessions** - Tracks scraping sessions
   - Primary fields: start_time, end_time, status, items_scraped, error_count, notes
   - Versioning fields: version

### Views

The database includes views that provide access to the current (latest version and active) records:

- **current_districts**
- **current_registration_offices**
- **current_villages**
- **current_plots**
- **current_market_rate_values**

### Helper Functions

The schema includes helper functions for:

1. **Versioning** - Functions to create new versions of records
2. **Timestamp Management** - Functions to update timestamps
3. **Session Management** - Functions to update scraping session status

## Denormalization Strategy

The database uses a denormalized approach to improve read performance:

1. **Parent References** - Each table includes references to its parent entities (e.g., villages include district_id and registration_office_id)
2. **Name Duplication** - Names are duplicated across tables to avoid joins (e.g., district_name in registration_offices)
3. **Versioning** - Each record has a version number and is_active flag

## Setup Instructions

To set up the database:

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   # Edit the .env file with your Supabase credentials
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the setup script:
   ```bash
   npm run db:setup
   ```

## Manual Setup

If you prefer to set up the database manually:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Open the SQL Editor in the Supabase dashboard
3. Copy the contents of `schema.sql` and execute it in the SQL Editor

## Using the Database

To use the database in your code:

```javascript
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Example: Insert a district
async function insertDistrict(districtId, name) {
  const { data, error } = await supabase
    .rpc('create_new_district_version', {
      p_district_id: districtId,
      p_name: name
    });
  
  if (error) {
    console.error('Error inserting district:', error);
    return null;
  }
  
  return data;
}

// Example: Query current districts
async function getCurrentDistricts() {
  const { data, error } = await supabase
    .from('current_districts')
    .select('*');
  
  if (error) {
    console.error('Error fetching districts:', error);
    return [];
  }
  
  return data;
}
```

## Versioning

The database uses a simple versioning system:

1. Each record has a `version` field starting at 1
2. When a record is updated, a new version is created with `version + 1`
3. Previous versions are marked as inactive (`is_active = FALSE`)
4. The `current_*` views only show the latest active version

This approach allows tracking changes over time while maintaining efficient queries. 