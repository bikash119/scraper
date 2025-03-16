/**
 * Registration office fetch worker implementation
 */

import { 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  WorkerConfig 
} from '@/core/types/worker.js';
import { BaseWorker } from '@/core/workers/base-worker.js';
import logger from '@/utils/logger.js';
/**
 * Response structure from the registration office API
 */
interface RegistrationOfficeResponse {
  d?: Array<{
    REGOFF_ID: number;
    REGOFF_NAME: string;
    REGOFF_HEAD_ID: number;
    REGOFF_INITIAL: string;
    REGOFF_TYPE_ID: number;
    REGOFF_ACTIVE: number;
  }>;
}

/**
 * Worker for fetching registration offices
 */
export class RegistrationOfficeFetchWorker extends BaseWorker<RegistrationOfficePayload, RegistrationOfficeResult> {
  /**
   * Creates a new RegistrationOfficeFetchWorker
   * 
   * @param config - Worker configuration
   */
  constructor(config: WorkerConfig) {
    super(config);
  }

  /**
   * Executes a task to fetch registration offices for a district
   * 
   * @param payload - Task payload containing district ID
   * @returns Promise resolving to an array of registration offices
   */
  protected async executeTask(payload: RegistrationOfficePayload): Promise<RegistrationOfficeResult> {  
    try {
      const { districtId } = payload;
      logger.info(`Fetching registration offices for district ID ${districtId}`);
      
      // Create request headers
      const headers = this.createHeaders();
      
      // Make request to fetch registration offices
      const response = await this.config.httpClient.post<RegistrationOfficeResponse>(
        this.config.endpoint,
        { distId: districtId },
        headers
      );
      
      // Check if response has data
      if (!response.d || !Array.isArray(response.d)) {
        logger.warn(`No registration offices found for district ID ${districtId}`);
        return [];
      }
      
      // Map response to registration offices
      const offices: RegistrationOfficeResult = response.d.map(office => ({
        id: office.REGOFF_ID.toString(),
        name: office.REGOFF_NAME,
        head_id: office.REGOFF_HEAD_ID.toString(),
        office_initial: office.REGOFF_INITIAL,
        type_id: office.REGOFF_TYPE_ID.toString(),
        active: office.REGOFF_ACTIVE === 1,
        villages: []
      }));
      
      logger.info(`Found ${offices.length} registration offices for district ID ${districtId}`);
      
      // Return the offices as RegistrationOfficeResult
      return offices;
    } catch (error) {
      logger.error(`Error fetching registration offices:`, error);
      throw new Error(`Failed to fetch registration offices for district ID ${payload.districtId}`);
    }
  }
} 