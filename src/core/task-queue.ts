/**
 * Task queue implementation for managing tasks
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Generic task interface
 */
export interface Task<P> {
  id: string;
  payload: P;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Extended task interface with status tracking
 */
export interface TaskWithStatus<P> extends Task<P> {
  status: TaskStatus;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

/**
 * TaskQueue manages a collection of tasks
 * 
 * @template P - Payload type
 */
export class TaskQueue<P> {
  private tasks: TaskWithStatus<P>[] = [];
  private name: string;
  
  /**
   * Create a new task queue
   * 
   * @param name - Name of the task queue for logging
   */
  constructor(name: string) {
    this.name = name;
    logger.info(`Created task queue: ${name}`);
  }
  
  /**
   * Add a new task to the queue
   * 
   * @param payload - Payload for the task
   * @returns The created task
   */
  addTask(payload: P): TaskWithStatus<P> {
    const task: TaskWithStatus<P> = {
      id: uuidv4(),
      payload,
      status: 'pending',
      attempts: 0
    };
    
    this.tasks.push(task);
    logger.info(`Added task to queue ${this.name} (${this.tasks.length} total tasks)`);
    
    return task;
  }
  
  /**
   * Add multiple tasks to the queue
   * 
   * @param payloads - Array of payloads for tasks
   * @returns Array of created tasks
   */
  addTasks(payloads: P[]): TaskWithStatus<P>[] {
    const tasks = payloads.map(payload => this.addTask(payload));
    logger.info(`Added ${tasks.length} tasks to queue ${this.name} (${this.tasks.length} total tasks)`);
    return tasks;
  }
  
  /**
   * Get the next batch of pending tasks
   * 
   * @param batchSize - Maximum number of tasks to return
   * @returns Array of tasks
   */
  getNextBatch(batchSize: number): TaskWithStatus<P>[] {
    const pendingTasks = this.tasks
      .filter(task => task.status === 'pending')
      .slice(0, batchSize);
      
    // Mark these tasks as in_progress
    pendingTasks.forEach(task => {
      task.status = 'in_progress';
      task.attempts += 1;
      task.lastAttempt = new Date();
    });
    
    logger.info(`Got ${pendingTasks.length} tasks from queue ${this.name}`);
    
    return pendingTasks;
  }
  
  /**
   * Convert tasks with status to standard tasks
   * 
   * @param tasks - Tasks with status
   * @returns Array of standard tasks
   */
  toTasks(tasks: TaskWithStatus<P>[]): Task<P>[] {
    return tasks.map(task => ({ id: task.id, payload: task.payload }));
  }
  
  /**
   * Update the status of a task
   * 
   * @param taskId - ID of the task to update
   * @param status - New status
   * @param error - Optional error message
   */
  updateTaskStatus(taskId: string, status: 'completed' | 'failed', error?: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      if (error) task.error = error;
      logger.info(`Updated task ${taskId} status to ${status} in queue ${this.name}`);
    } else {
      logger.warn(`Task ${taskId} not found in queue ${this.name}`);
    }
  }
  
  /**
   * Check if all tasks are complete
   * 
   * @returns True if all tasks are either completed or failed
   */
  isComplete(): boolean {
    return this.tasks.every(task => 
      task.status === 'completed' || task.status === 'failed');
  }
  
  /**
   * Get counts of tasks by status
   * 
   * @returns Object with counts of tasks by status
   */
  getTaskCounts(): { pending: number, inProgress: number, completed: number, failed: number, total: number } {
    return {
      pending: this.tasks.filter(t => t.status === 'pending').length,
      inProgress: this.tasks.filter(t => t.status === 'in_progress').length,
      completed: this.tasks.filter(t => t.status === 'completed').length,
      failed: this.tasks.filter(t => t.status === 'failed').length,
      total: this.tasks.length
    };
  }
  
  /**
   * Check if there are any pending tasks
   * 
   * @returns True if there are pending tasks
   */
  hasPendingTasks(): boolean {
    return this.tasks.some(task => task.status === 'pending');
  }
  
  /**
   * Get all tasks
   * 
   * @returns Array of all tasks
   */
  getAllTasks(): TaskWithStatus<P>[] {
    return [...this.tasks];
  }
} 