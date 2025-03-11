/**
 * IGRO Odisha Scraper
 * 
 * Scrapes land valuation data from the IGRO Odisha website
 * https://igrodisha.gov.in/ViewFeeValue.aspx
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { RegistrationOffice, Village, Plot,} from './types/state.js';
import logger from './utils/logger.js';

/**
 * Base URL for the IGRO Odisha website
 */
const BASE_URL = 'https://igrodisha.gov.in';

/**
 * URL for the benchmark valuation page
 */
const BENCHMARK_URL = `${BASE_URL}/ViewFeeValue.aspx`;

/**
 * Interface for the session data
 */
interface SessionData {
  antiXsrfToken: string;
  cookies: string[];
  data: string;
  districts: Record<string, string>;
}

/**
 * Sleep function to add delay between requests
 * 
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initializes a session with the IGRO Odisha website
 * 
 * @returns Promise resolving to session data including the anti-XSRF token
 */
export async function initializeSession(): Promise<SessionData> {
  try {
    logger.info(`Making initial request to ${BENCHMARK_URL}...`);
    
    // Make initial request to get cookies and form data
    const response = await axios.get(BENCHMARK_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    logger.info(`Response status: ${response.status}`);
    
    // Extract cookies from response headers
    const cookies = response.headers['set-cookie'] || [];
    logger.info(`Cookies found: ${cookies.length}`);
    
    // Find the anti-XSRF token in cookies
    let antiXsrfToken = '';
    for (const cookie of cookies) {
      if (cookie.includes('__AntiXsrfToken')) {
        const match = cookie.match(/__AntiXsrfToken=([^;]+)/);
        if (match && match[1]) {
          antiXsrfToken = match[1];
          break;
        }
      }
    }
    logger.info(`Anti-XSRF token found: ${antiXsrfToken ? 'Yes' : 'No'}`);

    // Parse the HTML response
    const $ = cheerio.load(response.data);
    logger.info('HTML loaded with cheerio');
    
    // Extract form data
    const data = $('input[name="__VIEWSTATE"]').val() as string || '';
    logger.info(`VIEWSTATE found: ${data ? 'Yes' : 'No'}`);

    // Check if the district dropdown exists
    const districtDropdown = $('#ContentPlaceHolder1_ddldist');
    logger.info(`District dropdown found: ${districtDropdown.length > 0 ? 'Yes' : 'No'}`);
    
    // Extract districts from the select element
    const districts: Record<string, string> = {};
    $('#ContentPlaceHolder1_ddldist option').each((_, element) => {
      const value = $(element).val() as string;
      const text = $(element).text().trim();
      if (value && value !== '0') { // Skip the default "Select" option if it has value="0"
        districts[value] = text;
      }
    });
    
    logger.info(`Districts found: ${Object.keys(districts).length}`);
    
    return {
      antiXsrfToken,
      cookies,
      data,
      districts
    };
  } catch (error) {
    logger.error('Error initializing session:');
    if (axios.isAxiosError(error)) {
      logger.error(`Status: ${error.response?.status}`);
      logger.error(`Message: ${error.message}`);
      logger.error(`Response data: ${JSON.stringify(error.response?.data || {})}`);
    } else if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(String(error));
    }
    throw new Error('Failed to initialize session with IGRO Odisha website');
  }
}


/**
 * Fetches registration offices for a specific district
 * 
 * @param sessionData Session data containing cookies and anti-XSRF token
 * @param districtId District ID to fetch registration offices for
 * @returns Promise resolving to an array of registration centers
 */
