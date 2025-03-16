/**
 * Example demonstrating how to use the ScrapingSession class
 */

import { ScrapingSession, ScrapingSessionConfig } from '@/core/scraping-session.js';
import { 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  Task
} from '@/core/types/worker.js';
import { DistrictPayload, DistrictResult } from '@/controllers/district-controller.js';
import logger from '@/utils/logger.js';

/**
 * Simple HTTP client implementation
 */
const httpClient = {
  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    logger.info(`GET request to ${url}`);
    // In a real implementation, this would make an actual HTTP request
    return {} as T;
  },
  
  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<T> {
    logger.info(`POST request to ${url}`);
    // In a real implementation, this would make an actual HTTP request
    return {} as T;
  }
};

/**
 * Session data provider
 */
const sessionProvider = () => ({
  antiXsrfToken: 'mock-token',
  cookies: ['session=123'],
  data: '',
  districts: {
    '1': 'District 1',
    '2': 'District 2',
    '3': 'District 3'
  }
});

/**
 * Main function to run the example
 */
async function main() {
  // Create scraping session config
  const config: ScrapingSessionConfig = {
    resourceLimits: {
      maxConcurrentWorkers: 10,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000
    },
    baseUrl: 'https://api.example.com',
    httpClient,
    sessionProvider,
    headers: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  };
  
  // Create scraping session
  const session = new ScrapingSession(config);
  
  // Initialize the session (this will create controllers and workers)
  await session.initialize();
  
  // Example 1: Using the district controller
  await useDistrictController(session);
  
  // Example 2: Using the registration office controller
  await useRegistrationOfficeController(session);
  
  // Stop the session
  await session.stop();
}

/**
 * Example of using the district controller
 * 
 * @param session - Scraping session
 */
async function useDistrictController(session: ScrapingSession) {
  logger.info('=== District Controller Example ===');
  
  // Get the district controller
  const districtController = session.getController<DistrictPayload, DistrictResult[]>('district');
  
  if (!districtController) {
    logger.error('District controller not found');
    return;
  }
  
  // Create tasks
  const tasks: Task<DistrictPayload>[] = [
    { id: '1', payload: { stateId: '1' } },
    { id: '2', payload: { stateId: '2' } }
  ];
  
  // Execute tasks
  logger.info('Executing district tasks...');
  const results = await districtController.execute(tasks);
  
  // Log results
  logger.info(`Completed ${results.length} district tasks`);
  results.forEach(result => {
    if (result.success) {
      logger.info(`Task ${result.taskId} succeeded with ${result.data?.length} districts`);
    } else {
      logger.error(`Task ${result.taskId} failed: ${result.error}`);
    }
  });
}

/**
 * Example of using the registration office controller
 * 
 * @param session - Scraping session
 */
async function useRegistrationOfficeController(session: ScrapingSession) {
  logger.info('=== Registration Office Controller Example ===');
  
  // Get the registration office controller
  const registrationOfficeController = session.getController<RegistrationOfficePayload, RegistrationOfficeResult>('registration-office');
  
  if (!registrationOfficeController) {
    logger.error('Registration office controller not found');
    return;
  }
  
  // Create tasks
  const tasks: Task<RegistrationOfficePayload>[] = [
    { id: '1', payload: { districtId: '1' } },
    { id: '2', payload: { districtId: '2' } },
    { id: '3', payload: { districtId: '3' } }
  ];
  
  // Execute tasks
  logger.info('Executing registration office tasks...');
  const results = await registrationOfficeController.execute(tasks);
  
  // Log results
  logger.info(`Completed ${results.length} registration office tasks`);
  results.forEach(result => {
    if (result.success) {
      logger.info(`Task ${result.taskId} succeeded with ${result.data?.length} registration offices`);
    } else {
      logger.error(`Task ${result.taskId} failed: ${result.error}`);
    }
  });
}

// Run the example
main().catch(error => {
  logger.error('Error running example:', error);
}); 