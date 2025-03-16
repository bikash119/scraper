/**
 * Database Example for IGRO Odisha Scraper
 * 
 * This example demonstrates how to use the data access layer to store scraped data in the database.
 * 
 * Usage:
 * npm run example:db
 */

import { 
  createScrapingSession, 
  updateScrapingSession,
  upsertDistrict,
  upsertRegistrationOffice,
  upsertVillage,
  upsertPlot,
  upsertMarketRateValue,
  getCurrentDistricts
} from '../db';

import { fetchRandomSample } from './random-sample';
import { fetchMRValueOfRandomPlots } from './mr-value-example';

/**
 * Stores a random sample of data in the database
 * @param initialDelayMs - Initial delay between requests in milliseconds
 */
async function storeRandomSample(initialDelayMs: number = 2000): Promise<void> {
  console.log('Starting database example...');
  
  // Create a new scraping session
  const sessionId = await createScrapingSession();
  if (!sessionId) {
    console.error('Failed to create scraping session');
    return;
  }
  
  console.log(`Created scraping session with ID: ${sessionId}`);
  
  try {
    // Update session status
    await updateScrapingSession(sessionId, {
      status: 'in_progress',
      items_scraped: 0,
      error_count: 0,
      notes: 'Fetching random sample'
    });
    
    // Fetch a random sample
    console.log('Fetching random sample...');
    const sample = await fetchRandomSample(initialDelayMs);
    
    if (!sample || !sample.districts || sample.districts.length === 0) {
      throw new Error('Failed to fetch random sample');
    }
    
    // Extract the components from the sample
    // The sample is a State object with districts, registration_offices, villages, and plots
    const district = sample.districts[0];
    const registrationOffice = district.registration_offices[0];
    const village = registrationOffice.villages[0];
    const plots = village.plots || [];
    
    console.log(`Storing district: ${district.name}`);
    const districtUuid = await upsertDistrict({
      district_id: district.id,
      name: district.name
    });
    
    if (!districtUuid) {
      throw new Error('Failed to store district');
    }
    
    console.log(`Storing registration office: ${registrationOffice.name}`);
    const registrationOfficeUuid = await upsertRegistrationOffice(
      {
        registration_office_id: registrationOffice.id,
        name: registrationOffice.name,
        district_id: district.id,
        district_name: district.name
      },
      districtUuid
    );
    
    if (!registrationOfficeUuid) {
      throw new Error('Failed to store registration office');
    }
    
    console.log(`Storing village: ${village.name}`);
    const villageUuid = await upsertVillage(
      {
        village_id: village.id,
        name: village.name,
        registration_office_id: registrationOffice.id,
        registration_office_name: registrationOffice.name,
        district_id: district.id,
        district_name: district.name
      },
      registrationOfficeUuid,
      districtUuid
    );
    
    if (!villageUuid) {
      throw new Error('Failed to store village');
    }
    
    console.log(`Storing ${plots.length} plots...`);
    let plotCount = 0;
    let errorCount = 0;
    
    for (const plot of plots) {
      try {
        const plotUuid = await upsertPlot(
          {
            plot_id: plot.id,
            plot_no: plot.plot_number,
            khata_no: plot.plot_id,
            area: plot.area,
            area_unit: plot.area_unit,
            plot_type: plot.plot_type,
            village_id: village.id,
            village_name: village.name,
            registration_office_id: registrationOffice.id,
            registration_office_name: registrationOffice.name,
            district_id: district.id,
            district_name: district.name
          },
          villageUuid,
          registrationOfficeUuid,
          districtUuid
        );
        
        if (plotUuid) {
          plotCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error storing plot: ${error}`);
        errorCount++;
      }
    }
    
    console.log(`Successfully stored ${plotCount} plots with ${errorCount} errors`);
    
    // Fetch and store market rate values for a few random plots
    console.log('Fetching market rate values for random plots...');
    const mrValues = await fetchMRValueOfRandomPlots(initialDelayMs, 2);
    
    if (mrValues && mrValues.length > 0) {
      console.log(`Storing ${mrValues.length} market rate values...`);
      let mrValueCount = 0;
      
      for (const mrValue of mrValues) {
        try {
          // First, store the plot
          const plotUuid = await upsertPlot(
            {
              plot_id: mrValue.plot.id,
              plot_no: mrValue.plot.plotNo,
              khata_no: mrValue.plot.khataNo,
              area: parseFloat(mrValue.plot.area) || undefined,
              area_unit: mrValue.plot.areaUnit,
              plot_type: mrValue.plot.plotType,
              village_id: mrValue.village.id,
              village_name: mrValue.village.name,
              registration_office_id: mrValue.registrationOffice.id,
              registration_office_name: mrValue.registrationOffice.name,
              district_id: mrValue.district.id,
              district_name: mrValue.district.name
            },
            villageUuid,
            registrationOfficeUuid,
            districtUuid
          );
          
          if (plotUuid) {
            // Then, store the market rate value
            const mrValueUuid = await upsertMarketRateValue(
              {
                plot_id: mrValue.plot.id,
                plot_no: mrValue.plot.plotNo,
                khata_no: mrValue.plot.khataNo,
                village_id: mrValue.village.id,
                village_name: mrValue.village.name,
                registration_office_id: mrValue.registrationOffice.id,
                registration_office_name: mrValue.registrationOffice.name,
                district_id: mrValue.district.id,
                district_name: mrValue.district.name,
                market_value: mrValue.marketValue?.value,
                market_value_unit: mrValue.marketValue?.unit,
                valuation_date: mrValue.marketValue?.valuationDate,
                road_type: mrValue.marketValue?.roadType,
                plot_type: mrValue.marketValue?.plotType,
                plot_category: mrValue.marketValue?.plotCategory,
                mouza_rate: mrValue.marketValue?.mouzaRate,
                additional_rate: mrValue.marketValue?.additionalRate
              },
              plotUuid,
              villageUuid,
              registrationOfficeUuid,
              districtUuid
            );
            
            if (mrValueUuid) {
              mrValueCount++;
            }
          }
        } catch (error) {
          console.error(`Error storing market rate value: ${error}`);
          errorCount++;
        }
      }
      
      console.log(`Successfully stored ${mrValueCount} market rate values`);
    }
    
    // Update session status
    await updateScrapingSession(sessionId, {
      status: 'completed',
      items_scraped: plotCount + (mrValues?.length || 0),
      error_count: errorCount,
      notes: 'Successfully stored random sample'
    });
    
    console.log('Database example completed successfully!');
    
    // Query and display some data
    console.log('\nQuerying stored data:');
    const districts = await getCurrentDistricts();
    console.log(`Found ${districts.length} districts in the database`);
    
    if (districts.length > 0) {
      console.log('Districts:');
      districts.forEach(d => {
        console.log(`- ${d.name} (ID: ${d.district_id})`);
      });
    }
    
  } catch (error) {
    console.error('Error in database example:', error);
    
    // Update session status
    await updateScrapingSession(sessionId, {
      status: 'failed',
      items_scraped: 0,
      error_count: 1,
      notes: `Error: ${error}`
    });
  }
}

// Run the example
storeRandomSample()
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 