export async function fetchRegistrationOffices(
  sessionData: SessionData,
  districtId: string
): Promise<RegistrationOffice[]> {
  try {
    logger.info(`Fetching registration offices for district ID: ${districtId} (${sessionData.districts[districtId]})`);
    
    // Prepare request headers with cookies and anti-XSRF token
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL,
      'Referer': BENCHMARK_URL,
    };
    
    // Add anti-XSRF token to headers if available
    if (sessionData.antiXsrfToken) {
      headers['__AntiXsrfToken'] = sessionData.antiXsrfToken;
    }
    
    // Add cookies to headers
    if (sessionData.cookies.length > 0) {
      const cookieHeader = sessionData.cookies.map(cookie => cookie.split(';')[0]).join('; ');
      headers['Cookie'] = cookieHeader;
    }
    
    // Make POST request to fetch registration offices
    const response = await axios.post(
      `${BENCHMARK_URL}/GetRegoffice`,
      { distId: districtId },
      { headers }
    );
    
    // Parse response data
    const offices: RegistrationOffice[] = [];
    
    if (response.data && response.data.d) {
      const data = response.data.d;
      if (Array.isArray(data)) {
        data.forEach((office: any) => {
          offices.push({
            id: office.REGOFF_ID.toString(),
            name: office.REGOFF_NAME,
            head_id: office.REGOFF_HEAD_ID.toString(),
            office_initial: office.REGOFF_INITIAL,
            type_id: office.REGOFF_TYPE_ID.toString(),
            active: Boolean(office.REGOFF_ACTIVE),
            villages: [] // Initialize with empty villages array
          });
        });
      }
    }
    
    logger.info(`Found ${offices.length} registration offices for district ${sessionData.districts[districtId]}`);
    return offices;
  } catch (error) {
    logger.error(`Error fetching registration offices for district ID ${districtId}:`);
    if (axios.isAxiosError(error)) {
      logger.error(`Status: ${error.response?.status}`);
      logger.error(`Message: ${error.message}`);
      logger.error(`Response data: ${JSON.stringify(error.response?.data || {})}`);
    } else if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(String(error));
    }
    throw new Error(`Failed to fetch registration offices for district ID ${districtId}`);
  }
}

/**
 * Fetches registration offices for all districts
 * 
 * @param sessionData Session data containing cookies, anti-XSRF token, and districts
 * @param delayMs Milliseconds to wait between requests (default: 1000ms)
 * @returns Promise resolving to a map of district IDs to registration centers
 */
export async function fetchAllRegistrationOffices(
  sessionData: SessionData,
  delayMs: number = 1000
): Promise<Record<string, RegistrationOffice[]>> {
  const result: Record<string, RegistrationOffice[]> = {};
  const districtIds = Object.keys(sessionData.districts);
  
  logger.info(`Fetching registration offices for ${districtIds.length} districts with ${delayMs}ms delay between requests...`);
  
  for (let i = 0; i < districtIds.length; i++) {
    const districtId = districtIds[i];
    try {
      // Fetch registration offices for the current district
      const offices = await fetchRegistrationOffices(sessionData, districtId);
      result[districtId] = offices;
      
      // Add delay before next request (except for the last district)
      if (i < districtIds.length - 1) {
        logger.info(`Waiting ${delayMs}ms before next request...`);
        await sleep(delayMs);
      }
    } catch (error) {
      logger.error(`Error fetching registration offices for district ${sessionData.districts[districtId]}:`, error);
      // Continue with next district even if this one fails
      result[districtId] = [];
    }
  }
  
  return result;
}

/**
 * Fetches villages for a specific registration office
 * 
 * @param sessionData Session data containing cookies and anti-XSRF token
 * @param registrationOfficeId ID of the registration office to fetch villages for
 * @returns Promise resolving to an array of villages
 */
