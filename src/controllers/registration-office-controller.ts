/**
 * Registration office controller implementation
 */

import { BaseController } from '@/controllers/base-controller.js';
import { 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  Task 
} from '@/types/worker.js';
import { ControllerConfig } from '@/types/controller.js';
import { RegistrationOfficeFetchWorker } from '@/workers/registration-office-fetch-worker.js';
import { WorkerConfig } from '@/types/worker.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger.js';

/**
 * Controller for managing registration office fetch workers
 */
export class RegistrationOfficeController extends BaseController<RegistrationOfficePayload, RegistrationOfficeResult> {
  /**
   * Creates a new RegistrationOfficeController
   * 
   * @param config - Controller configuration
   */
  constructor(config: ControllerConfig) {
    super(config);
  }

  /**
   * Creates a new registration office fetch worker
   * 
   * @param workerConfig - Worker configuration
   * @returns The created worker
   */
  createWorker(workerConfig: WorkerConfig): RegistrationOfficeFetchWorker {
    const worker = new RegistrationOfficeFetchWorker({
      ...workerConfig,
      endpoint: workerConfig.endpoint || '/GetRegoffice'
    });
    
    return worker;
  }

  /**
   * Fetches registration offices for multiple districts
   * 
   * @param districtIds - Array of district IDs
   * @returns Promise resolving to the results
   */
  async fetchRegistrationOffices(districtIds: string[]): Promise<RegistrationOfficeResult> {
    logger.info(`Fetching registration offices for ${districtIds.length} districts`);
    
    // Create tasks from district IDs
    const tasks: Task<RegistrationOfficePayload>[] = districtIds.map(districtId => ({
      id: uuidv4(),
      payload: { districtId }
    }));
    
    // Execute tasks
    const results = await this.execute(tasks);
    
    // Filter successful results and extract data
    const offices = results
      .filter(result => result.success && result.data)
      .flatMap(result => result.data as RegistrationOfficeResult);
    
    logger.info(`Found ${offices.length} registration offices across ${districtIds.length} districts`);
    
    return offices;
  }
} 