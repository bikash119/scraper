/**
 * Example demonstrating the use of the worker pool and task queue
 */

import { WorkerPool, Worker } from '../core/worker-pool.js';
import { TaskQueue } from '../core/task-queue.js';
import logger from '../utils/logger.js';

// Define a simple payload and result type
interface SimplePayload {
  value: number;
}

interface SimpleResult {
  value: number;
  squared: number;
}

// Create a simple worker that squares numbers
class SquareWorker implements Worker<SimplePayload, SimpleResult> {
  private id: string;
  
  constructor(id: string) {
    this.id = id;
  }
  
  async fetch(task: { id: string, payload: SimplePayload }): Promise<{ taskId: string, success: boolean, data?: SimpleResult, error?: Error | string, timestamp: Date }> {
    try {
      logger.info(`Worker ${this.id} processing task ${task.id} with value ${task.payload.value}`);
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result: SimpleResult = {
        value: task.payload.value,
        squared: task.payload.value * task.payload.value
      };
      
      return {
        taskId: task.id,
        success: true,
        data: result,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date()
      };
    }
  }
  
  async fetchBatch(tasks: Array<{ id: string, payload: SimplePayload }>): Promise<Array<{ taskId: string, success: boolean, data?: SimpleResult, error?: Error | string, timestamp: Date }>> {
    const results = [];
    
    for (const task of tasks) {
      const result = await this.fetch(task);
      results.push(result);
    }
    
    return results;
  }
}

// Main function to demonstrate the worker pool and task queue
async function main() {
  // Create a worker pool with 3 workers
  const workerPool = new WorkerPool<SimplePayload, SimpleResult>(3);
  
  // Create and add workers to the pool
  for (let i = 1; i <= 3; i++) {
    const worker = new SquareWorker(`worker-${i}`);
    workerPool.addWorker(worker);
  }
  
  // Create a task queue
  const taskQueue = new TaskQueue<SimplePayload>('square-tasks');
  
  // Add tasks to the queue
  for (let i = 1; i <= 10; i++) {
    taskQueue.addTask({ value: i });
  }
  
  // Process tasks in batches
  while (taskQueue.hasPendingTasks()) {
    // Get available workers
    const workers = workerPool.getWorkers(3);
    
    if (workers.length === 0) {
      logger.warn('No workers available, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    
    // Get tasks for the available workers (2 tasks per worker)
    const tasks = taskQueue.getNextBatch(workers.length * 2);
    
    if (tasks.length === 0) {
      // Return workers to the pool
      workers.forEach(worker => workerPool.returnWorker(worker));
      break;
    }
    
    logger.info(`Processing ${tasks.length} tasks with ${workers.length} workers`);
    
    // Distribute tasks among workers
    const tasksPerWorker = Math.ceil(tasks.length / workers.length);
    const promises = [];
    
    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const startIdx = i * tasksPerWorker;
      const endIdx = Math.min(startIdx + tasksPerWorker, tasks.length);
      const workerTasks = tasks.slice(startIdx, endIdx);
      
      if (workerTasks.length === 0) continue;
      
      // Convert to standard tasks
      const standardTasks = taskQueue.toTasks(workerTasks);
      
      const promise = (async () => {
        try {
          // Execute tasks using the worker
          const results = await worker.fetchBatch(standardTasks);
          
          // Update task status
          results.forEach(result => {
            taskQueue.updateTaskStatus(
              result.taskId, 
              result.success ? 'completed' : 'failed',
              result.error?.toString()
            );
            
            if (result.success && result.data) {
              logger.info(`Task ${result.taskId} completed: ${result.data.value} squared is ${result.data.squared}`);
            } else {
              logger.error(`Task ${result.taskId} failed: ${result.error}`);
            }
          });
        } catch (error) {
          logger.error(`Error executing tasks with worker:`, error);
          
          // Mark all tasks as failed
          workerTasks.forEach(task => {
            taskQueue.updateTaskStatus(
              task.id, 
              'failed', 
              error instanceof Error ? error.message : String(error)
            );
          });
        }
      })();
      
      promises.push(promise);
    }
    
    // Wait for all workers to complete
    await Promise.all(promises);
    
    // Return workers to the pool
    workers.forEach(worker => workerPool.returnWorker(worker));
  }
  
  // Print final task counts
  const counts = taskQueue.getTaskCounts();
  logger.info(`Final counts: ${counts.completed} completed, ${counts.failed} failed, ${counts.pending} pending, ${counts.inProgress} in progress`);
}

// Run the example
main().catch(error => {
  logger.error('Error running example:', error);
}); 