export async function fetchVillages(
  sessionData: SessionData,
  registrationOfficeId: string
): Promise<Village[]> {
  try {
    logger.info(`Fetching villages for registration office ID: ${registrationOfficeId}`);
    
    // Prepare request headers with cookies and anti-XSRF token
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL,
      'Referer': BENCHMARK_URL,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    };
    
    // Add anti-XSRF token to headers if available
    if (sessionData.antiXsrfToken) {
      headers['__AntiXsrfToken'] = sessionData.antiXsrfToken;
    }
    
    // Add cookies to headers
    if (sessionData.cookies.length > 0) {
      const cookieHeader = sessionData.cookies.map(cookie => cookie.split(';')[0]).join('; ');
      headers['Cookie'] = cookieHeader;
    }
    
    // Make POST request to fetch villages
    const response = await axios.post(
      `${BENCHMARK_URL}/GetVillage`,
      { RegoffId: registrationOfficeId },
      { headers }
    );
    
    // Parse response data
    const villages: Village[] = [];
    
    if (response.data && response.data.d) {
      const data = response.data.d;
      if (Array.isArray(data)) {
        data.forEach((village: any) => {
          villages.push({
            id: village.VILL_ID.toString(),
            name: village.VILL_NAME,
            plots: []
          });
        });
      }
    }
    
    logger.info(`Found ${villages.length} villages for registration office ID ${registrationOfficeId}`);
    return villages;
  } catch (error) {
    logger.error(`Error fetching villages for registration office ID ${registrationOfficeId}:`);
    if (axios.isAxiosError(error)) {
      logger.error(`Status: ${error.response?.status}`);
      logger.error(`Message: ${error.message}`);
      logger.error(`Response data: ${JSON.stringify(error.response?.data || {})}`);
    } else if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(String(error));
    }
    throw new Error(`Failed to fetch villages for registration office ID ${registrationOfficeId}`);
  }
}

/**
 * Fetches villages for all registration offices in a district
 * 
 * @param sessionData Session data containing cookies and anti-XSRF token
 * @param registrationOffices Array of registration offices to fetch villages for
 * @param delayMs Milliseconds to wait between requests (default: 1000ms)
 * @returns Promise resolving to a map of registration office IDs to villages
 */
export async function fetchAllVillages(
  sessionData: SessionData,
  registrationOffices: RegistrationOffice[],
  delayMs: number = 1000
): Promise<Record<string, Village[]>> {
  const result: Record<string, Village[]> = {};
  
  logger.info(`Fetching villages for ${registrationOffices.length} registration offices with ${delayMs}ms delay between requests...`);
  
  for (let i = 0; i < registrationOffices.length; i++) {
    const office = registrationOffices[i];
    try {
      // Fetch villages for the current registration office
      const villages = await fetchVillages(sessionData, office.id);
      result[office.id] = villages;
      
      // Update the registration office with the villages
      office.villages = villages;
      
      // Add delay before next request (except for the last office)
      if (i < registrationOffices.length - 1) {
        logger.info(`Waiting ${delayMs}ms before next request...`);
        await sleep(delayMs);
      }
    } catch (error) {
      logger.error(`Error fetching villages for registration office ${office.name} (ID: ${office.id}):`, error);
      // Continue with next office even if this one fails
      result[office.id] = [];
    }
  }
  
  return result;
}

/**
 * Fetches plot details for a specific village
 * 
 * @param sessionData Session data containing cookies and anti-XSRF token
 * @param villageId ID of the village to fetch plot details for
 * @returns Promise resolving to an array of plots
 */
export async function fetchPlots(
  sessionData: SessionData,
  villageId: string
): Promise<Plot[]> {
  try {
    logger.info(`Fetching plots for village ID: ${villageId}`);
    
    // Prepare request headers with cookies and anti-XSRF token
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL,
      'Referer': BENCHMARK_URL,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    };
    
    // Add anti-XSRF token to headers if available
    if (sessionData.antiXsrfToken) {
      headers['__AntiXsrfToken'] = sessionData.antiXsrfToken;
    }
    
    // Add cookies to headers
    if (sessionData.cookies.length > 0) {
      const cookieHeader = sessionData.cookies.map(cookie => cookie.split(';')[0]).join('; ');
      headers['Cookie'] = cookieHeader;
    }
    
    // Make POST request to fetch plot details
    const response = await axios.post(
      `${BENCHMARK_URL}/GetPlotDtl`,
      { StrVillageId: villageId },
      { headers }
    );
    
    // Parse response data
    const plots: Plot[] = [];
    
    if (response.data && response.data.d) {
      const data = response.data.d;
      if (Array.isArray(data)) {
        data.forEach((plot: any) => {
          plots.push({
            plot_number: plot.One,
            plot_id: plot.One,
            name: plot.One,
            id: plot.One
          });
        });
      }
    }
    
    logger.info(`Found ${plots.length} plots for village ID ${villageId}`);
    return plots;
  } catch (error) {
    logger.error(`Error fetching plots for village ID ${villageId}:`);
    if (axios.isAxiosError(error)) {
      logger.error(`Status: ${error.response?.status}`);
      logger.error(`Message: ${error.message}`);
      logger.error(`Response data: ${JSON.stringify(error.response?.data || {})}`);
    } else if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(String(error));
    }
    throw new Error(`Failed to fetch plots for village ID ${villageId}`);
  }
}

