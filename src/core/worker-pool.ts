/**
 * Worker pool implementation for managing worker instances
 */

import logger from '@/utils/logger.js';

/**
 * Worker interface
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export interface Worker<P, R> {
  /**
   * Fetches data based on the provided task
   * 
   * @param task - Task to execute
   * @returns Promise resolving to the task result
   */
  fetch(task: { id: string, payload: P }): Promise<{ taskId: string, success: boolean, data?: R, error?: Error | string, timestamp: Date }>;
  
  /**
   * Fetches data for multiple tasks
   * 
   * @param tasks - Array of tasks to execute
   * @returns Promise resolving to an array of task results
   */
  fetchBatch(tasks: Array<{ id: string, payload: P }>): Promise<Array<{ taskId: string, success: boolean, data?: R, error?: Error | string, timestamp: Date }>>;
}

/**
 * WorkerPool manages a collection of workers and provides methods to get available workers
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export class WorkerPool<P, R> {
  private workers: Worker<P, R>[] = [];
  private maxWorkers: number;
  private busyWorkers: Set<Worker<P, R>> = new Set();
  
  /**
   * Create a new worker pool
   * 
   * @param maxWorkers - Maximum number of workers in the pool
   */
  constructor(maxWorkers: number) {
    this.maxWorkers = maxWorkers;
    logger.info(`Created worker pool with max ${maxWorkers} workers`);
  }
  
  /**
   * Add a worker to the pool
   * 
   * @param worker - Worker to add to the pool
   * @returns True if the worker was added, false if the pool is full
   */
  addWorker(worker: Worker<P, R>): boolean {
    if (this.workers.length < this.maxWorkers) {
      this.workers.push(worker);
      logger.info(`Added worker to pool (${this.workers.length}/${this.maxWorkers})`);
      return true;
    }
    logger.warn(`Worker pool is full (${this.workers.length}/${this.maxWorkers})`);
    return false;
  }
  
  /**
   * Get an available worker from the pool
   * 
   * @returns An available worker or null if none are available
   */
  getWorker(): Worker<P, R> | null {
    const availableWorker = this.workers.find(worker => !this.busyWorkers.has(worker));
    
    if (availableWorker) {
      this.busyWorkers.add(availableWorker);
      logger.info(`Got worker from pool (${this.busyWorkers.size} busy, ${this.workers.length - this.busyWorkers.size} available)`);
    } else {
      logger.warn(`No available workers in pool (${this.busyWorkers.size} busy, ${this.workers.length - this.busyWorkers.size} available)`);
    }
    
    return availableWorker || null;
  }
  
  /**
   * Get multiple available workers from the pool
   * 
   * @param count - Maximum number of workers to get
   * @returns Array of available workers (may be empty if none are available)
   */
  getWorkers(count: number): Worker<P, R>[] {
    const availableWorkers = this.workers.filter(worker => !this.busyWorkers.has(worker));
    const workersToReturn = availableWorkers.slice(0, count);
    
    // Mark these workers as busy
    workersToReturn.forEach(worker => this.busyWorkers.add(worker));
    
    logger.info(`Got ${workersToReturn.length} workers from pool (${this.busyWorkers.size} busy, ${this.workers.length - this.busyWorkers.size} available)`);
    
    return workersToReturn;
  }
  
  /**
   * Return a worker to the pool (mark as not busy)
   * 
   * @param worker - The worker to return to the pool
   */
  returnWorker(worker: Worker<P, R>): void {
    if (this.busyWorkers.has(worker)) {
      this.busyWorkers.delete(worker);
      logger.info(`Returned worker to pool (${this.busyWorkers.size} busy, ${this.workers.length - this.busyWorkers.size} available)`);
    }
  }
  
  /**
   * Get the current status of the worker pool
   * 
   * @returns Object with counts of total, busy, and available workers
   */
  getStatus(): { total: number, busy: number, available: number } {
    return {
      total: this.workers.length,
      busy: this.busyWorkers.size,
      available: this.workers.length - this.busyWorkers.size
    };
  }
} 