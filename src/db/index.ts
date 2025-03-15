/**
 * Data Access Layer for IGRO Odisha Scraper
 * 
 * This module provides functions for interacting with the Supabase database.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if Supabase credentials are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Supabase credentials not found. Database operations will not work.');
  console.warn('Please create a .env file with SUPABASE_URL and SUPABASE_KEY.');
}

// Initialize Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);

/**
 * Interface for district data
 */
export interface DistrictData {
  district_id: string;
  name: string;
}

/**
 * Interface for registration office data
 */
export interface RegistrationOfficeData {
  registration_office_id: string;
  name: string;
  district_id: string;
  district_name: string;
}

/**
 * Interface for village data
 */
export interface VillageData {
  village_id: string;
  name: string;
  registration_office_id: string;
  registration_office_name: string;
  district_id: string;
  district_name: string;
}

/**
 * Interface for plot data
 */
export interface PlotData {
  plot_id: string;
  plot_no: string;
  area?: number;
  area_unit?: string;
  plot_type?: string;
  village_id: string;
  village_name: string;
  registration_office_id: string;
  registration_office_name: string;
  district_id: string;
  district_name: string;
}

/**
 * Interface for market rate value data
 */
export interface MarketRateValueData {
  plot_id: string;
  plot_no: string;
  village_id: string;
  village_name: string;
  registration_office_id: string;
  registration_office_name: string;
  district_id: string;
  district_name: string;
  market_value?: number;
  market_value_unit?: string;
  valuation_date?: string;
  road_type?: string;
  plot_type?: string;
  plot_category?: string;
  mouza_rate?: number;
  additional_rate?: number;
}

/**
 * Interface for scraping session data
 */
export interface ScrapingSessionData {
  id?: string;
  start_time?: string;
  end_time?: string;
  status: 'in_progress' | 'completed' | 'failed';
  items_scraped: number;
  error_count: number;
  notes?: string;
}

/**
 * Creates a new district or updates an existing one
 * @param district - District data
 * @returns The UUID of the created/updated district
 */
export async function upsertDistrict(district: DistrictData): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_new_district_version', {
      p_district_id: district.district_id,
      p_name: district.name
    });

    if (error) {
      console.error('Error upserting district:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception upserting district:', error);
    return null;
  }
}

/**
 * Creates a new registration office or updates an existing one
 * @param office - Registration office data
 * @param districtUuid - UUID of the parent district
 * @returns The UUID of the created/updated registration office
 */
export async function upsertRegistrationOffice(
  office: RegistrationOfficeData,
  districtUuid: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_new_registration_office_version', {
      p_registration_office_id: office.registration_office_id,
      p_name: office.name,
      p_district_id: districtUuid,
      p_district_name: office.district_name
    });

    if (error) {
      console.error('Error upserting registration office:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception upserting registration office:', error);
    return null;
  }
}

/**
 * Creates a new village or updates an existing one
 * @param village - Village data
 * @param registrationOfficeUuid - UUID of the parent registration office
 * @param districtUuid - UUID of the parent district
 * @returns The UUID of the created/updated village
 */
export async function upsertVillage(
  village: VillageData,
  registrationOfficeUuid: string,
  districtUuid: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_new_village_version', {
      p_village_id: village.village_id,
      p_name: village.name,
      p_registration_office_id: registrationOfficeUuid,
      p_registration_office_name: village.registration_office_name,
      p_district_id: districtUuid,
      p_district_name: village.district_name
    });

    if (error) {
      console.error('Error upserting village:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception upserting village:', error);
    return null;
  }
}

/**
 * Creates a new plot or updates an existing one
 * @param plot - Plot data
 * @param villageUuid - UUID of the parent village
 * @param registrationOfficeUuid - UUID of the parent registration office
 * @param districtUuid - UUID of the parent district
 * @returns The UUID of the created/updated plot
 */
export async function upsertPlot(
  plot: PlotData,
  villageUuid: string,
  registrationOfficeUuid: string,
  districtUuid: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_new_plot_version', {
      p_plot_id: plot.plot_id,
      p_plot_no: plot.plot_no,
      p_area: plot.area || null,
      p_area_unit: plot.area_unit || null,
      p_plot_type: plot.plot_type || null,
      p_village_id: villageUuid,
      p_village_name: plot.village_name,
      p_registration_office_id: registrationOfficeUuid,
      p_registration_office_name: plot.registration_office_name,
      p_district_id: districtUuid,
      p_district_name: plot.district_name
    });

    if (error) {
      console.error('Error upserting plot:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception upserting plot:', error);
    return null;
  }
}

