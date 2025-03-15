/**
 * Session provider for managing session data
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { SessionData } from '@/types/worker.js';
import { AxiosHttpClient } from '@/utils/http-client.js';
import logger from '@/utils/logger.js';

/**
 * Session provider for managing session data
 */
export class SessionProvider {
  private sessionData: SessionData | null = null;
  private httpClient: AxiosHttpClient;
  private baseUrl: string;
  private benchmarkUrl: string;

  /**
   * Creates a new SessionProvider
   * 
   * @param baseUrl - Base URL for the IGRO website
   */
  constructor(baseUrl: string = 'https://igrodisha.gov.in', benchmarkPath: string = '/ViewFeeValue.aspx') {
    this.baseUrl = baseUrl;
    this.benchmarkUrl = `${baseUrl}${benchmarkPath}`;
    
    this.httpClient = new AxiosHttpClient(this.benchmarkUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
  }

  /**
   * Initializes a new session
   * 
   * @returns Promise resolving to session data
   */
  async initialize(): Promise<SessionData> {
    try {
      logger.info(`Making initial request to ${this.benchmarkUrl}...`);
      
      // Make initial request to get cookies and form data
      const response = await axios.get(this.benchmarkUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      // Extract cookies from response headers
      const cookies = response.headers['set-cookie'] || [];
      logger.info(`Cookies found: ${cookies.length}`);
      
      // Find the anti-XSRF token in cookies
      let antiXsrfToken = '';
      for (const cookie of cookies) {
        if (cookie.includes('__AntiXsrfToken')) {
          const match = cookie.match(/__AntiXsrfToken=([^;]+)/);
          if (match && match[1]) {
            antiXsrfToken = match[1];
            break;
          }
        }
      }
      logger.info(`Anti-XSRF token found: ${antiXsrfToken ? 'Yes' : 'No'}`);

      // Parse the HTML response
      const $ = cheerio.load(response.data);
      logger.info('HTML loaded with cheerio');
      
      // Extract form data
      const data = $('input[name="__VIEWSTATE"]').val() as string || '';
      logger.info(`VIEWSTATE found: ${data ? 'Yes' : 'No'}`);

      // Check if the district dropdown exists
      const districtDropdown = $('#ContentPlaceHolder1_ddldist');
      logger.info(`District dropdown found: ${districtDropdown.length > 0 ? 'Yes' : 'No'}`);
      
      // Extract districts from the select element
      const districts: Record<string, string> = {};
      $('#ContentPlaceHolder1_ddldist option').each((_, element) => {
        const value = $(element).val() as string;
        const text = $(element).text().trim();
        if (value && value !== '0') { // Skip the default "Select" option if it has value="0"
          districts[value] = text;
        }
      });
      
      logger.info(`Districts found: ${Object.keys(districts).length}`);
      
      // Create and store session data
      this.sessionData = {
        antiXsrfToken,
        cookies,
        data,
        districts
      };
      
      // Update HTTP client headers with session information
      this.updateHttpClientHeaders();
      
      return this.sessionData;
    } catch (error) {
      logger.error('Error initializing session:', error);
      throw new Error('Failed to initialize session with IGRO Odisha website');
    }
  }

  /**
   * Gets the current session data
   * 
   * @returns Current session data
   * @throws Error if session is not initialized
   */
  getSessionData(): SessionData {
    if (!this.sessionData) {
      throw new Error('Session not initialized');
    }
    return this.sessionData;
  }

  /**
   * Updates the session data
   * 
   * @param sessionData - New session data
   */
  updateSessionData(sessionData: SessionData): void {
    this.sessionData = sessionData;
    this.updateHttpClientHeaders();
  }

  /**
   * Creates request headers with session information
   * 
   * @param additionalHeaders - Additional headers to include
   * @returns Headers with session information
   * @throws Error if session is not initialized
   */
  createHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    if (!this.sessionData) {
      throw new Error('Session not initialized');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': this.baseUrl,
      'Referer': this.benchmarkUrl,
      ...additionalHeaders
    };
    
    // Add anti-XSRF token to headers if available
    if (this.sessionData.antiXsrfToken) {
      headers['__AntiXsrfToken'] = this.sessionData.antiXsrfToken;
    }
    
    // Add cookies to headers
    if (this.sessionData.cookies.length > 0) {
      const cookieHeader = this.sessionData.cookies.map(cookie => cookie.split(';')[0]).join('; ');
      headers['Cookie'] = cookieHeader;
    }
    
    return headers;
  }

  /**
   * Updates the HTTP client headers with session information
   */
  private updateHttpClientHeaders(): void {
    if (this.sessionData) {
      const headers: Record<string, string> = {};
      
      // Add anti-XSRF token to headers if available
      if (this.sessionData.antiXsrfToken) {
        headers['__AntiXsrfToken'] = this.sessionData.antiXsrfToken;
      }
      
      // Add cookies to headers
      if (this.sessionData.cookies.length > 0) {
        const cookieHeader = this.sessionData.cookies.map(cookie => cookie.split(';')[0]).join('; ');
        headers['Cookie'] = cookieHeader;
      }
      
      this.httpClient.updateDefaultHeaders(headers);
    }
  }

  /**
   * Gets the HTTP client with session headers
   * 
   * @returns HTTP client with session headers
   */
  getHttpClient(): AxiosHttpClient {
    return this.httpClient;
  }
} 

