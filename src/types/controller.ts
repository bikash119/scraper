/**
 * Controller types for managing workers and task distribution
 */

import { Task, TaskResult, Worker } from './worker.js';

/**
 * Configuration for the controller
 */
export interface ControllerConfig {
  /**
   * Maximum number of concurrent workers
   */
  maxConcurrentWorkers: number;
  
  /**
   * Maximum number of tasks per worker
   */
  maxTasksPerWorker: number;
  
  /**
   * Delay between launching workers in milliseconds
   */
  workerLaunchDelayMs?: number;
}

/**
 * Controller interface for managing workers and distributing tasks
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export interface Controller<P, R> {
  /**
   * Adds a worker to the controller
   * 
   * @param worker - Worker to add
   * @returns The controller instance for chaining
   */
  addWorker(worker: Worker<P, R>): Controller<P, R>;
  
  /**
   * Executes tasks using the available workers
   * 
   * @param tasks - Tasks to execute
   * @returns Promise resolving to the results of all tasks
   */
  execute(tasks: Task<P>[]): Promise<TaskResult<R>[]>;
  
  /**
   * Gets the current status of the controller
   * 
   * @returns Status information about the controller
   */
  getStatus(): ControllerStatus;
}

/**
 * Status information about the controller
 */
export interface ControllerStatus {
  /**
   * Number of active workers
   */
  activeWorkers: number;
  
  /**
   * Number of pending tasks
   */
  pendingTasks: number;
  
  /**
   * Number of completed tasks
   */
  completedTasks: number;
  
  /**
   * Number of failed tasks
   */
  failedTasks: number;
  
  /**
   * Whether the controller is currently executing tasks
   */
  isExecuting: boolean;
}

/**
 * Result of a worker execution
 * 
 * @template R - Result type
 */
export interface WorkerExecutionResult<R> {
  /**
   * Worker that executed the tasks
   */
  workerId: number;
  
  /**
   * Results of the tasks
   */
  results: TaskResult<R>[];
} 