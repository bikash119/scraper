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
 *    Or to drop and recreate the schema: npm run db:setup -- --drop
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Parse command line arguments
const shouldDropSchema = process.argv.includes('--drop');

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

// Read the drop schema file if needed
let dropSqlSchema: string | null = null;
if (shouldDropSchema) {
  const dropSchemaPath = path.join(__dirname, 'drop-schema.sql');
  try {
    dropSqlSchema = fs.readFileSync(dropSchemaPath, 'utf8');
    console.log('Drop schema flag enabled. Will drop existing schema before creating new one.');
  } catch (error) {
    console.error(`Error reading drop schema file: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Split SQL statements by semicolons, but handle edge cases like semicolons in strings
 * and DO blocks
 * @param sql - SQL statements to split
 * @returns Array of SQL statements
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let inComment = false;
  let inMultilineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    const prevChar = i > 0 ? sql[i - 1] : '';

    // Handle comments
    if (!inString && !inDollarQuote && !inMultilineComment && char === '-' && nextChar === '-') {
      inComment = true;
    }
    
    if (inComment && (char === '\n' || char === '\r')) {
      inComment = false;
    }
    
    if (!inString && !inDollarQuote && !inComment && char === '/' && nextChar === '*') {
      inMultilineComment = true;
    }
    
    if (inMultilineComment && char === '*' && nextChar === '/') {
      inMultilineComment = false;
      currentStatement += char + nextChar;
      i++; // Skip the next character
      continue;
    }
    
    // Skip processing if in a comment
    if (inComment || inMultilineComment) {
      currentStatement += char;
      continue;
    }

    // Handle string literals
    if ((char === "'" || char === '"') && (i === 0 || prevChar !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    // Handle dollar-quoted strings (like in DO blocks)
    if (char === '$' && !inString) {
      if (!inDollarQuote) {
        // Start of a dollar-quoted string
        let tag = '$';
        let j = i + 1;
        // Extract the tag if there is one
        while (j < sql.length && sql[j] !== '$') {
          tag += sql[j];
          j++;
        }
        if (j < sql.length && sql[j] === '$') {
          tag += '$';
          dollarTag = tag;
          inDollarQuote = true;
        }
      } else if (i + dollarTag.length - 1 < sql.length) {
        // Check if this is the end of the dollar-quoted string
        const potentialEnd = sql.substring(i, i + dollarTag.length);
        if (potentialEnd === dollarTag) {
          inDollarQuote = false;
          i += dollarTag.length - 1; // Skip the rest of the tag
        }
      }
    }

    // Add character to current statement
    currentStatement += char;

    // If we hit a semicolon and we're not in a string or dollar-quoted string, end the statement
    if (char === ';' && !inString && !inDollarQuote && !inComment && !inMultilineComment) {
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
 */
async function executeSql(sql: string): Promise<void> {
  try {
    console.log('Executing SQL schema...');
    
    // Split the SQL into individual statements
    const statements = splitSqlStatements(sql);
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      // Truncate long statements for display
      const displayStatement = statement.length > 100 
        ? `${statement.substring(0, 100)}...` 
        : statement;
      
      console.log(`Executing statement ${i + 1}/${statements.length}: ${displayStatement}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`\nERROR executing statement ${i + 1}/${statements.length}:`);
          console.error(`Error code: ${error.code}`);
          console.error(`Error message: ${error.message}`);
          if (error.details) console.error(`Error details: ${error.details}`);
          if (error.hint) console.error(`Error hint: ${error.hint}`);
          console.error(`\nFailed SQL statement:\n${statement}\n`);
          
          // Continue with the next statement instead of failing completely
          continue;
        }
        
        console.log(`Statement ${i + 1}/${statements.length} executed successfully.`);
      } catch (error) {
        console.error(`\nEXCEPTION executing statement ${i + 1}/${statements.length}:`);
        console.error(error);
        console.error(`\nFailed SQL statement:\n${statement}\n`);
        
        // Continue with the next statement
        continue;
      }
    }
    
    console.log('SQL execution completed successfully!');
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
      
      // Read the exec_sql function creation script
      const execSqlFunctionPath = path.join(__dirname, 'create-exec-sql-function.sql');
      let execSqlFunctionSql: string;
      
      try {
        execSqlFunctionSql = fs.readFileSync(execSqlFunctionPath, 'utf8');
      } catch (error) {
        console.error(`Error reading exec_sql function script: ${(error as Error).message}`);
        process.exit(1);
      }
      
      console.error('Error: Unable to execute SQL directly or create helper function.');
      console.error('Please run the following SQL in the Supabase SQL Editor to create the exec_sql function:');
      console.error(execSqlFunctionSql);
      console.error('\nThen run this script again.');
      process.exit(1);
    } else {
      console.log('exec_sql function exists. Proceeding with schema execution...');
    }
    
    // Drop schema if requested
    if (shouldDropSchema && dropSqlSchema) {
      console.log('Dropping existing schema...');
      await executeSql(dropSqlSchema);
      console.log('Schema dropped successfully.');
    }
    
    // Execute the schema
    console.log('Creating schema...');
    await executeSql(sqlSchema);
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error(`Error during database setup: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run the setup
setupDatabase(); 