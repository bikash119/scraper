/**
 * Factory methods for creating controllers and workers
 */

import { AxiosHttpClient } from '@/utils/http-client.js';
import { SessionProvider } from '@/utils/session-provider.js';
import { RegistrationOfficeController } from '@/controllers/registration-office-controller.js';
import { RegistrationOfficeFetchWorker } from '@/workers/registration-office-fetch-worker.js';
import { ControllerConfig } from '@/types/controller.js';
import { WorkerConfig } from '@/types/worker.js';
import logger from '@/utils/logger.js';

/**
 * Factory for creating controllers and workers
 */
export class Factory {
  private static instance: Factory;
  private sessionProvider: SessionProvider;
  private httpClient: AxiosHttpClient;
  private baseUrl: string;
  private benchmarkPath = '/ViewFeeValue.aspx';

  /**
   * Creates a new Factory
   * 
   * @param baseUrl - Base URL for the IGRO website
   */
  private constructor(baseUrl: string = 'https://igrodisha.gov.in') {
    this.baseUrl = baseUrl;
    this.sessionProvider = new SessionProvider(this.baseUrl, this.benchmarkPath);
    this.httpClient = this.sessionProvider.getHttpClient();
  }

  /**
   * Gets the singleton instance of the Factory
   * 
   * @param baseUrl - Base URL for the IGRO website
   * @returns The Factory instance
   */
  public static getInstance(baseUrl: string = 'https://igrodisha.gov.in'): Factory {
    if (!Factory.instance) {
      Factory.instance = new Factory(baseUrl);
    }
    return Factory.instance;
  }

  /**
   * Initializes the session
   * 
   * @returns Promise resolving when the session is initialized
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing session...');
    await this.sessionProvider.initialize();
    logger.info('Session initialized');
  }

  /**
   * Creates a worker configuration
   * 
   * @param endpoint - API endpoint
   * @param delayMs - Delay between requests in milliseconds
   * @returns Worker configuration
   */
  public createWorkerConfig(endpoint: string, delayMs: number = 1000): WorkerConfig {
    return {
      baseUrl: this.baseUrl,
      endpoint,
      httpClient: this.httpClient,
      sessionProvider: () => this.sessionProvider.getSessionData(),
      delayMs
    };
  }

  /**
   * Creates a controller configuration
   * 
   * @param maxConcurrentWorkers - Maximum number of concurrent workers
   * @param maxTasksPerWorker - Maximum number of tasks per worker
   * @param workerLaunchDelayMs - Delay between launching workers in milliseconds
   * @returns Controller configuration
   */
  public createControllerConfig(
    maxConcurrentWorkers: number = 3,
    maxTasksPerWorker: number = 5,
    workerLaunchDelayMs: number = 500
  ): ControllerConfig {
    return {
      maxConcurrentWorkers,
      maxTasksPerWorker,
      workerLaunchDelayMs
    };
  }

  /**
   * Creates a registration office controller
   * 
   * @param numWorkers - Number of workers to create
   * @param requestDelayMs - Delay between requests in milliseconds
   * @param workerLaunchDelayMs - Delay between launching workers in milliseconds
   * @returns The created controller
   */
  public createRegistrationOfficeController(
    numWorkers: number = 3,
    requestDelayMs: number = 1000,
    workerLaunchDelayMs: number = 500
  ): RegistrationOfficeController {
    // Create controller
    const controllerConfig = this.createControllerConfig(
      numWorkers,
      5,
      workerLaunchDelayMs
    );
    
    const controller = new RegistrationOfficeController(controllerConfig);
    
    // Create and add workers
    for (let i = 0; i < numWorkers; i++) {
      const workerConfig = this.createWorkerConfig('/GetRegoffice', requestDelayMs);
      const worker = new RegistrationOfficeFetchWorker(workerConfig);
      controller.addWorker(worker);
    }
    
    return controller;
  }

  /**
   * Gets the session provider
   * 
   * @returns The session provider
   */
  public getSessionProvider(): SessionProvider {
    return this.sessionProvider;
  }

  /**
   * Gets the HTTP client
   * 
   * @returns The HTTP client
   */
  public getHttpClient(): AxiosHttpClient {
    return this.httpClient;
  }
} 