/**
 * Fetches plots for all villages in a registration office
 * 
 * @param sessionData Session data containing cookies and anti-XSRF token
 * @param villages Array of villages to fetch plots for
 * @param delayMs Milliseconds to wait between requests (default: 1000ms)
 * @returns Promise resolving to a map of village IDs to plots
 */
export async function fetchAllPlots(
  sessionData: SessionData,
  villages: Village[],
  delayMs: number = 1000
): Promise<Record<string, Plot[]>> {
  const result: Record<string, Plot[]> = {};
  
  logger.info(`Fetching plots for ${villages.length} villages with ${delayMs}ms delay between requests...`);
  
  for (let i = 0; i < villages.length; i++) {
    const village = villages[i];
    try {
      // Fetch plots for the current village
      const plots = await fetchPlots(sessionData, village.id);
      result[village.id] = plots;
      
      // Update the village with the plots
      village.plots = plots;
      
      // Add delay before next request (except for the last village)
      if (i < villages.length - 1) {
        logger.info(`Waiting ${delayMs}ms before next request...`);
        await sleep(delayMs);
      }
    } catch (error) {
      logger.error(`Error fetching plots for village ${village.name} (ID: ${village.id}):`, error);
      // Continue with next village even if this one fails
      result[village.id] = [];
    }
  }
  
  return result;
}

/**
 * Parsed market rate value response
 */
export interface MRValueResponse {
  area: string;
  unit: string;
  marketValue: number;
  registrationFee: number;
  stampDuty: number;
  additionalStampDuty: number;
  totalValue: number;
  additionalInfo?: string;
  notes?: string;
}

/**
 * Parses the market rate value response string into a structured object
 * 
 * @param responseData Response data string from GetMRVal endpoint (format: "area - unit@$value1@$value2...")
 * @returns Parsed market rate value response object
 */
export function parseMRValueResponse(responseData: string): MRValueResponse {
  try {
    // Response format: "area - unit@$value1@$value2@$value3@$value4@$value5@$value6@$value7@$value8"
    const parts = responseData.split('@$');
    
    // First part contains area and unit (format: "area - unit")
    const areaUnitParts = parts[0].split(' - ');
    const area = areaUnitParts[0].trim();
    const unit = areaUnitParts[1].trim();
    
    // Parse numeric values (remove $ prefix and convert to number)
    const marketValue = parseFloat(parts[1].replace(/,/g, '')) || 0;
    const registrationFee = parseFloat(parts[2].replace(/,/g, '')) || 0;
    const stampDuty = parseFloat(parts[3].replace(/,/g, '')) || 0;
    const additionalStampDuty = parseFloat(parts[4].replace(/,/g, '')) || 0;
    const totalValue = parseFloat(parts[5].replace(/,/g, '')) || 0;
    const additionalInfo = parts[6] !== '' ? parts[6] : undefined;
    const notes = parts[7] !== 'NA' ? parts[7] : undefined;
    
    return {
      area,
      unit,
      marketValue,
      registrationFee,
      stampDuty,
      additionalStampDuty,
      totalValue,
      additionalInfo,
      notes
    };
  } catch (error) {
    logger.error('Error parsing MR value response:', error instanceof Error ? error.message : String(error));
    logger.error('Response data:', responseData);
    throw new Error('Failed to parse MR value response');
  }
}

