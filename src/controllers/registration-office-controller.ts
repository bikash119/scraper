/**
 * Registration office controller implementation
 */

import { BaseController, ControllerConfigWithPool } from '@/controllers/base-controller.js';
import { 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  Task,
  Worker,
  WorkerConfig
} from '@/core/types/worker.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger.js';
import { BaseWorker } from '@/core/workers/base-worker.js';

/**
 * Registration Office Fetch Worker implementation
 */
export class RegistrationOfficeFetchWorker extends BaseWorker<RegistrationOfficePayload, RegistrationOfficeResult> {
  /**
   * Executes a task with the given payload
   * 
   * @param payload - Task payload
   * @returns Promise resolving to the result
   */
  protected async executeTask(payload: RegistrationOfficePayload): Promise<RegistrationOfficeResult> {
    logger.info(`Fetching registration offices for district ${payload.districtId}`);
    
    try {
      // Make API request to fetch registration offices
      const response = await this.config.httpClient.post(
        `${this.config.baseUrl}${this.config.endpoint}`,
        { districtId: payload.districtId },
        this.createHeaders()
      );
      
      // Process and return the response
      return this.processResponse(response);
    } catch (error) {
      logger.error(`Error fetching registration offices for district ${payload.districtId}:`, error);
      throw error;
    }
  }
  
  /**
   * Processes the API response
   * 
   * @param response - API response
   * @returns Processed registration offices
   */
  private processResponse(response: any): RegistrationOfficeResult {
    // In a real implementation, this would parse the response
    // For now, we'll just return mock data
    return [
      {
        id: 'ro-1',
        name: 'Registration Office 1',
        villages: []
      },
      {
        id: 'ro-2',
        name: 'Registration Office 2',
        villages: []
      }
    ];
  }
}

/**
 * Controller for managing registration office fetch workers
 */
export class RegistrationOfficeController extends BaseController<RegistrationOfficePayload, RegistrationOfficeResult> {
  /**
   * Creates a new RegistrationOfficeController
   * 
   * @param config - Controller configuration
   */
  constructor(config: ControllerConfigWithPool) {
    super(config);
  }
  
  /**
   * Initializes workers and adds them to the worker pool
   */
  protected override initializeWorkers(): void {
    if (!this.workerPool) {
      logger.warn('No worker pool available for RegistrationOfficeController');
      return;
    }
    
    // Create and add workers to the pool
    const numWorkers = Math.min(3, this.config.maxConcurrentWorkers || 5);
    logger.info(`Initializing ${numWorkers} registration office workers`);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = this.createWorker(this.createWorkerConfig('/GetRegoffice'));
      this.addWorker(worker);
    }
  }

  /**
   * Creates a new registration office fetch worker
   * 
   * @param workerConfig - Worker configuration
   * @returns The created worker
   */
  protected override createWorker(workerConfig: WorkerConfig): Worker<RegistrationOfficePayload, RegistrationOfficeResult> {
    return new RegistrationOfficeFetchWorker(workerConfig);
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