import { HttpClient, SessionData } from '@/types/worker.js';

/**
 * Configuration for a worker
 */
export interface WorkerConfigOptions {
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
  
  /**
   * Function to execute a task
   */
  executeTask: (task: any) => Promise<any>;
}

/**
 * WorkerConfig is used to configure a worker from the pool
 */
export class WorkerConfig {
  private options: WorkerConfigOptions;
  
  /**
   * Create a new worker configuration
   * @param options Configuration options
   */
  constructor(options: WorkerConfigOptions) {
    this.options = options;
  }
  
  /**
   * Execute a task using this configuration
   * @param task The task to execute
   * @returns Result of the task execution
   */
  async executeTask(task: any): Promise<any> {
    return this.options.executeTask(task);
  }
  
  /**
   * Get the configuration options
   */
  getOptions(): WorkerConfigOptions {
    return this.options;
  }
  
  /**
   * Create request headers with additional headers
   * @param additionalHeaders Additional headers to include
   * @returns Headers with session information and additional headers
   */
  createHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const sessionData = this.options.sessionProvider();
    
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
} 