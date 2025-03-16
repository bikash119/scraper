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
 *    To drop existing schema first: npm run db:setup -- --drop
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

// Check if --drop flag is provided
const shouldDropSchema = process.argv.includes('--drop');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Read the SQL schema file
const schemaPath = path.join(__dirname, 'schema.sql');
const dropSchemaPath = path.join(__dirname, 'drop-schema.sql');
let sqlSchema: string;
let dropSqlSchema: string | null = null;

try {
  sqlSchema = fs.readFileSync(schemaPath, 'utf8');
  
  // Read drop schema file if --drop flag is provided
  if (shouldDropSchema) {
    try {
      dropSqlSchema = fs.readFileSync(dropSchemaPath, 'utf8');
    } catch (error) {
      console.error(`Error reading drop schema file: ${(error as Error).message}`);
      process.exit(1);
    }
  }
} catch (error) {
  console.error(`Error reading schema file: ${(error as Error).message}`);
  process.exit(1);
}

/**
 * Split SQL statements by semicolons, but handle edge cases like semicolons in strings
 * @param sql - SQL statements to split
 * @returns Array of SQL statements
 */
function splitSqlStatements(sql: string): string[] {
  // This is a simple approach that may not handle all edge cases
  // For a more robust solution, consider using a SQL parser
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    // Handle string literals
    if ((char === "'" || char === '"') && (i === 0 || sql[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    // Add character to current statement
    currentStatement += char;

    // If we hit a semicolon and we're not in a string, end the statement
    if (char === ';' && !inString) {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      currentStatement = '';
    }
  }

  // Add the last statement if there is one
  const trimmed = currentStatement.trim();
  if (trimmed.length > 0 && trimmed !== ';') {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Execute SQL statements against Supabase
 * @param sql - SQL statements to execute
 * @param description - Description of the SQL being executed
 */
async function executeSql(sql: string, description: string = 'SQL schema'): Promise<void> {
  try {
    console.log(`Executing ${description}...`);
    
    // Split the SQL into individual statements
    const statements = splitSqlStatements(sql);
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(statement.slice(0, 30));
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.error('Statement:', statement);
          
          // Continue with the next statement instead of failing completely
          continue;
        }
        
        console.log(`Statement ${i + 1} executed successfully.`);
      } catch (error) {
        console.error(`Exception executing statement ${i + 1}:`, error);
        console.error('Statement:', statement);
        
        // Continue with the next statement
        continue;
      }
    }
    
    console.log(`${description} execution completed successfully!`);
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
    // First, check if we can execute SQL directly
    console.log('Checking if exec_sql function exists...');
    const { error: checkError } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT 1 as test' 
    });
    
    if (checkError) {
      console.log('exec_sql function not found. Creating it...');
      
      // Create the exec_sql function
      const createFunctionSql = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      // Try to access the database to check permissions
      const { error } = await supabase.from('_sqlquery').select('*').limit(1);
      
      if (error) {
        console.error('Error: Unable to execute SQL directly or create helper function.');
        console.error('Please run the following SQL in the Supabase SQL Editor to create the exec_sql function:');
        console.error(createFunctionSql);
        console.error('\nThen run this script again.');
        process.exit(1);
      }
      
      // If we can execute SQL directly, create the exec_sql function using the SQL Editor
      console.error('Please run the following SQL in the Supabase SQL Editor to create the exec_sql function:');
      console.error(createFunctionSql);
      console.error('\nThen run this script again.');
      process.exit(1);
    } else {
      console.log('exec_sql function exists. Proceeding with schema execution...');
    }
    
    // Drop schema if requested
    if (shouldDropSchema && dropSqlSchema) {
      console.log('Drop schema flag detected. Dropping existing schema first...');
      await executeSql(dropSqlSchema, 'Drop schema');
    }
    
    // Execute the schema
    await executeSql(sqlSchema, 'Schema creation');
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error(`Error during database setup: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run the setup
setupDatabase(); 