/**
 * Example of using the controller architecture
 */

import { RegistrationOfficeController } from '@/controllers/registration-office-controller.js';
import { AxiosHttpClient } from '@/utils/http-client.js';
import { SessionProvider } from '@/utils/session-provider.js';
import logger from '@/utils/logger.js';
import { RegistrationOffice } from '@/core/types/state.js';
import { WorkerPoolManager } from '@/core/worker-pool-manager.js';

/**
 * Main function to demonstrate the controller architecture
 */
async function main() {
  try {
    // Initialize session
    const baseUrl = 'https://igrodisha.gov.in';
    const benchmarkPath = '/ViewFeeValue.aspx';
    const sessionProvider = new SessionProvider(baseUrl, benchmarkPath);
    const httpClient = sessionProvider.getHttpClient();
    
    logger.info('Initializing session...');
    await sessionProvider.initialize();
    logger.info('Session initialized');
    
    // Get session data
    const sessionData = sessionProvider.getSessionData();
    logger.info(`AntiXsrfToken received as part of session initialization: ${sessionData.antiXsrfToken}`);
    
    // Get district IDs
    const districtIds = Object.keys(sessionData.districts);
    logger.info(`Found ${districtIds.length} districts: ${Object.values(sessionData.districts).join(', ')}`);
    
    // Create worker pool manager
    const workerPoolManager = new WorkerPoolManager({
      maxConcurrentWorkers: 10,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000
    });
    
    // Create registration office worker pool
    const registrationOfficePool = workerPoolManager.createPool<any, any>({
      name: 'registration-office-pool',
      maxWorkers: 3
    });
    
    // Create registration office controller with 3 workers
    const controller = new RegistrationOfficeController({
      maxConcurrentWorkers: 3,
      maxTasksPerWorker: 5,
      workerLaunchDelayMs: 500,
      workerPool: registrationOfficePool,
      baseUrl,
      httpClient,
      sessionProvider: () => sessionProvider.getSessionData(),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Fetch registration offices for all districts
    logger.info('Fetching registration offices for all districts...');
    const startTime = Date.now();
    
    const offices: RegistrationOffice[] = await controller.fetchRegistrationOffices(districtIds.slice(0, 6));
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    logger.info(`Fetched ${offices.length} registration offices in ${duration.toFixed(2)} seconds`);
    
    // Log the first few offices
    const sampleOffices = offices.slice(0, 5);
    logger.info('Sample offices:', sampleOffices);
    
    // Log controller status
    const status = controller.getStatus();
    logger.info('Controller status:', status);
    
  } catch (error) {
    logger.error('Error in main:', error);
  }
}

// Run the example
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 