/**
 * Creates a new market rate value or updates an existing one
 * @param mrValue - Market rate value data
 * @param plotUuid - UUID of the parent plot
 * @param villageUuid - UUID of the parent village
 * @param registrationOfficeUuid - UUID of the parent registration office
 * @param districtUuid - UUID of the parent district
 * @returns The UUID of the created/updated market rate value
 */
export async function upsertMarketRateValue(
  mrValue: MarketRateValueData,
  plotUuid: string,
  villageUuid: string,
  registrationOfficeUuid: string,
  districtUuid: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_new_market_rate_value_version', {
      p_plot_id: plotUuid,
      p_plot_no: mrValue.plot_no,
      p_village_id: villageUuid,
      p_village_name: mrValue.village_name,
      p_registration_office_id: registrationOfficeUuid,
      p_registration_office_name: mrValue.registration_office_name,
      p_district_id: districtUuid,
      p_district_name: mrValue.district_name,
      p_market_value: mrValue.market_value || null,
      p_market_value_unit: mrValue.market_value_unit || null,
      p_valuation_date: mrValue.valuation_date ? new Date(mrValue.valuation_date) : null,
      p_road_type: mrValue.road_type || null,
      p_plot_type: mrValue.plot_type || null,
      p_plot_category: mrValue.plot_category || null,
      p_mouza_rate: mrValue.mouza_rate || null,
      p_additional_rate: mrValue.additional_rate || null
    });

    if (error) {
      console.error('Error upserting market rate value:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception upserting market rate value:', error);
    return null;
  }
}

/**
 * Creates a new scraping session
 * @returns The UUID of the created scraping session
 */
export async function createScrapingSession(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('scraping_sessions')
      .insert({})
      .select('id')
      .single();

    if (error) {
      console.error('Error creating scraping session:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Exception creating scraping session:', error);
    return null;
  }
}

/**
 * Updates a scraping session
 * @param sessionId - UUID of the scraping session
 * @param sessionData - Scraping session data
 * @returns True if the update was successful, false otherwise
 */
export async function updateScrapingSession(
  sessionId: string,
  sessionData: Omit<ScrapingSessionData, 'id'>
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_scraping_session', {
      p_session_id: sessionId,
      p_status: sessionData.status,
      p_items_scraped: sessionData.items_scraped,
      p_error_count: sessionData.error_count,
      p_notes: sessionData.notes || null
    });

    if (error) {
      console.error('Error updating scraping session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating scraping session:', error);
    return false;
  }
}

/**
 * Gets all current districts
 * @returns Array of districts
 */
export async function getCurrentDistricts(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('current_districts')
      .select('*');

    if (error) {
      console.error('Error fetching districts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching districts:', error);
    return [];
  }
}

/**
 * Gets all current registration offices for a district
 * @param districtId - UUID of the district
 * @returns Array of registration offices
 */
export async function getCurrentRegistrationOffices(districtId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('current_registration_offices')
      .select('*')
      .eq('district_id', districtId);

    if (error) {
      console.error('Error fetching registration offices:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching registration offices:', error);
    return [];
  }
}

/**
 * Gets all current villages for a registration office
 * @param registrationOfficeId - UUID of the registration office
 * @returns Array of villages
 */
export async function getCurrentVillages(registrationOfficeId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('current_villages')
      .select('*')
      .eq('registration_office_id', registrationOfficeId);

    if (error) {
      console.error('Error fetching villages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching villages:', error);
    return [];
  }
}

/**
 * Gets all current plots for a village
 * @param villageId - UUID of the village
 * @returns Array of plots
 */
export async function getCurrentPlots(villageId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('current_plots')
      .select('*')
      .eq('village_id', villageId);

    if (error) {
      console.error('Error fetching plots:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching plots:', error);
    return [];
  }
}

/**
 * Gets the market rate value for a plot
 * @param plotId - UUID of the plot
 * @returns Market rate value or null if not found
 */
export async function getMarketRateValue(plotId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('current_market_rate_values')
      .select('*')
      .eq('plot_id', plotId)
      .single();

    if (error) {
      console.error('Error fetching market rate value:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching market rate value:', error);
    return null;
  }
} 