/**
 * Fetches market rate value for a plot
 * 
 * @param payload Payload containing district, registration office, village, plot, area, unit, and unit test information
 * @returns Promise resolving to the market rate value response
 */
export async function fetchMRValue(payload: {
  Dist: string;
  RegoffId: string;
  village: string;
  Plot: string;
  Area: string;
  Unit: string;
  unitTest: string;
}): Promise<any> {
  try {
    logger.info(`Fetching market rate value for plot ${payload.Plot} in village ${payload.village}`);
    
    // Make POST request to GetMRVal endpoint
    const response = await axios.post(
      `${BASE_URL}/ViewFeeValue.aspx/GetMRVal`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        }
      }
    );
    
    logger.info(`Successfully fetched market rate value for plot ${payload.Plot}`);
    
    // Parse the response if it has the expected format
    if (response.data && response.data.d && typeof response.data.d === 'string') {
      try {
        const parsedResponse = parseMRValueResponse(response.data.d);
        return {
          raw: response.data,
          parsed: parsedResponse
        };
      } catch (parseError) {
        logger.warn('Could not parse MR value response', { error: parseError, response: response.data });
        return response.data;
      }
    }
    
    return response.data;
  } catch (error) {
    logger.error(`Error fetching market rate value for plot ${payload.Plot}`, { error });
    if (axios.isAxiosError(error)) {
      logger.error(`HTTP Error Details`, {
        status: error.response?.status,
        message: error.message,
        responseData: error.response?.data || {}
      });
    }
    throw new Error(`Failed to fetch market rate value for plot ${payload.Plot}`);
  }
}

/**
 * Main scraper function that initializes a session and fetches districts, registration offices, villages, and plots
 * 
 * @param initialDelayMs Initial milliseconds to wait between requests (default: 1000ms)
 * @param fetchVillagesFlag Whether to fetch villages for registration offices (default: false)
 * @param fetchPlotsFlag Whether to fetch plots for villages (default: false)
 * @returns Promise resolving to the scraped data
 */
