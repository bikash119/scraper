/**
 * Logger utility for the scraper
 * 
 * Provides functions for logging messages to both console and files
 */

import * as fs from 'fs';
import * as path from 'path';

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// Logger configuration
interface LoggerConfig {
  logDir: string;
  logToConsole: boolean;
  logToFile: boolean;
  logLevel: LogLevel;
  maxLogFileSizeBytes: number;
  maxLogFiles: number;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  logDir: 'logs',
  logToConsole: true,
  logToFile: true,
  logLevel: LogLevel.INFO,
  maxLogFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  maxLogFiles: 5
};

// Current configuration
let config: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Configures the logger
 * 
 * @param newConfig New configuration options
 */
export function configure(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
  
  // Create log directory if it doesn't exist
  if (config.logToFile && !fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
}

/**
 * Gets the current timestamp in ISO format
 * 
 * @returns Current timestamp string
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Gets the log file path for the current date
 * 
 * @param level Log level
 * @returns Path to the log file
 */
function getLogFilePath(level: LogLevel): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(config.logDir, `${level.toLowerCase()}-${date}.log`);
}

/**
 * Rotates log files if they exceed the maximum size
 * 
 * @param filePath Path to the log file
 */
function rotateLogFileIfNeeded(filePath: string): void {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    const stats = fs.statSync(filePath);
    
    if (stats.size >= config.maxLogFileSizeBytes) {
      // Get all existing rotated files
      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath);
      const rotatedFiles = fs.readdirSync(dir)
        .filter(file => file.startsWith(baseName) && file !== baseName)
        .sort()
        .reverse();
      
      // Remove oldest files if we have too many
      while (rotatedFiles.length >= config.maxLogFiles - 1) {
        const oldestFile = rotatedFiles.pop();
        if (oldestFile) {
          fs.unlinkSync(path.join(dir, oldestFile));
        }
      }
      
      // Rotate current file
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const newPath = `${filePath}.${timestamp}`;
      fs.renameSync(filePath, newPath);
    }
  } catch (error) {
    console.error(`Error rotating log file: ${error}`);
  }
}

/**
 * Writes a log message to a file
 * 
 * @param level Log level
 * @param message Log message
 * @param meta Additional metadata
 */
function writeToFile(level: LogLevel, message: string, meta?: any): void {
  try {
    const filePath = getLogFilePath(level);
    rotateLogFileIfNeeded(filePath);
    
    const timestamp = getTimestamp();
    let logEntry = `[${timestamp}] [${level}] ${message}`;
    
    if (meta) {
      logEntry += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    logEntry += '\n';
    
    fs.appendFileSync(filePath, logEntry);
  } catch (error) {
    console.error(`Error writing to log file: ${error}`);
  }
}

/**
 * Logs a message at the specified level
 * 
 * @param level Log level
 * @param message Log message
 * @param meta Additional metadata
 */
function log(level: LogLevel, message: string, meta?: any): void {
  // Check if we should log at this level
  const levels = Object.values(LogLevel);
  const configLevelIndex = levels.indexOf(config.logLevel);
  const messageLevelIndex = levels.indexOf(level);
  
  if (messageLevelIndex < configLevelIndex) {
    return;
  }
  
  const timestamp = getTimestamp();
  
  // Log to console if enabled
  if (config.logToConsole) {
    const consoleMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage);
        break;
      case LogLevel.ERROR:
        console.error(consoleMessage);
        break;
    }
    
    if (meta) {
      console.log(meta);
    }
  }
  
  // Log to file if enabled
  if (config.logToFile) {
    writeToFile(level, message, meta);
  }
}

/**
 * Logs a debug message
 * 
 * @param message Log message
 * @param meta Additional metadata
 */
export function debug(message: string, meta?: any): void {
  log(LogLevel.DEBUG, message, meta);
}

/**
 * Logs an info message
 * 
 * @param message Log message
 * @param meta Additional metadata
 */
export function info(message: string, meta?: any): void {
  log(LogLevel.INFO, message, meta);
}

/**
 * Logs a warning message
 * 
 * @param message Log message
 * @param meta Additional metadata
 */
export function warn(message: string, meta?: any): void {
  log(LogLevel.WARN, message, meta);
}

/**
 * Logs an error message
 * 
 * @param message Log message
 * @param meta Additional metadata
 */
export function error(message: string, meta?: any): void {
  log(LogLevel.ERROR, message, meta);
}

// Initialize logger
configure({});

// Export default logger functions
export default {
  configure,
  debug,
  info,
  warn,
  error
}; 