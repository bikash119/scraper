/**
 * District controller implementation
 */

import { BaseController, ControllerConfigWithPool } from '@/controllers/base-controller.js';
import { 
  Worker,
  WorkerConfig,
  Task
} from '@/core/types/worker.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger.js';
import { BaseWorker } from '@/core/workers/base-worker.js';

/**
 * District payload type
 */
export interface DistrictPayload {
  stateId: string;
}

/**
 * District result type
 */
export interface DistrictResult {
  id: string;
  name: string;
}

/**
 * District Fetch Worker implementation
 */
export class DistrictFetchWorker extends BaseWorker<DistrictPayload, DistrictResult[]> {
  /**
   * Executes a task with the given payload
   * 
   * @param payload - Task payload
   * @returns Promise resolving to the result
   */
  protected async executeTask(payload: DistrictPayload): Promise<DistrictResult[]> {
    logger.info(`Fetching districts for state ${payload.stateId}`);
    
    try {
      // Make API request to fetch districts
      const response = await this.config.httpClient.post(
        `${this.config.baseUrl}${this.config.endpoint}`,
        { stateId: payload.stateId },
        this.createHeaders()
      );
      
      // Process and return the response
      return this.processResponse(response);
    } catch (error) {
      logger.error(`Error fetching districts for state ${payload.stateId}:`, error);
      throw error;
    }
  }
  
  /**
   * Processes the API response
   * 
   * @param response - API response
   * @returns Processed districts
   */
  private processResponse(response: any): DistrictResult[] {
    // In a real implementation, this would parse the response
    // For now, we'll just return mock data
    return [
      {
        id: 'district-1',
        name: 'District 1'
      },
      {
        id: 'district-2',
        name: 'District 2'
      }
    ];
  }
}

/**
 * Controller for managing district fetch workers
 */
export class DistrictController extends BaseController<DistrictPayload, DistrictResult[]> {
  /**
   * Creates a new DistrictController
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
      logger.warn('No worker pool available for DistrictController');
      return;
    }
    
    // Create and add workers to the pool
    const numWorkers = Math.min(3, this.config.maxConcurrentWorkers || 5);
    logger.info(`Initializing ${numWorkers} district workers`);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = this.createWorker(this.createWorkerConfig('/GetDistricts'));
      this.addWorker(worker);
    }
  }

  /**
   * Creates a new district fetch worker
   * 
   * @param workerConfig - Worker configuration
   * @returns The created worker
   */
  protected override createWorker(workerConfig: WorkerConfig): Worker<DistrictPayload, DistrictResult[]> {
    return new DistrictFetchWorker(workerConfig);
  }

  /**
   * Fetches districts for multiple states
   * 
   * @param stateIds - Array of state IDs
   * @returns Promise resolving to the results
   */
  async fetchDistricts(stateIds: string[]): Promise<DistrictResult[]> {
    logger.info(`Fetching districts for ${stateIds.length} states`);
    
    // Create tasks from state IDs
    const tasks: Task<DistrictPayload>[] = stateIds.map(stateId => ({
      id: uuidv4(),
      payload: { stateId }
    }));
    
    // Execute tasks
    const results = await this.execute(tasks);
    
    // Filter successful results and extract data
    const districts = results
      .filter(result => result.success && result.data)
      .flatMap(result => result.data as DistrictResult[]);
    
    logger.info(`Found ${districts.length} districts across ${stateIds.length} states`);
    
    return districts;
  }
} 