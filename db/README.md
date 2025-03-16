# IGRO Odisha Scraper Database

This directory contains the database schema and setup scripts for the IGRO Odisha Scraper project.

## Database Structure

The database is designed with a versioned, denormalized structure to efficiently store and query data from the IGRO Odisha website. The schema includes:

### Core Tables

1. **states** - Stores state information
   - Primary fields: state_id, name
   - Versioning fields: version, created_at

2. **districts** - Stores district information
   - Primary fields: district_id, name, state_id, state_name
   - Versioning fields: version, created_at

3. **registration_offices** - Stores registration office information
   - Primary fields: registration_office_id, name, district_id, district_name, state_id, state_name
   - Versioning fields: version, created_at

4. **villages** - Stores village information
   - Primary fields: village_id, name, registration_office_id, registration_office_name, district_id, district_name, state_id, state_name
   - Versioning fields: version, created_at

5. **plots** - Stores plot information
   - Primary fields: plot_id, plot_no, area, area_unit, plot_type, village_id, village_name, registration_office_id, registration_office_name, district_id, district_name, state_id, state_name
   - Versioning fields: version, created_at

6. **market_rate_values** - Stores market rate values for plots
   - Primary fields: plot_id, plot_no, khata_no, village_id, village_name, registration_office_id, registration_office_name, district_id, district_name, state_id, state_name, market_value, market_value_unit, valuation_date, road_type, plot_type, plot_category
   - Versioning fields: version, created_at

7. **versions** - Tracks scraping versions
   - Primary fields: version_number, status, start_time, end_time, items_scraped, error_count, notes
   - Metadata fields: created_at

### Views

The database includes views that provide access to the current (latest version) records:

- **current_states**
- **current_districts**
- **current_registration_offices**
- **current_villages**
- **current_plots**
- **current_market_rate_values**

## Denormalization Strategy

The database uses a denormalized approach to improve read performance:

1. **Parent References** - Each table includes references to its parent entities (e.g., villages include district_id and registration_office_id)
2. **Name Duplication** - Names are duplicated across tables to avoid joins (e.g., district_name in registration_offices)
3. **Versioning** - Each record has a version number

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

4. To reset the database (drop all tables and recreate them):
   ```bash
   npm run db:reset
   ```

### Troubleshooting

If you encounter an error about the `exec_sql` function not existing, you'll need to create this function manually:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `create-exec-sql-function.sql` from this directory
4. Paste and execute it in the SQL Editor
5. Run the setup script again:
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

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Example: Insert a district
async function insertDistrict(districtId: string, name: string, stateId: string, stateName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('districts')
    .insert({
      district_id: districtId,
      name: name,
      state_id: stateId,
      state_name: stateName
    });
  
  if (error) {
    console.error('Error inserting district:', error);
    return null;
  }
  
  return data;
}

// Example: Query current districts
async function getCurrentDistricts(): Promise<any[]> {
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
3. The `current_*` views only show the latest version

This approach allows tracking changes over time while maintaining efficient queries.

## Schema Management

The project includes two main schema files:

1. **schema.sql** - Creates all tables, indexes, and views
2. **drop-schema.sql** - Drops all tables and views (used by the reset command)

To modify the schema:

1. Update the `schema.sql` file with your changes
2. Update the `drop-schema.sql` file if you added new tables or views
3. Run `npm run db:reset` to apply the changes 