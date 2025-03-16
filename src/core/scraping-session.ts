/**
 * Scraping session for managing the scraping process
 */

import { ResourceLimits, WorkerPoolManager, WorkerPool } from '@/core/worker-pool-manager.js';
import { Controller } from '@/core/types/controller.js';
import { 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  VillagePayload,
  VillageResult,
  PlotPayload,
  PlotResult,
  HttpClient
} from '@/core/types/worker.js';
import { RegistrationOfficeController } from '@/controllers/registration-office-controller.js';
import { DistrictController, DistrictPayload, DistrictResult } from '@/controllers/district-controller.js';
import logger from '@/utils/logger.js';

/**
 * Configuration for the scraping session
 */
export interface ScrapingSessionConfig {
  /**
   * Resource limits for the scraping session
   */
  resourceLimits: ResourceLimits;
  
  /**
   * Base URL for API requests
   */
  baseUrl: string;
  
  /**
   * HTTP client for making requests
   */
  httpClient: HttpClient;
  
  /**
   * Session data provider function
   */
  sessionProvider: () => any;
  
  /**
   * Default request headers
   */
  headers?: Record<string, string>;
}

/**
 * Controller factory function type
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export type ControllerFactory<P, R> = (
  workerPool: WorkerPool<P, R>, 
  config: ScrapingSessionConfig
) => Controller<P, R>;

/**
 * Scraping session for managing the scraping process
 */
export class ScrapingSession {
  private config: ScrapingSessionConfig;
  private workerPoolManager: WorkerPoolManager;
  private controllers: Map<string, Controller<any, any>> = new Map();
  private workerPools: Map<string, WorkerPool<any, any>> = new Map();
  
  /**
   * Creates a new scraping session
   * 
   * @param config - Scraping session configuration
   */
  constructor(config: ScrapingSessionConfig) {
    this.config = config;
    this.workerPoolManager = new WorkerPoolManager(config.resourceLimits);
    
    logger.info('Created scraping session with config:', config);
  }
  
  /**
   * Initializes the scraping session by creating controllers
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scraping session...');
    
    // Create controllers
    await this.createControllers();
    
    logger.info('Scraping session initialized successfully');
  }
  
  /**
   * Creates controllers for the scraping session
   */
  private async createControllers(): Promise<void> {
    logger.info('Creating controllers...');
    
    // Create district controller
    await this.createDistrictController();
    
    // Create registration office controller
    await this.createRegistrationOfficeController();
    
    // Note: We'll implement other controllers later as mentioned in the requirements
    
    logger.info(`Created ${this.controllers.size} controllers`);
  }
  
  /**
   * Creates a district controller
   */
  private async createDistrictController(): Promise<void> {
    // Create a worker pool for district workers
    const districtPool = this.workerPoolManager.createPool<DistrictPayload, DistrictResult[]>({
      name: 'district-pool',
      maxWorkers: Math.min(3, this.config.resourceLimits.maxConcurrentWorkers)
    });
    
    // Store the pool for later use
    this.workerPools.set('district', districtPool);
    
    // Create the controller with the worker pool
    const controller = new DistrictController({
      maxConcurrentWorkers: districtPool.getTotalCount(),
      maxTasksPerWorker: 10,
      workerPool: districtPool,
      baseUrl: this.config.baseUrl,
      httpClient: this.config.httpClient,
      sessionProvider: this.config.sessionProvider,
      headers: this.config.headers
    });
    
    // Add the controller to the map
    this.controllers.set('district', controller);
    
    logger.info('Created district controller');
  }
  
  /**
   * Creates a registration office controller
   */
  private async createRegistrationOfficeController(): Promise<void> {
    // Create a worker pool for registration office workers
    const registrationOfficePool = this.workerPoolManager.createPool<RegistrationOfficePayload, RegistrationOfficeResult>({
      name: 'registration-office-pool',
      maxWorkers: Math.min(5, this.config.resourceLimits.maxConcurrentWorkers)
    });
    
    // Store the pool for later use
    this.workerPools.set('registration-office', registrationOfficePool);
    
    // Create the controller with the worker pool
    const controller = new RegistrationOfficeController({
      maxConcurrentWorkers: registrationOfficePool.getTotalCount(),
      maxTasksPerWorker: 10,
      workerPool: registrationOfficePool,
      baseUrl: this.config.baseUrl,
      httpClient: this.config.httpClient,
      sessionProvider: this.config.sessionProvider,
      headers: this.config.headers
    });
    
    // Add the controller to the map
    this.controllers.set('registration-office', controller);
    
    logger.info('Created registration office controller');
  }
  
  /**
   * Gets a controller by name
   * 
   * @param name - Name of the controller
   * @returns The controller, or undefined if not found
   */
  getController<P, R>(name: string): Controller<P, R> | undefined {
    return this.controllers.get(name) as Controller<P, R> | undefined;
  }
  
  /**
   * Gets a worker pool by name
   * 
   * @param name - Name of the worker pool
   * @returns The worker pool, or undefined if not found
   */
  getWorkerPool<P, R>(name: string): WorkerPool<P, R> | undefined {
    return this.workerPools.get(name) as WorkerPool<P, R> | undefined;
  }
  
  /**
   * Gets the worker pool manager
   * 
   * @returns The worker pool manager
   */
  getWorkerPoolManager(): WorkerPoolManager {
    return this.workerPoolManager;
  }
  
  /**
   * Gets the scraping session configuration
   * 
   * @returns The scraping session configuration
   */
  getConfig(): ScrapingSessionConfig {
    return { ...this.config };
  }
  
  /**
   * Starts the scraping process
   */
  async start(): Promise<void> {
    logger.info('Starting scraping process...');
    
    // Implement the scraping process
    // This will be implemented later
    
    logger.info('Scraping process completed');
  }
  
  /**
   * Stops the scraping process
   */
  async stop(): Promise<void> {
    logger.info('Stopping scraping process...');
    
    // Implement the stopping logic
    // This will be implemented later
    
    logger.info('Scraping process stopped');
  }
} 