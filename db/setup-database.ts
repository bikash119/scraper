/**
 * Database Setup Script for IGRO Odisha Scraper
 * 
 * This script reads the SQL schema file and executes it against a Supabase database.
 * 
 * Usage:
 * 1. Create a .env file with your Supabase credentials:
 *    SUPABASE_URL=https://your-project.supabase.co
 *    SUPABASE_KEY=your-service-role-key
 * 2. Run this script: npm run db:setup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Supabase credentials are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found.');
  console.error('Please create a .env file with SUPABASE_URL and SUPABASE_KEY.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Read the SQL schema file
const schemaPath = path.join(__dirname, 'schema.sql');
let sqlSchema: string;

try {
  sqlSchema = fs.readFileSync(schemaPath, 'utf8');
} catch (error) {
  console.error(`Error reading schema file: ${(error as Error).message}`);
  process.exit(1);
}

/**
 * Execute SQL statements against Supabase
 * @param sql - SQL statements to execute
 */
async function executeSql(sql: string): Promise<void> {
  try {
    console.log('Executing SQL schema...');
    const { error } = await supabase.rpc('pgmoon.query', { query: sql });
    
    if (error) {
      console.error('Error executing SQL schema:');
      console.error(error);
      process.exit(1);
    }
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Main function to set up the database
 */
async function setupDatabase(): Promise<void> {
  console.log('Starting database setup...');
  console.log(`Connected to Supabase project: ${supabaseUrl}`);
  
  try {
    await executeSql(sqlSchema);
  } catch (error) {
    console.error(`Error during database setup: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run the setup
setupDatabase(); 