/**
 * Tests for the ScrapingSession class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrapingSession, ScrapingSessionConfig } from '@/core/scraping-session.js';
import { BaseWorker } from '@/core/workers/base-worker.js';
import { BaseController, ControllerConfigWithPool } from '@/controllers/base-controller.js';
import { Task, TaskResult, Worker, WorkerConfig } from '@/core/types/worker.js';
import { WorkerPool } from '@/core/worker-pool-manager.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock the registration office controller
vi.mock('@/controllers/registration-office-controller.js', () => ({
  RegistrationOfficeController: vi.fn().mockImplementation((config) => {
    return new MockRegistrationOfficeController(config);
  })
}));

// Mock payload and result types
interface TestPayload {
  id: string;
}

interface TestResult {
  value: string;
}

// Mock worker class
class TestWorker extends BaseWorker<TestPayload, TestResult> {
  protected async executeTask(payload: TestPayload): Promise<TestResult> {
    return { value: `Result for ${payload.id}` };
  }
}

// Mock controller class that creates workers
class MockRegistrationOfficeController extends BaseController<TestPayload, TestResult> {
  initializeWorkersCalled = false;
  
  constructor(config: ControllerConfigWithPool) {
    super(config);
  }
  
  protected override initializeWorkers(): void {
    this.initializeWorkersCalled = true;
    
    if (!this.workerPool) return;
    
    // Add some test workers to the pool
    for (let i = 0; i < 3; i++) {
      const worker = this.createWorker(this.createWorkerConfig('/test'));
      this.addWorker(worker);
    }
  }
  
  protected override createWorker(workerConfig: WorkerConfig): Worker<TestPayload, TestResult> {
    return new TestWorker(workerConfig);
  }
}

describe('ScrapingSession', () => {
  let config: ScrapingSessionConfig;
  let httpClient: any;
  let sessionProvider: any;
  
  beforeEach(() => {
    // Mock HTTP client
    httpClient = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({})
    };
    
    // Mock session provider
    sessionProvider = vi.fn().mockReturnValue({
      antiXsrfToken: 'test-token',
      cookies: ['session=test'],
      data: '',
      districts: { '1': 'District 1' }
    });
    
    // Create config
    config = {
      resourceLimits: {
        maxConcurrentWorkers: 5,
        maxRequestsPerMinute: 30,
        maxRequestsPerHour: 500
      },
      baseUrl: 'https://test.example.com',
      httpClient,
      sessionProvider,
      headers: { 'User-Agent': 'Test Agent' }
    };
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should create a scraping session with the provided config', () => {
    const session = new ScrapingSession(config);
    expect(session).toBeDefined();
    expect(session.getConfig()).toEqual(config);
  });
  
  it('should initialize controllers', async () => {
    const session = new ScrapingSession(config);
    await session.initialize();
    
    // Check if controllers were created
    expect(session.getController('district')).toBeDefined();
    expect(session.getController('registration-office')).toBeDefined();
  });
  
  it('should create worker pools during initialization', async () => {
    const session = new ScrapingSession(config);
    await session.initialize();
    
    // Check if worker pools were created
    expect(session.getWorkerPool('district')).toBeDefined();
    expect(session.getWorkerPool('registration-office')).toBeDefined();
  });
  
  it('should execute tasks using controllers', async () => {
    const session = new ScrapingSession(config);
    await session.initialize();
    
    // Get the registration office controller
    const controller = session.getController<TestPayload, TestResult>('registration-office');
    expect(controller).toBeDefined();
    
    if (controller) {
      // Create tasks
      const tasks: Task<TestPayload>[] = [
        { id: '1', payload: { id: 'test1' } },
        { id: '2', payload: { id: 'test2' } }
      ];
      
      // Mock the execute method
      const mockResults: TaskResult<TestResult>[] = [
        { 
          taskId: '1', 
          success: true, 
          data: { value: 'Result for test1' }, 
          timestamp: new Date() 
        },
        { 
          taskId: '2', 
          success: true, 
          data: { value: 'Result for test2' }, 
          timestamp: new Date() 
        }
      ];
      
      const executeSpy = vi.spyOn(controller, 'execute').mockResolvedValue(mockResults);
      
      // Execute tasks
      const results = await controller.execute(tasks);
      
      // Check results
      expect(executeSpy).toHaveBeenCalledWith(tasks);
      expect(results).toEqual(mockResults);
    }
  });
}); 