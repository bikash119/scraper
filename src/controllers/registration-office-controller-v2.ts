/**
 * Registration office controller implementation using worker pool
 */

import { BaseController } from '@/controllers/base-controller.js';
import { 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  Task as WorkerTask,
  TaskResult,
  Worker
} from '@/types/worker.js';
import { ControllerConfig } from '@/types/controller.js';
import logger from '@/utils/logger.js';
import { WorkerPool } from '@/core/worker-pool.js';
import { TaskQueue, Task, TaskWithStatus } from '@/core/task-queue.js';
import { RegistrationOfficeFetchWorker } from '@/workers/registration-office-fetch-worker.js';
import { WorkerConfig } from '@/types/worker.js';

/**
 * Controller for managing registration office fetch operations
 */
export class RegistrationOfficeControllerV2 extends BaseController<RegistrationOfficePayload, RegistrationOfficeResult> {
  private workerPool: WorkerPool<RegistrationOfficePayload, RegistrationOfficeResult>;
  private taskQueue: TaskQueue<RegistrationOfficePayload>;
  private versionId: string;
  private configuredWorkers: Worker<RegistrationOfficePayload, RegistrationOfficeResult>[] = [];
  private stateId: string;
  private stateName: string;
  
  /**
   * Creates a new RegistrationOfficeController
   * 
   * @param config - Controller configuration
   * @param workerPool - Worker pool to use
   * @param versionId - Version ID for this scraping session
   * @param stateId - State ID for this scraping session
   * @param stateName - State name for this scraping session
   */
  constructor(
    config: ControllerConfig, 
    workerPool: WorkerPool<RegistrationOfficePayload, RegistrationOfficeResult>, 
    versionId: string,
    stateId: string,
    stateName: string
  ) {
    super(config);
    this.workerPool = workerPool;
    this.versionId = versionId;
    this.stateId = stateId;
    this.stateName = stateName;
    this.taskQueue = new TaskQueue<RegistrationOfficePayload>(versionId);
  }
  
  /**
   * Initializes the controller with workers from the pool
   * 
   * @param workerConfig - Configuration for workers
   */
  async initialize(workerConfig: WorkerConfig): Promise<void> {
    const { maxConcurrentWorkers } = this.config;
    
    // Create workers and add them to the pool
    for (let i = 0; i < maxConcurrentWorkers; i++) {
      const worker = this.createWorker(workerConfig);
      this.workerPool.addWorker(worker);
    }
    
    // No need to load tasks from database as we're creating them on demand
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
   * @param districtNames - Map of district IDs to district names
   * @returns Promise resolving to the results
   */
  async fetchRegistrationOffices(
    districtIds: string[],
    districtNames: Record<string, string> = {}
  ): Promise<RegistrationOfficeResult> {
    logger.info(`Fetching registration offices for ${districtIds.length} districts in state ${this.stateName}`);
    
    // Add tasks to the queue
    for (const districtId of districtIds) {
      this.taskQueue.addTask({ 
        districtId,
        stateId: this.stateId,
        stateName: this.stateName
      });
    }
    
    // Process tasks in batches
    const allResults: RegistrationOfficeResult = [];
    
    while (this.taskQueue.hasPendingTasks()) {
      // Get workers from the pool
      const availableWorkers = this.workerPool.getWorkers(this.config.maxConcurrentWorkers);
      
      if (availableWorkers.length === 0) {
        logger.warn('No workers available from the pool');
        // Wait a bit before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Get tasks for the available workers
      const tasksPerWorker = this.config.maxTasksPerWorker;
      const tasks = this.taskQueue.getNextBatch(tasksPerWorker * availableWorkers.length);
      
      if (tasks.length === 0) {
        // Return workers to the pool
        availableWorkers.forEach(worker => this.workerPool.returnWorker(worker));
        break;
      }
      
      logger.info(`Processing batch of ${tasks.length} tasks with ${availableWorkers.length} workers`);
      
      // Distribute tasks among workers
      const results = await this.processTasks(tasks, availableWorkers);
      
      // Extract successful results
      const successfulResults = results
        .filter(result => result.success && result.data)
        .flatMap(result => result.data as RegistrationOfficeResult);
      
      // Ensure all registration offices have state information
      const enrichedResults = successfulResults.map(office => ({
        ...office,
        state_id: this.stateId,
        state_name: this.stateName
      }));
      
      allResults.push(...enrichedResults);
      
      // Return workers to the pool
      availableWorkers.forEach(worker => this.workerPool.returnWorker(worker));
    }
    
    logger.info(`Found ${allResults.length} registration offices across ${districtIds.length} districts in state ${this.stateName}`);
    
    return allResults;
  } 
  
  /**
   * Process a batch of tasks using workers
   * 
   * @param tasks - Tasks to process
   * @param workers - Workers to use
   * @returns Promise resolving to task results
   */
  private async processTasks(
    tasks: TaskWithStatus<RegistrationOfficePayload>[], 
    workers: Worker<RegistrationOfficePayload, RegistrationOfficeResult>[]
  ): Promise<TaskResult<RegistrationOfficeResult>[]> {
    const results: TaskResult<RegistrationOfficeResult>[] = [];
    const promises: Promise<void>[] = [];
    
    // Distribute tasks among workers
    const tasksPerWorker = Math.ceil(tasks.length / workers.length);
    
    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const startIdx = i * tasksPerWorker;
      const endIdx = Math.min(startIdx + tasksPerWorker, tasks.length);
      const workerTasks = tasks.slice(startIdx, endIdx);
      
      if (workerTasks.length === 0) continue;
      
      // Convert to worker tasks
      const workerTasksFormatted = this.taskQueue.toTasks(workerTasks);
      
      const promise = (async () => {
        try {
          // Execute tasks using the worker
          const taskResults = await worker.fetchBatch(workerTasksFormatted);
          
          // Update task status
          taskResults.forEach(result => {
            this.taskQueue.updateTaskStatus(
              result.taskId, 
              result.success ? 'completed' : 'failed',
              result.error?.toString()
            );
          });
          
          results.push(...taskResults);
        } catch (error) {
          logger.error(`Error executing tasks with worker:`, error);
          
          // Mark all tasks as failed
          workerTasks.forEach(task => {
            this.taskQueue.updateTaskStatus(
              task.id, 
              'failed', 
              error instanceof Error ? error.message : String(error)
            );
            
            results.push({
              taskId: task.id,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
              timestamp: new Date()
            });
          });
        }
      })();
      
      promises.push(promise);
    }
    
    // Wait for all workers to complete
    await Promise.all(promises);
    
    return results;
  }
  
  /**
   * Check if all tasks are complete
   */
  isComplete(): boolean {
    return this.taskQueue.isComplete();
  }
  
  /**
   * Get task counts
   */
  getTaskCounts() {
    return this.taskQueue.getTaskCounts();
  }
} 