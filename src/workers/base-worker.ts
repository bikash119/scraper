/**
 * Base worker implementation
 */

import { 
  Worker, 
  Task, 
  TaskResult, 
  WorkerConfig
} from '../types/worker.js';
import logger from '../utils/logger.js';

/**
 * Sleep function to add delay between requests
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Base worker implementation
 * 
 * @template P - Payload type
 * @template R - Result type
 */
export class BaseWorker<P, R> implements Worker<P, R> {
  protected config: WorkerConfig;

  /**
   * Creates a new BaseWorker
   * 
   * @param config - Worker configuration
   */
  constructor(config: WorkerConfig) {
    this.config = {
      delayMs: 1000,
      ...config
    };
  }

  /**
   * Fetches data based on the provided task
   * 
   * @param task - Task to execute
   * @returns Promise resolving to the task result
   */
  async fetch(task: Task<P>): Promise<TaskResult<R>> {
    try {
      logger.info(`Executing task ${task.id}`, { 
        worker: this.constructor.name, 
        payload: task.payload 
      });

      const data = await this.executeTask(task.payload);

      logger.info(`Task ${task.id} completed successfully`);

      return {
        taskId: task.id,
        success: true,
        data,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error executing task ${task.id}:`, error);

      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date()
      };
    }
  }

  /**
   * Fetches data for multiple tasks
   * 
   * @param tasks - Array of tasks to execute
   * @returns Promise resolving to an array of task results
   */
  async fetchBatch(tasks: Task<P>[]): Promise<TaskResult<R>[]> {
    const results: TaskResult<R>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      // Execute the task
      const result = await this.fetch(task);
      results.push(result);

      // Add delay before next task (except for the last task)
      if (i < tasks.length - 1 && this.config.delayMs) {
        logger.info(`Waiting ${this.config.delayMs}ms before next task...`);
        await sleep(this.config.delayMs);
      }
    }

    return results;
  }

  /**
   * Creates request headers with additional headers
   * 
   * @param additionalHeaders - Additional headers to include
   * @returns Headers with session information and additional headers
   */
  protected createHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const sessionData = this.config.sessionProvider();
    
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      ...additionalHeaders
    };

    // Add anti-XSRF token to headers if available
    if (sessionData.antiXsrfToken) {
      headers['__AntiXsrfToken'] = sessionData.antiXsrfToken;
    }
    
    // Add cookies to headers
    if (sessionData.cookies.length) {
      const cookieHeader = sessionData.cookies.map(cookie => cookie.split(';')[0]).join('; ');
      headers['Cookie'] = cookieHeader;
    }

    return headers;
  }

  /**
   * Executes a task with the given payload
   * 
   * @param payload - Task payload
   * @returns Promise resolving to the result
   */
  protected async executeTask(_payload: P): Promise<R> {
    throw new Error('Method not implemented. Subclasses must implement this method.');
  }
} 