/**
 * Worker pool manager for managing worker pools
 */

import { Worker } from '@/core/types/worker.js';
import logger from '@/utils/logger.js';

/**
 * Configuration for a worker pool
 */
export interface WorkerPoolConfig {
  /**
   * Maximum number of workers in the pool
   */
  maxWorkers: number;
  
  /**
   * Name of the pool for identification
   */
  name: string;
}

/**
 * Worker pool for managing a set of workers
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export class WorkerPool<P, R> {
  private workers: Worker<P, R>[] = [];
  private availableWorkers: Worker<P, R>[] = [];
  private config: WorkerPoolConfig;
  
  /**
   * Creates a new worker pool
   * 
   * @param config - Worker pool configuration
   * @param initialWorkers - Initial set of workers to add to the pool
   */
  constructor(config: WorkerPoolConfig, initialWorkers: Worker<P, R>[] = []) {
    this.config = config;
    
    // Add initial workers
    initialWorkers.forEach(worker => this.addWorker(worker));
    
    logger.info(`Created worker pool "${config.name}" with max ${config.maxWorkers} workers`);
  }
  
  /**
   * Adds a worker to the pool
   * 
   * @param worker - Worker to add
   * @returns True if the worker was added, false if the pool is full
   */
  addWorker(worker: Worker<P, R>): boolean {
    if (this.workers.length >= this.config.maxWorkers) {
      logger.warn(`Cannot add worker to pool "${this.config.name}": pool is full (${this.workers.length}/${this.config.maxWorkers})`);
      return false;
    }
    
    this.workers.push(worker);
    this.availableWorkers.push(worker);
    
    logger.info(`Added worker to pool "${this.config.name}" (${this.workers.length}/${this.config.maxWorkers})`);
    return true;
  }
  
  /**
   * Borrows a worker from the pool
   * 
   * @returns A worker from the pool, or undefined if none are available
   */
  borrowWorker(): Worker<P, R> | undefined {
    if (this.availableWorkers.length === 0) {
      logger.warn(`No available workers in pool "${this.config.name}"`);
      return undefined;
    }
    
    const worker = this.availableWorkers.pop();
    logger.info(`Borrowed worker from pool "${this.config.name}" (${this.availableWorkers.length} remaining)`);
    
    return worker;
  }
  
  /**
   * Returns a worker to the pool
   * 
   * @param worker - Worker to return
   * @returns True if the worker was returned, false if the worker doesn't belong to this pool
   */
  returnWorker(worker: Worker<P, R>): boolean {
    if (!this.workers.includes(worker)) {
      logger.warn(`Cannot return worker to pool "${this.config.name}": worker doesn't belong to this pool`);
      return false;
    }
    
    if (this.availableWorkers.includes(worker)) {
      logger.warn(`Worker is already in the available pool "${this.config.name}"`);
      return false;
    }
    
    this.availableWorkers.push(worker);
    logger.info(`Returned worker to pool "${this.config.name}" (${this.availableWorkers.length}/${this.workers.length} available)`);
    
    return true;
  }
  
  /**
   * Gets the number of available workers
   * 
   * @returns Number of available workers
   */
  getAvailableCount(): number {
    return this.availableWorkers.length;
  }
  
  /**
   * Gets the total number of workers
   * 
   * @returns Total number of workers
   */
  getTotalCount(): number {
    return this.workers.length;
  }
  
  /**
   * Gets the name of the pool
   * 
   * @returns Name of the pool
   */
  getName(): string {
    return this.config.name;
  }
}

/**
 * Resource limits for the scraping session
 */
export interface ResourceLimits {
  /**
   * Maximum number of concurrent workers across all pools
   */
  maxConcurrentWorkers: number;
  
  /**
   * Maximum number of requests per minute
   */
  maxRequestsPerMinute: number;
  
  /**
   * Maximum number of requests per hour
   */
  maxRequestsPerHour: number;
}

/**
 * Worker pool manager for managing multiple worker pools
 */
export class WorkerPoolManager {
  private pools: Map<string, WorkerPool<any, any>> = new Map();
  private resourceLimits: ResourceLimits;
  
  /**
   * Creates a new worker pool manager
   * 
   * @param resourceLimits - Resource limits for the scraping session
   */
  constructor(resourceLimits: ResourceLimits) {
    this.resourceLimits = resourceLimits;
    
    logger.info(`Created worker pool manager with limits: ${JSON.stringify(resourceLimits)}`);
  }
  
  /**
   * Creates a new worker pool
   * 
   * @param config - Worker pool configuration
   * @param initialWorkers - Initial set of workers to add to the pool
   * @returns The created worker pool
   */
  createPool<P, R>(config: WorkerPoolConfig, initialWorkers: Worker<P, R>[] = []): WorkerPool<P, R> {
    if (this.pools.has(config.name)) {
      throw new Error(`Worker pool with name "${config.name}" already exists`);
    }
    
    // Ensure we don't exceed the maximum number of concurrent workers
    const totalWorkers = Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.getTotalCount(), 0);
    const availableWorkers = this.resourceLimits.maxConcurrentWorkers - totalWorkers;
    
    if (availableWorkers <= 0) {
      throw new Error(`Cannot create worker pool: maximum number of concurrent workers (${this.resourceLimits.maxConcurrentWorkers}) reached`);
    }
    
    // Adjust max workers if needed
    const adjustedConfig = {
      ...config,
      maxWorkers: Math.min(config.maxWorkers, availableWorkers)
    };
    
    if (adjustedConfig.maxWorkers < config.maxWorkers) {
      logger.warn(`Adjusted worker pool "${config.name}" max workers from ${config.maxWorkers} to ${adjustedConfig.maxWorkers} due to resource limits`);
    }
    
    const pool = new WorkerPool<P, R>(adjustedConfig, initialWorkers);
    this.pools.set(config.name, pool);
    
    return pool;
  }
  
  /**
   * Gets a worker pool by name
   * 
   * @param name - Name of the pool
   * @returns The worker pool, or undefined if not found
   */
  getPool<P, R>(name: string): WorkerPool<P, R> | undefined {
    return this.pools.get(name) as WorkerPool<P, R> | undefined;
  }
  
  /**
   * Removes a worker pool
   * 
   * @param name - Name of the pool to remove
   * @returns True if the pool was removed, false if it wasn't found
   */
  removePool(name: string): boolean {
    return this.pools.delete(name);
  }
  
  /**
   * Gets the resource limits
   * 
   * @returns Resource limits for the scraping session
   */
  getResourceLimits(): ResourceLimits {
    return { ...this.resourceLimits };
  }
  
  /**
   * Gets statistics about all worker pools
   * 
   * @returns Statistics about all worker pools
   */
  getStats(): { totalWorkers: number; availableWorkers: number; poolCount: number } {
    const pools = Array.from(this.pools.values());
    const totalWorkers = pools.reduce((sum, pool) => sum + pool.getTotalCount(), 0);
    const availableWorkers = pools.reduce((sum, pool) => sum + pool.getAvailableCount(), 0);
    
    return {
      totalWorkers,
      availableWorkers,
      poolCount: this.pools.size
    };
  }
} 