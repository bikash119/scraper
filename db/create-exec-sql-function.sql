-- Create the exec_sql function for IGRO Odisha Scraper
-- Run this script in the Supabase SQL Editor if the db:setup script fails with an error about exec_sql not existing

-- This function allows executing dynamic SQL statements
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users (optional, depending on your security requirements)
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

-- Test the function
SELECT exec_sql('SELECT 1 as test');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'exec_sql function created successfully!';
END $$; 