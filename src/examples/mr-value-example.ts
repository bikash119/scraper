/**
 * Example script for fetching market rate values for random plots from the IGRO Odisha website
 */

import { fetchMRValue } from '@/igro-scraper.js';
import { fetchRandomSample, getRandomItem } from '@/examples/random-sample.js';
import logger from '@/utils/logger.js';

/**
 * Fetches market rate values for random plots
 * 
 * @param initialDelayMs Initial milliseconds to wait between requests (default: 2000ms)
 * @param numPlots Number of plots to fetch market rate values for (default: 4)
 * @returns Promise resolving to an array of market rate value responses
 */
async function fetchMRValueOfRandomPlots(initialDelayMs: number = 2000, numPlots: number = 4): Promise<any[]> {
  try {
    logger.info('Fetching random sample data...');
    const state = await fetchRandomSample(initialDelayMs);
    
    // Extract district, registration office, village, and plots
    const district = state.districts[0];
    const office = district.registration_offices[0];
    const village = office.villages[0];
    const plots = village.plots;
    
    logger.info(`Found ${plots.length} plots in the random sample`);
    
    if (plots.length === 0) {
      throw new Error('No plots found in the random sample');
    }
    
    // Select random plots (up to numPlots)
    const selectedPlots = plots.length <= numPlots 
      ? plots 
      : Array.from({ length: numPlots }, () => getRandomItem(plots));
    
    logger.info(`Selected ${selectedPlots.length} plots for MR value requests`);
    
    // Track current delay (will increase exponentially)
    let currentDelayMs = initialDelayMs;
    
    // Make requests to GetMRVal endpoint for each plot
    const mrValueResponses = [];
    
    for (let i = 0; i < selectedPlots.length; i++) {
      const plot = selectedPlots[i];
      
      logger.info(`Making request ${i + 1}/${selectedPlots.length} for plot ${plot.plot_number} (ID: ${plot.id})`);
      
      // Prepare payload
      const payload = {
        Dist: district.id,
        RegoffId: office.id,
        village: village.id,
        Plot: plot.plot_number,
        Area: "1",       // Static value as per requirements
        Unit: "1",       // Static value as per requirements
        unitTest: "Acre" // Static value as per requirements
      };
      
      logger.debug('Request payload:', payload);
      
      try {
        // Make POST request to GetMRVal endpoint
        const response = await fetchMRValue(payload);
        
        logger.info(`Response for plot ${plot.plot_number} received`);
        logger.debug(`Response details:`, response);
        
        mrValueResponses.push({
          plot,
          payload,
          response
        });
      } catch (error: any) {
        logger.error(`Error fetching MR value for plot ${plot.plot_number}:`, error.message || String(error));
        mrValueResponses.push({
          plot,
          payload,
          error: error.message || 'Unknown error'
        });
      }
      
      // Add exponential delay before next request (if not the last plot)
      if (i < selectedPlots.length - 1) {
        logger.info(`Waiting ${currentDelayMs}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, currentDelayMs));
        
        // Increase delay exponentially
        currentDelayMs *= 2;
      }
    }
    
    return mrValueResponses;
  } catch (error) {
    logger.error('Error fetching MR values:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Main function to run the MR value example
 */
async function main() {
  try {
    logger.info('Starting IGRO Odisha MR value requests for random plots...');
    
    // Fetch MR values with a 2-second initial delay between requests
    const initialDelayMs = 2000;
    logger.info(`Using initial delay of ${initialDelayMs}ms (will increase exponentially)`);
    
    const mrValueResponses = await fetchMRValueOfRandomPlots(initialDelayMs);
    
    logger.info('MR value requests completed successfully');
    logger.info(`Received ${mrValueResponses.length} responses`);
    
    // Print summary of responses
    logger.info('\nSummary of MR Value Responses:');
    mrValueResponses.forEach((result, index) => {
      logger.info(`\nResponse ${index + 1}:`);
      logger.info(`Plot Number: ${result.plot.plot_number}`);
      logger.info(`Plot Type: ${result.plot.plot_type || 'N/A'}`);
      
      if (result.error) {
        logger.error(`Error: ${result.error}`);
      } else {
        if (result.response.parsed) {
          logger.info('Parsed Response:', result.response.parsed);
        } else {
          logger.info('Raw Response:', result.response);
        }
      }
    });
  } catch (error) {
    logger.error('Error running MR value example:', error instanceof Error ? error.message : String(error));
  }
}
export { fetchMRValueOfRandomPlots };
// Run the main function
main(); 