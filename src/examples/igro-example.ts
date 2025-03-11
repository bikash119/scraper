/**
 * Example script for the IGRO Odisha scraper
 */

import { initializeSession, fetchRegistrationOffices, fetchAllRegistrationOffices, fetchVillages, fetchPlots, scrapeIGRO } from '../igro-scraper.js';

async function main() {
  try {
    console.log('Starting IGRO Odisha scraper...');
    
    // Choose what to do:
    // 1. Fetch registration offices for a single district
    // 2. Fetch registration offices for all districts
    // 3. Fetch villages for a single registration office
    // 4. Fetch plots for a single village
    // 5. Run the full scraper (with or without villages and plots)
    
    const option: number = 1; // Change this to 1, 2, 3, 4, or 5
    
    // Initialize session and get districts dictionary
    console.log('Initializing session...');
    const sessionData = await initializeSession();
    
    console.log('Districts dictionary:');
    console.log(sessionData.districts);
    console.log(`Total districts: ${Object.keys(sessionData.districts).length}`);
    
    if (option === 1 && Object.keys(sessionData.districts).length > 0) {
      // Option 1: Fetch registration offices for a specific district
      const districtId = Object.keys(sessionData.districts)[0]; // Use first district
      console.log(`Fetching registration offices for district: ${sessionData.districts[districtId]} (ID: ${districtId})`);
      
      const registrationOffices = await fetchRegistrationOffices(sessionData, districtId);
      console.log(`Found ${registrationOffices.length} registration offices:`);
      console.log(registrationOffices);
    } 
    else if (option === 2) {
      // Option 2: Fetch registration offices for all districts with a 2-second delay between requests
      console.log('Fetching registration offices for all districts...');
      const allRegistrationOffices = await fetchAllRegistrationOffices(sessionData, 2000);
      
      // Count total offices
      let totalOffices = 0;
      Object.values(allRegistrationOffices).forEach(offices => {
        totalOffices += offices.length;
      });
      
      console.log(`Fetched a total of ${totalOffices} registration offices`);
      
      // Print offices for each district
      Object.entries(allRegistrationOffices).forEach(([districtId, offices]) => {
        console.log(`District: ${sessionData.districts[districtId]} (ID: ${districtId})`);
        console.log(`Found ${offices.length} registration offices:`);
        console.log(offices);
        console.log('---');
      });
    }
    else if (option === 3) {
      // Option 3: Fetch villages for a single registration office
      
      // First, fetch registration offices for a district
      const districtId = Object.keys(sessionData.districts)[0]; // Use first district
      console.log(`Fetching registration offices for district: ${sessionData.districts[districtId]} (ID: ${districtId})`);
      
      const registrationOffices = await fetchRegistrationOffices(sessionData, districtId);
      console.log(`Found ${registrationOffices.length} registration offices`);
      
      if (registrationOffices.length > 0) {
        // Use the first registration office
        const office = registrationOffices[0];
        console.log(`Fetching villages for registration office: ${office.name} (ID: ${office.id})`);
        
        const villages = await fetchVillages(sessionData, office.id);
        console.log(`Found ${villages.length} villages for registration office ${office.name}:`);
        console.log(villages);
      } else {
        console.log('No registration offices found for this district');
      }
    }
    else if (option === 4) {
      // Option 4: Fetch plots for a single village
      
      // First, fetch registration offices for a district
      const districtId = Object.keys(sessionData.districts)[0]; // Use first district
      console.log(`Fetching registration offices for district: ${sessionData.districts[districtId]} (ID: ${districtId})`);
      
      const registrationOffices = await fetchRegistrationOffices(sessionData, districtId);
      console.log(`Found ${registrationOffices.length} registration offices`);
      
      if (registrationOffices.length > 0) {
        // Use the first registration office
        const office = registrationOffices[0];
        console.log(`Fetching villages for registration office: ${office.name} (ID: ${office.id})`);
        
        const villages = await fetchVillages(sessionData, office.id);
        console.log(`Found ${villages.length} villages for registration office ${office.name}`);
        
        if (villages.length > 0) {
          // Use the first village
          const village = villages[0];
          console.log(`Fetching plots for village: ${village.name} (ID: ${village.id})`);
          
          const plots = await fetchPlots(sessionData, village.id);
          console.log(`Found ${plots.length} plots for village ${village.name}:`);
          console.log(plots);
        } else {
          console.log('No villages found for this registration office');
        }
      } else {
        console.log('No registration offices found for this district');
      }
    }
    else if (option === 5) {
      // Option 5: Run the full scraper with a 2-second initial delay between requests
      // Set the second parameter to true to fetch villages as well
      // Set the third parameter to true to fetch plots as well
      const fetchVillagesFlag = true; // Set to false to skip fetching villages
      const fetchPlotsFlag = true; // Set to false to skip fetching plots
      
      console.log('Running full scraper...');
      console.log(`Fetching villages: ${fetchVillagesFlag ? 'Yes' : 'No'}`);
      console.log(`Fetching plots: ${fetchPlotsFlag ? 'Yes' : 'No'}`);
      
      const initialDelayMs = 2000; // Initial delay that will increase exponentially
      console.log(`Using initial delay of ${initialDelayMs}ms (will increase exponentially)`);
      
      const result = await scrapeIGRO(initialDelayMs, fetchVillagesFlag, fetchPlotsFlag);
      console.log('Scraping completed successfully');
      console.log(`Districts found: ${Object.keys(result.districts).length}`);
      
      // Count total registration offices
      let totalOffices = 0;
      Object.values(result.registrationOffices).forEach(offices => {
        totalOffices += offices.length;
      });
      
      console.log(`Total registration offices: ${totalOffices}`);
      
      // If villages were fetched, count them
      if (fetchVillagesFlag) {
        let totalVillages = 0;
        Object.values(result.villages).forEach(districtVillages => {
          Object.values(districtVillages).forEach(villageList => {
            totalVillages += villageList.length;
          });
        });
        
        console.log(`Total villages: ${totalVillages}`);
        
        // If plots were fetched, count them
        if (fetchPlotsFlag) {
          let totalPlots = 0;
          Object.values(result.plots).forEach(districtPlots => {
            Object.values(districtPlots).forEach(officePlots => {
              Object.values(officePlots).forEach(plotList => {
                totalPlots += plotList.length;
              });
            });
          });
          
          console.log(`Total plots: ${totalPlots}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error running IGRO scraper example:', error);
  }
}

main(); 