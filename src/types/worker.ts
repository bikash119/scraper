/**
 * Types and interfaces for the IGRO scraper workers
 */

import { RegistrationOffice, Village, Plot } from '@/types/state.js';

/**
 * Session data interface for maintaining state across requests
 */
export interface SessionData {
  antiXsrfToken: string;
  cookies: string[];
  data: string;
  districts: Record<string, string>;
}

/**
 * Generic task interface
 * 
 * @template P - Payload type
 */
export interface Task<P> {
  /**
   * Unique identifier for the task
   */
  id: string;
  
  /**
   * Payload data for the task
   */
  payload: P;
  
  /**
   * Optional metadata for the task
   */
  metadata?: Record<string, any>;
}

/**
 * Result of a task execution
 * 
 * @template R - Result data type
 */
export interface TaskResult<R> {
  /**
   * Task ID this result belongs to
   */
  taskId: string;
  
  /**
   * Whether the task was successful
   */
  success: boolean;
  
  /**
   * Result data if successful
   */
  data?: R;
  
  /**
   * Error information if unsuccessful
   */
  error?: Error | string;
  
  /**
   * Timestamp when the task was completed
   */
  timestamp: Date;
}

/**
 * HTTP client interface for making requests
 */
export interface HttpClient {
  /**
   * Makes a GET request
   * 
   * @param url - URL to request
   * @param headers - Request headers
   * @returns Promise resolving to the response data
   */
  get<T>(url: string, headers?: Record<string, string>): Promise<T>;
  
  /**
   * Makes a POST request
   * 
   * @param url - URL to request
   * @param data - Request body
   * @param headers - Request headers
   * @returns Promise resolving to the response data
   */
  post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<T>;
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  /**
   * Base URL for API requests
   */
  baseUrl: string;
  
  /**
   * Endpoint path for the specific worker
   */
  endpoint: string;
  
  /**
   * Default request headers
   */
  headers?: Record<string, string>;
  
  /**
   * Delay between requests in milliseconds
   */
  delayMs?: number;
  
  /**
   * HTTP client for making requests
   */
  httpClient: HttpClient;
  
  /**
   * Session data provider
   */
  sessionProvider: () => SessionData;
}

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
  fetch(task: Task<P>): Promise<TaskResult<R>>;
  
  /**
   * Fetches data for multiple tasks
   * 
   * @param tasks - Array of tasks to execute
   * @returns Promise resolving to an array of task results
   */
  fetchBatch(tasks: Task<P>[]): Promise<TaskResult<R>[]>;
}

/**
 * Specific payload and result types for each worker
 */

// Registration Office Worker
export type RegistrationOfficePayload = {
  districtId: string;
};
export type RegistrationOfficeResult = RegistrationOffice[];

// Village Worker
export type VillagePayload = {
  registrationOfficeId: string;
};
export type VillageResult = Village[];

// Plot Worker
export type PlotPayload = {
  villageId: string;
};
export type PlotResult = Plot[]; 