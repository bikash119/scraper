/**
 * Example script for randomly sampling data from the IGRO Odisha website
 */

import { initializeSession, fetchRegistrationOffices, fetchVillages, fetchPlots } from '../igro-scraper.js';
import { State } from '../core/types/state.js';
import logger from '../utils/logger.js';

/**
 * Randomly selects an item from an array
 * 
 * @param array Array to select from
 * @returns Randomly selected item
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Fetches a random sample of data from the hierarchy
 * 
 * @param initialDelayMs Initial milliseconds to wait between requests (default: 1000ms)
 * @returns Promise resolving to a State object
 */
async function fetchRandomSample(initialDelayMs: number = 1000): Promise<State> {
  try {
    // Initialize session
    logger.info('Initializing session...');
    const sessionData = await initializeSession();
    
    // Track current delay (will increase exponentially)
    let currentDelayMs = initialDelayMs;
    
    // 1. Randomly select a district
    const districtIds = Object.keys(sessionData.districts);
    if (districtIds.length === 0) {
      throw new Error('No districts found');
    }
    
    const randomDistrictId = getRandomItem(districtIds);
    const districtName = sessionData.districts[randomDistrictId];
    logger.info(`Randomly selected district: ${districtName} (ID: ${randomDistrictId})`);
    
    // 2. Fetch registration offices for the selected district
    logger.info(`Fetching registration offices for district: ${districtName}`);
    const registrationOffices = await fetchRegistrationOffices(sessionData, randomDistrictId);
    logger.info(`Found ${registrationOffices.length} registration offices for district ${districtName}`);
    
    if (registrationOffices.length === 0) {
      throw new Error(`No registration offices found for district ${districtName}`);
    }
    
    // Add exponential delay before next request
    logger.info(`Waiting ${currentDelayMs}ms before next request...`);
    await new Promise(resolve => setTimeout(resolve, currentDelayMs));
    
    // Increase delay exponentially
    currentDelayMs *= 2;
    
    // 3. Randomly select a registration office
    const randomOffice = getRandomItem(registrationOffices);
    logger.info(`Randomly selected registration office: ${randomOffice.name} (ID: ${randomOffice.id})`);
    
    // 4. Fetch villages for the selected registration office
    logger.info(`Fetching villages for registration office: ${randomOffice.name}`);
    const villages = await fetchVillages(sessionData, randomOffice.id);
    logger.info(`Found ${villages.length} villages for registration office ${randomOffice.name}`);
    
    if (villages.length === 0) {
      throw new Error(`No villages found for registration office ${randomOffice.name}`);
    }
    
    // Add exponential delay before next request
    logger.info(`Waiting ${currentDelayMs}ms before next request...`);
    await new Promise(resolve => setTimeout(resolve, currentDelayMs));
    
    // Increase delay exponentially
    currentDelayMs *= 2;
    
    // 5. Randomly select a village
    const randomVillage = getRandomItem(villages);
    logger.info(`Randomly selected village: ${randomVillage.name} (ID: ${randomVillage.id})`);
    
    // 6. Fetch plots for the selected village
    logger.info(`Fetching plots for village: ${randomVillage.name}`);
    const plots = await fetchPlots(sessionData, randomVillage.id);
    logger.info(`Found ${plots.length} plots for village ${randomVillage.name}`);
    
    // Create a State object
    const state: State = {
      id: 'OD', // Odisha state code
      name: 'Odisha',
      districts: [
        {
          id: randomDistrictId,
          name: districtName,
          registration_offices: [
            {
              ...randomOffice,
              villages: [
                {
                  ...randomVillage,
                  plots: plots.slice(0, 4)
                }
              ]
            }
          ]
        }
      ]
    };
    
    return state;
  } catch (error) {
    logger.error('Error fetching random sample:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Main function to run the random sample example
 */
async function main() {
  try {
    logger.info('Starting IGRO Odisha random sample...');
    
    // Fetch a random sample with a 2-second initial delay between requests
    // This delay will increase exponentially with each API call
    const initialDelayMs = 2000;
    logger.info(`Using initial delay of ${initialDelayMs}ms (will increase exponentially)`);
    
    const state = await fetchRandomSample(initialDelayMs);
    
    logger.info('Random sampling completed successfully');
    logger.debug('State object:', state);
    
    // Print summary
    const district = state.districts[0];
    const office = district.registration_offices[0];
    const village = office.villages[0];
    const plots = village.plots;
    
    logger.info('\nSummary:');
    logger.info(`State: ${state.name}`);
    logger.info(`District: ${district.name} (ID: ${district.id})`);
    logger.info(`Registration Office: ${office.name} (ID: ${office.id})`);
    logger.info(`Village: ${village.name} (ID: ${village.id})`);
    logger.info(`Plots: ${plots.length}`);
    
    if (plots.length > 0) {
      logger.info('\nSample Plot:');
      logger.info(`ID: ${plots[0].id}`);
      logger.info(`Plot Number: ${plots[0].plot_number}`);
      logger.info(`Plot Type: ${plots[0].plot_type || 'N/A'}`);
      logger.info(`Benchmark Value: ${plots[0].benchmark_value || 'N/A'}`);
      logger.info(`Value Per Unit: ${plots[0].value_per_unit || 'N/A'}`);
    }
  } catch (error) {
    logger.error('Error running random sample example:', error instanceof Error ? error.message : String(error));
  }
}

// Export the functions as named exports
export { fetchRandomSample, getRandomItem };

// Run the main function
main(); 