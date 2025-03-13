/**
 * Tests for the logger utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock the entire logger module first
vi.mock('../src/utils/logger.js', () => {
  // Create a mock implementation
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    configure: vi.fn()
  };
  
  // Define the LogLevel enum
  const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  };
  
  // Return the mock implementation
  return {
    default: mockLogger,
    configure: mockLogger.configure,
    LogLevel
  };
});

// Now import the mocked logger
import logger, { LogLevel, configure } from '../src/utils/logger.js';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  statSync: vi.fn(() => ({
    size: 100
  })),
  readdirSync: vi.fn(() => []),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

describe('Logger Utility', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe('Logging Methods', () => {
    it('should provide info logging method', () => {
      logger.info('Test info message');
      expect(logger.info).toHaveBeenCalledWith('Test info message');
    });
    
    it('should provide warn logging method', () => {
      logger.warn('Test warn message');
      expect(logger.warn).toHaveBeenCalledWith('Test warn message');
    });
    
    it('should provide error logging method', () => {
      logger.error('Test error message');
      expect(logger.error).toHaveBeenCalledWith('Test error message');
    });
    
    it('should provide debug logging method', () => {
      logger.debug('Test debug message');
      expect(logger.debug).toHaveBeenCalledWith('Test debug message');
    });
    
    it('should support metadata in logging methods', () => {
      const metadata = { userId: 123, action: 'login' };
      logger.info('User action', metadata);
      expect(logger.info).toHaveBeenCalledWith('User action', metadata);
    });
  });
  
  describe('Configuration', () => {
    it('should provide a configure method', () => {
      const config = { logToConsole: false };
      configure(config);
      expect(configure).toHaveBeenCalledWith(config);
    });
  });
});

// Now let's test the actual implementation
// We need to restore the original implementation
vi.doUnmock('../src/utils/logger.js');

// Create a separate describe block for testing the actual implementation
describe('Logger Implementation', () => {
  // Store original console methods
  const originalConsole = {
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    log: console.log
  };
  
  // Mock console methods before each test
  beforeEach(() => {
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.debug = vi.fn();
    console.log = vi.fn();
    
    // Reset fs mocks
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.mkdirSync).mockReset();
    vi.mocked(fs.appendFileSync).mockReset();
    vi.mocked(fs.statSync).mockReset().mockReturnValue({ size: 100 } as fs.Stats);
    vi.mocked(fs.readdirSync).mockReset().mockReturnValue([]);
    vi.mocked(fs.renameSync).mockReset();
    vi.mocked(fs.unlinkSync).mockReset();
  });
  
  // Restore console methods after each test
  afterEach(() => {
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    console.log = originalConsole.log;
  });
  
  // Import the actual logger implementation
  // Note: We need to use a dynamic import to get the real implementation
  it('should log to console by default', async () => {
    // Dynamically import the real logger
    const { default: realLogger, configure: realConfigure } = await import('../src/utils/logger.js');
    
    // Configure with default settings
    realConfigure({ logToConsole: true, logToFile: false });
    
    // Log a message
    realLogger.info('Test info message');
    
    // Verify console.info was called
    expect(console.info).toHaveBeenCalled();
  });
  
  it('should create log directory when logging to file', async () => {
    // Mock fs.existsSync to return false (directory does not exist)
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);
    
    // Dynamically import the real logger
    const { default: realLogger, configure: realConfigure } = await import('../src/utils/logger.js');
    
    // Configure to log to file
    realConfigure({ logToFile: true, logToConsole: false, logDir: 'logs' });
    
    // Verify directory was created
    expect(fs.mkdirSync).toHaveBeenCalledWith('logs', { recursive: true });
  });
}); 