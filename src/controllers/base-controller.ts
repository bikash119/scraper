/**
 * Base controller implementation for managing workers and distributing tasks
 */

import { 
  Controller, 
  ControllerConfig, 
  ControllerStatus, 
  WorkerExecutionResult 
} from '@/core/types/controller.js';
import { Task, TaskResult, Worker, WorkerConfig } from '@/core/types/worker.js';
import { WorkerPool } from '@/core/worker-pool-manager.js';
import { sleep } from '@/core/workers/base-worker.js';
import logger from '@/utils/logger.js';

/**
 * Extended controller configuration with worker pool
 */
export interface ControllerConfigWithPool extends ControllerConfig {
  /**
   * Worker pool to use for task execution
   */
  workerPool?: WorkerPool<any, any>;
  
  /**
   * Base URL for API requests
   */
  baseUrl?: string;
  
  /**
   * HTTP client for making requests
   */
  httpClient?: any;
  
  /**
   * Session data provider function
   */
  sessionProvider?: () => any;
  
  /**
   * Default request headers
   */
  headers?: Record<string, string>;
}

/**
 * Base controller implementation
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export class BaseController<P, R> implements Controller<P, R> {
  protected workers: Worker<P, R>[] = [];
  protected config: ControllerConfigWithPool;
  protected workerPool?: WorkerPool<P, R>;
  protected status: ControllerStatus = {
    activeWorkers: 0,
    pendingTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    isExecuting: false
  };

  /**
   * Creates a new BaseController
   * 
   * @param config - Controller configuration
   */
  constructor(config: ControllerConfigWithPool) {
    this.config = {
      workerLaunchDelayMs: 500,
      ...config
    };
    
    // Set worker pool if provided
    if (config.workerPool) {
      this.workerPool = config.workerPool as WorkerPool<P, R>;
      logger.info(`Controller using worker pool "${this.workerPool.getName()}"`);
      
      // Initialize workers in the pool if needed
      this.initializeWorkers();
    }
  }
  
  /**
   * Initializes workers and adds them to the worker pool
   * This method should be overridden by subclasses to create specific worker types
   */
  protected initializeWorkers(): void {
    // Base implementation does nothing
    // Subclasses should override this method to create and add workers to the pool
    logger.info('Base initializeWorkers called - no workers created');
  }
  
  /**
   * Creates a worker with the given configuration
   * This method should be overridden by subclasses to create specific worker types
   * 
   * @param workerConfig - Worker configuration
   * @returns The created worker
   */
  protected createWorker(workerConfig: WorkerConfig): Worker<P, R> {
    throw new Error('Method not implemented. Subclasses must implement this method.');
  }
  
  /**
   * Creates a worker configuration object
   * 
   * @param endpoint - API endpoint for the worker
   * @returns Worker configuration object
   */
  protected createWorkerConfig(endpoint: string): WorkerConfig {
    if (!this.config.baseUrl || !this.config.httpClient || !this.config.sessionProvider) {
      throw new Error('Controller configuration missing required properties for worker creation');
    }
    
    return {
      baseUrl: this.config.baseUrl,
      endpoint,
      httpClient: this.config.httpClient,
      sessionProvider: this.config.sessionProvider,
      headers: this.config.headers,
      delayMs: 1000 // Default delay, can be adjusted based on resource limits
    };
  }

  /**
   * Adds a worker to the controller
   * 
   * @param worker - Worker to add
   * @returns The controller instance for chaining
   */
  addWorker(worker: Worker<P, R>): Controller<P, R> {
    // If we have a worker pool, add the worker to the pool
    if (this.workerPool) {
      const added = this.workerPool.addWorker(worker);
      if (!added) {
        logger.warn('Could not add worker to pool - pool may be full');
      }
      return this;
    }
    
    // Otherwise, add the worker directly to the controller
    this.workers.push(worker);
    return this;
  }

  /**
   * Executes tasks using the available workers
   * 
   * @param tasks - Tasks to execute
   * @returns Promise resolving to the results of all tasks
   */
  async execute(tasks: Task<P>[]): Promise<TaskResult<R>[]> {
    if (this.status.isExecuting) {
      throw new Error('Controller is already executing tasks');
    }

    // Check if we have workers available
    if (!this.workerPool && this.workers.length === 0) {
      throw new Error('No workers available');
    }

    // Reset status
    this.status = {
      activeWorkers: 0,
      pendingTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      isExecuting: true
    };

    try {
      logger.info(`Starting execution of ${tasks.length} tasks`);
      
      // Distribute tasks among workers
      const taskBatches = this.distributeTasks(tasks);
      
      // Execute tasks in parallel with worker limits
      const results = await this.executeTaskBatches(taskBatches);
      
      // Flatten results
      const flatResults = results.flatMap(result => result.results);
      
      // Update status
      this.status.completedTasks = flatResults.filter(r => r.success).length;
      this.status.failedTasks = flatResults.filter(r => !r.success).length;
      this.status.pendingTasks = 0;
      this.status.activeWorkers = 0;
      this.status.isExecuting = false;
      
      logger.info(`Execution completed: ${this.status.completedTasks} succeeded, ${this.status.failedTasks} failed`);
      
      return flatResults;
    } catch (error) {
      this.status.isExecuting = false;
      this.status.activeWorkers = 0;
      logger.error('Error during task execution:', error);
      throw error;
    }
  }

  /**
   * Gets the current status of the controller
   * 
   * @returns Status information about the controller
   */
  getStatus(): ControllerStatus {
    return { ...this.status };
  }

  /**
   * Distributes tasks among workers
   * 
   * @param tasks - Tasks to distribute
   * @returns Array of task batches for each worker
   */
  protected distributeTasks(tasks: Task<P>[]): Task<P>[][] {
    const { maxConcurrentWorkers, maxTasksPerWorker } = this.config;
    
    // Calculate how many workers we need
    let numWorkers: number;
    
    if (this.workerPool) {
      // If using worker pool, we're limited by the available workers in the pool
      numWorkers = Math.min(
        maxConcurrentWorkers,
        this.workerPool.getAvailableCount(),
        Math.ceil(tasks.length / maxTasksPerWorker)
      );
    } else {
      // If using direct workers, we're limited by the workers we have
      numWorkers = Math.min(
        maxConcurrentWorkers,
        this.workers.length,
        Math.ceil(tasks.length / maxTasksPerWorker)
      );
    }
    
    logger.info(`Distributing ${tasks.length} tasks among ${numWorkers} workers`);
    
    // Create empty batches
    const batches: Task<P>[][] = Array.from({ length: numWorkers }, () => []);
    
    // Distribute tasks among batches
    tasks.forEach((task, index) => {
      const batchIndex = index % numWorkers;
      batches[batchIndex].push(task);
    });
    
    // Log distribution
    batches.forEach((batch, index) => {
      logger.info(`Worker ${index + 1} assigned ${batch.length} tasks`);
    });
    
    return batches;
  }

  /**
   * Executes task batches using workers
   * 
   * @param taskBatches - Batches of tasks for each worker
   * @returns Promise resolving to the results of all batches
   */
  protected async executeTaskBatches(taskBatches: Task<P>[][]): Promise<WorkerExecutionResult<R>[]> {
    const { workerLaunchDelayMs } = this.config;
    const results: WorkerExecutionResult<R>[] = [];
    const promises: Promise<void>[] = [];
    
    // Keep track of borrowed workers if using worker pool
    const borrowedWorkers: Worker<P, R>[] = [];
    
    // Launch workers with delay
    for (let i = 0; i < taskBatches.length; i++) {
      const batch = taskBatches[i];
      if (batch.length === 0) continue;
      
      // Get worker either from pool or direct list
      let worker: Worker<P, R> | undefined;
      
      if (this.workerPool) {
        worker = this.workerPool.borrowWorker();
        if (worker) {
          borrowedWorkers.push(worker);
        }
      } else {
        worker = this.workers[i % this.workers.length];
      }
      
      if (!worker) {
        logger.error(`No worker available for batch ${i + 1}`);
        continue;
      }
      
      // Launch worker with delay
      const promise = (async () => {
        if (i > 0 && workerLaunchDelayMs) {
          await sleep(workerLaunchDelayMs);
        }
        
        this.status.activeWorkers++;
        logger.info(`Launching worker ${i + 1} with ${batch.length} tasks`);
        
        try {
          const batchResults = await worker!.fetchBatch(batch);
          
          results.push({
            workerId: i + 1,
            results: batchResults
          });
          
          // Update status
          this.status.pendingTasks -= batch.length;
          this.status.completedTasks += batchResults.filter(r => r.success).length;
          this.status.failedTasks += batchResults.filter(r => !r.success).length;
          
          logger.info(`Worker ${i + 1} completed ${batchResults.length} tasks`);
        } catch (error) {
          logger.error(`Worker ${i + 1} failed:`, error);
          
          // Create failure results for all tasks in the batch
          const failureResults: TaskResult<R>[] = batch.map(task => ({
            taskId: task.id,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            timestamp: new Date()
          }));
          
          results.push({
            workerId: i + 1,
            results: failureResults
          });
          
          // Update status
          this.status.pendingTasks -= batch.length;
          this.status.failedTasks += batch.length;
        } finally {
          this.status.activeWorkers--;
          
          // Return worker to pool if borrowed
          if (this.workerPool && borrowedWorkers.includes(worker!)) {
            this.workerPool.returnWorker(worker!);
            logger.info(`Returned worker ${i + 1} to pool`);
          }
        }
      })();
      
      promises.push(promise);
    }
    
    // Wait for all workers to complete
    await Promise.all(promises);
    
    return results;
  }
} 