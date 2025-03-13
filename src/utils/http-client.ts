/**
 * HTTP client implementation using axios
 */

import axios from 'axios';
import { HttpClient } from '../types/worker.js';
import logger from './logger.js';

/**
 * Implementation of the HttpClient interface using axios
 */
export class AxiosHttpClient implements HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  /**
   * Creates a new AxiosHttpClient
   * 
   * @param baseUrl - Base URL for all requests
   * @param defaultHeaders - Default headers to include in all requests
   */
  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
  }

  /**
   * Makes a GET request
   * 
   * @param url - URL to request
   * @param headers - Request headers
   * @returns Promise resolving to the response data
   */
  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    try {
      const response = await axios.get<T>(`${this.baseUrl}${url}`, {
        headers: {
          ...this.defaultHeaders,
          ...headers
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`GET request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Makes a POST request
   * 
   * @param url - URL to request
   * @param data - Request body
   * @param headers - Request headers
   * @returns Promise resolving to the response data
   */
  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<T> {
    try {
      const response = await axios.post<T>(`${this.baseUrl}${url}`, data, {
        headers: {
          ...this.defaultHeaders,
          ...headers
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`POST request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Updates the default headers
   * 
   * @param headers - New headers to set or update
   */
  updateDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...headers
    };
  }
} 