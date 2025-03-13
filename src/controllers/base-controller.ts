/**
 * Base controller implementation for managing workers and distributing tasks
 */

import { 
  Controller, 
  ControllerConfig, 
  ControllerStatus, 
  WorkerExecutionResult 
} from '../types/controller.js';
import { Task, TaskResult, Worker } from '../types/worker.js';
import { sleep } from '../workers/base-worker.js';
import logger from '../utils/logger.js';

/**
 * Base controller implementation
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export class BaseController<P, R> implements Controller<P, R> {
  protected workers: Worker<P, R>[] = [];
  protected config: ControllerConfig;
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
  constructor(config: ControllerConfig) {
    this.config = {
      workerLaunchDelayMs: 500,
      ...config
    };
  }

  /**
   * Adds a worker to the controller
   * 
   * @param worker - Worker to add
   * @returns The controller instance for chaining
   */
  addWorker(worker: Worker<P, R>): Controller<P, R> {
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

    if (this.workers.length === 0) {
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
      logger.info(`Starting execution of ${tasks.length} tasks with ${this.workers.length} workers`);
      
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
    const numWorkers = Math.min(
      maxConcurrentWorkers,
      this.workers.length,
      Math.ceil(tasks.length / maxTasksPerWorker)
    );
    
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
    
    // Launch workers with delay
    for (let i = 0; i < taskBatches.length; i++) {
      const batch = taskBatches[i];
      if (batch.length === 0) continue;
      
      const worker = this.workers[i % this.workers.length];
      
      // Launch worker with delay
      const promise = (async () => {
        if (i > 0 && workerLaunchDelayMs) {
          await sleep(workerLaunchDelayMs);
        }
        
        this.status.activeWorkers++;
        logger.info(`Launching worker ${i + 1} with ${batch.length} tasks`);
        
        try {
          const batchResults = await worker.fetchBatch(batch);
          
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
        }
      })();
      
      promises.push(promise);
    }
    
    // Wait for all workers to complete
    await Promise.all(promises);
    
    return results;
  }
} 