export async function scrapeIGRO(
  initialDelayMs: number = 1000, 
  fetchVillagesFlag: boolean = false,
  fetchPlotsFlag: boolean = false
) {
  try {
    // Initialize session
    logger.info('Initializing session with IGRO Odisha website...');
    const sessionData = await initializeSession();
    logger.info('Session initialized successfully');
    logger.info('Anti-XSRF Token:', sessionData.antiXsrfToken);
    
    // Log districts from the dictionary
    logger.info(`Found ${Object.keys(sessionData.districts).length} districts in the dropdown`);
    
    // Track current delay (will increase exponentially)
    let currentDelayMs = initialDelayMs;
    
    // Fetch registration offices for all districts
    logger.info('Fetching registration offices for all districts...');
    const registrationOffices = await fetchAllRegistrationOffices(sessionData, currentDelayMs);
    
    // Count total registration offices
    let totalOffices = 0;
    Object.values(registrationOffices).forEach(offices => {
      totalOffices += offices.length;
    });
    
    logger.info(`Fetched a total of ${totalOffices} registration offices across ${Object.keys(registrationOffices).length} districts`);
    
    // Increase delay exponentially
    currentDelayMs *= 2;
    logger.info(`Increased delay to ${currentDelayMs}ms`);
    
    // Fetch villages for registration offices if requested
    const villages: Record<string, Record<string, Village[]>> = {};
    const plots: Record<string, Record<string, Record<string, Plot[]>>> = {};
    
    if (fetchVillagesFlag) {
      logger.info('Fetching villages for registration offices...');
      
      // For each district, fetch villages for all registration offices
      for (const [districtId, offices] of Object.entries(registrationOffices)) {
        logger.info(`Fetching villages for district: ${sessionData.districts[districtId]} (ID: ${districtId})`);
        
        // Skip if no registration offices found for this district
        if (offices.length === 0) {
          logger.info(`No registration offices found for district ${sessionData.districts[districtId]}, skipping...`);
          continue;
        }
        
        // Fetch villages for all registration offices in this district
        const districtVillages = await fetchAllVillages(sessionData, offices, currentDelayMs);
        villages[districtId] = districtVillages;
        
        // Count total villages for this district
        let totalVillages = 0;
        Object.values(districtVillages).forEach(villageList => {
          totalVillages += villageList.length;
        });
        
        logger.info(`Fetched a total of ${totalVillages} villages for district ${sessionData.districts[districtId]}`);
        
        // Fetch plots for villages if requested
        if (fetchPlotsFlag && totalVillages > 0) {
          logger.info(`Fetching plots for villages in district: ${sessionData.districts[districtId]} (ID: ${districtId})`);
          
          // Increase delay exponentially
          currentDelayMs *= 2;
          logger.info(`Increased delay to ${currentDelayMs}ms`);
          
          plots[districtId] = {};
          
          // For each registration office, fetch plots for all villages
          for (const [officeId, villageList] of Object.entries(districtVillages)) {
            // Skip if no villages found for this registration office
            if (villageList.length === 0) {
              logger.info(`No villages found for registration office ID ${officeId}, skipping...`);
              continue;
            }
            
            logger.info(`Fetching plots for ${villageList.length} villages in registration office ID ${officeId}...`);
            
            // Fetch plots for all villages in this registration office
            const officePlots = await fetchAllPlots(sessionData, villageList, currentDelayMs);
            plots[districtId][officeId] = officePlots;
            
            // Count total plots for this registration office
            let totalPlots = 0;
            Object.values(officePlots).forEach(plotList => {
              totalPlots += plotList.length;
            });
            
            logger.info(`Fetched a total of ${totalPlots} plots for registration office ID ${officeId}`);
            
            // Add a longer delay between registration offices
            if (Object.keys(districtVillages).indexOf(officeId) < Object.keys(districtVillages).length - 1) {
              // Increase delay exponentially
              currentDelayMs *= 1.5;
              logger.info(`Increased delay to ${currentDelayMs}ms before processing next registration office...`);
              await sleep(currentDelayMs);
            }
          }
        }
        
        // Add a longer delay between districts
        if (Object.keys(registrationOffices).indexOf(districtId) < Object.keys(registrationOffices).length - 1) {
          // Increase delay exponentially
          currentDelayMs *= 1.5;
          logger.info(`Increased delay to ${currentDelayMs}ms before processing next district...`);
          await sleep(currentDelayMs);
        }
      }
      
      // Count total villages
      let totalVillages = 0;
      Object.values(villages).forEach(districtVillages => {
        Object.values(districtVillages).forEach(villageList => {
          totalVillages += villageList.length;
        });
      });
      
      logger.info(`Fetched a total of ${totalVillages} villages across all districts`);
      
      // Count total plots if fetched
      if (fetchPlotsFlag) {
        let totalPlots = 0;
        Object.values(plots).forEach(districtPlots => {
          Object.values(districtPlots).forEach(officePlots => {
            Object.values(officePlots).forEach(plotList => {
              totalPlots += plotList.length;
            });
          });
        });
        
        logger.info(`Fetched a total of ${totalPlots} plots across all villages`);
      }
    }
    
    return {
      sessionData,
      districts: sessionData.districts,
      registrationOffices,
      villages: fetchVillagesFlag ? villages : {},
      plots: fetchVillagesFlag && fetchPlotsFlag ? plots : {}
    };
  } catch (error) {
    logger.error('Error in IGRO scraper:', error);
    throw error;
  }
}

export default {
  initializeSession,
  fetchRegistrationOffices,
  fetchAllRegistrationOffices,
  fetchVillages,
  fetchPlots,
  fetchMRValue,
  scrapeIGRO
}; 