/**
 * Example of using the controller architecture
 */

import { Factory } from '../utils/factory.js';
import logger from '../utils/logger.js';

/**
 * Main function to demonstrate the controller architecture
 */
async function main() {
  try {
    // Get factory instance
    const factory = Factory.getInstance();
    
    // Initialize session
    await factory.initialize();
    
    // Get session data
    const sessionData = factory.getSessionProvider().getSessionData();
    
    // Get district IDs
    const districtIds = Object.keys(sessionData.districts);
    logger.info(`Found ${districtIds.length} districts: ${Object.values(sessionData.districts).join(', ')}`);
    
    // Create registration office controller with 3 workers
    const controller = factory.createRegistrationOfficeController(3, 1000, 500);
    
    // Fetch registration offices for all districts
    logger.info('Fetching registration offices for all districts...');
    const startTime = Date.now();
    
    const offices = await controller.fetchRegistrationOffices(districtIds);
    
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