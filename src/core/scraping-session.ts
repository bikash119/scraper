/**
 * Scraping session implementation
 */

import { v4 as uuidv4 } from 'uuid';
import { WorkerPool } from './worker-pool.js';
import { RegistrationOfficeControllerV2 } from '@/controllers/registration-office-controller-v2.js';
import { ControllerConfig } from '@/types/controller.js';
import { WorkerConfig, RegistrationOfficePayload, RegistrationOfficeResult } from '@/types/worker.js';
import logger from '@/utils/logger.js';
import { HttpClient } from '@/types/worker.js';
import { supabase } from '@/db/index.js';
import { SessionProvider } from '@/utils/session-provider.js';

/**
 * ScrapingSession manages the scraping process
 */
export class ScrapingSession {
  private versionId: string;
  private workerPool: WorkerPool<RegistrationOfficePayload, RegistrationOfficeResult>;
  private controllers: {
    registrationOffice?: RegistrationOfficeControllerV2;
    // Add other controllers as needed
  } = {};
  private maxWorkers: number;
  private tasksPerWorker: number;
  private monitorInterval: NodeJS.Timeout | null = null;
  private sessionProvider: SessionProvider;
  
  /**
   * Creates a new scraping session
   * 
   * @param versionId - Version ID for this scraping session
   * @param maxWorkers - Maximum number of workers to use
   * @param tasksPerWorker - Maximum number of tasks per worker
   */
  constructor(versionId: string, maxWorkers: number = 3, tasksPerWorker: number = 4) {
    this.versionId = versionId;
    this.maxWorkers = maxWorkers;
    this.tasksPerWorker = tasksPerWorker;
    
    // Initialize worker pool
    this.workerPool = new WorkerPool<RegistrationOfficePayload, RegistrationOfficeResult>(maxWorkers);
    this.sessionProvider = new SessionProvider();
  }
  /**
   * Gets the session provider instance
   * 
   * @returns SessionProvider instance
   */
  getSessionProvider(): SessionProvider {
    return this.sessionProvider;
  }
  /**
   * Initialize the controllers
   * 
   * @param baseUrl - Base URL for API requests
   * @param httpClient - HTTP client to use
   */
  async initialize(baseUrl: string, httpClient: HttpClient): Promise<void> {
    // Create controller configuration
    const controllerConfig: ControllerConfig = {
      maxConcurrentWorkers: this.maxWorkers,
      maxTasksPerWorker: this.tasksPerWorker,
      workerLaunchDelayMs: 500
    };
    
    // Create worker configuration
    const workerConfig: WorkerConfig = {
      baseUrl,
      endpoint: '/GetRegoffice',
      httpClient,
      sessionData: this.sessionProvider.getSessionData,
      delayMs: 1000
    };
    
    // Initialize registration office controller
    this.controllers.registrationOffice = new RegistrationOfficeControllerV2(
      controllerConfig,
      this.workerPool,
      this.versionId
    );
    
    // Initialize the controller with worker configuration
    await this.controllers.registrationOffice.initialize(workerConfig);
    
    // Start monitoring progress
    this.startMonitoring();
  }
  
  /**
   * Start the scraping process
   * 
   * @param districtIds - Array of district IDs to scrape
   */
  async start(districtIds: string[]): Promise<void> {
    
    // Update version status to in_progress
    await supabase
      .from('versions')
      .update({ status: 'in_progress' })
      .eq('id', this.versionId);
    
    logger.info(`Starting scraping session ${this.versionId} with ${districtIds.length} districts`);
    
    // Fetch registration offices
    if (this.controllers.registrationOffice) {
      const registrationOffices = await this.controllers.registrationOffice.fetchRegistrationOffices(districtIds);
      logger.info(`Found ${registrationOffices.length} registration offices`);
      
      // Here you would continue with other controllers (villages, plots, etc.)
      // based on the registration offices found
    }
  }
  
  /**
   * Start monitoring progress
   */
  private startMonitoring(): void {
    
    this.monitorInterval = setInterval(async () => {
      try {
        // Get task counts from all controllers
        const counts = {
          pending: 0,
          inProgress: 0,
          completed: 0,
          failed: 0,
          total: 0
        };
        
        // Aggregate counts from all controllers
        if (this.controllers.registrationOffice) {
          const controllerCounts = this.controllers.registrationOffice.getTaskCounts();
          counts.pending += controllerCounts.pending;
          counts.inProgress += controllerCounts.inProgress;
          counts.completed += controllerCounts.completed;
          counts.failed += controllerCounts.failed;
          counts.total += controllerCounts.total;
        }
        
        // Update version with current counts
        await supabase
          .from('versions')
          .update({ 
            items_scraped: counts.completed,
            error_count: counts.failed
          })
          .eq('id', this.versionId);
        
        // Log progress
        logger.info(`Progress: ${counts.completed}/${counts.total} completed, ${counts.failed} failed, ${counts.pending} pending, ${counts.inProgress} in progress`);
        
        // Check if all controllers are complete
        const allComplete = Object.values(this.controllers).every(
          controller => controller?.isComplete() ?? true
        );
        
        if (allComplete && counts.pending === 0 && counts.inProgress === 0) {
          // All done
          if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
          }
          
          // Update version status
          const finalStatus = counts.failed > 0 ? 'completed_with_errors' : 'completed';
          await supabase
            .from('versions')
            .update({ 
              status: finalStatus,
              end_time: new Date().toISOString()
            })
            .eq('id', this.versionId);
            
          logger.info(`Scraping session ${this.versionId} completed with status: ${finalStatus}`);
          logger.info(`Final counts: ${counts.completed} completed, ${counts.failed} failed out of ${counts.total} total tasks`);
        }
      } catch (error) {
        logger.error('Error monitoring progress:', error);
      }
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Stop the scraping session
   */
  async stop(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    // Update version status to stopped
    await supabase
      .from('versions')
      .update({ 
        status: 'stopped',
        end_time: new Date().toISOString()
      })
      .eq('id', this.versionId);
      
    logger.info(`Scraping session ${this.versionId} stopped`);
  }
}

/**
 * Create a new scraping session
 * 
 * @param baseUrl - Base URL for API requests
 * @param maxWorkers - Maximum number of workers to use
 * @param tasksPerWorker - Maximum number of tasks per worker
 */
export async function createScrapingSession(
  baseUrl: string,
  maxWorkers: number = 3,
  tasksPerWorker: number = 4
): Promise<{ versionId: string, session: ScrapingSession }> {

  // Create a new version record
  const { data: versionData, error: versionError } = await supabase
    .from('versions')
    .select('version_number')
    .order('version_number', { ascending: false })
    .limit(1);
    
  if (versionError) {
    throw versionError;
  }
  
  const newVersionNumber = versionData && versionData.length > 0 
    ? versionData[0].version_number + 1 
    : 1;
    
  const { data: newVersion, error: insertError } = await supabase
    .from('versions')
    .insert({
      version_number: newVersionNumber,
      status: 'started'
    })
    .select('id')
    .single();
    
  if (insertError) {
    throw insertError;
  }
  
  const versionId = newVersion.id;
  
  // Create and initialize the scraping session
  const session = new ScrapingSession(versionId, maxWorkers, tasksPerWorker);
  await session.initialize(baseUrl,session.getSessionProvider().getHttpClient());
  
  return { versionId, session };
} 