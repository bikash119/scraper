/**
 * Tests for the controller architecture
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  Task, 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  SessionData,
  HttpClient,
  Worker
} from '@/types/worker.js';
import { BaseController } from '@/controllers/base-controller.js';
import { RegistrationOfficeController } from '@/controllers/registration-office-controller.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock worker
class MockWorker<P, R> implements Worker<P, R> {
  fetch = vi.fn();
  fetchBatch = vi.fn();
}

describe('BaseController', () => {
  let controller: BaseController<string, number>;
  let worker1: MockWorker<string, number>;
  let worker2: MockWorker<string, number>;
  
  beforeEach(() => {
    // Create controller
    controller = new BaseController<string, number>({
      maxConcurrentWorkers: 2,
      maxTasksPerWorker: 3,
      workerLaunchDelayMs: 0 // No delay for testing
    });
    
    // Create mock workers
    worker1 = new MockWorker<string, number>();
    worker2 = new MockWorker<string, number>();
    
    // Add workers to controller
    controller.addWorker(worker1);
    controller.addWorker(worker2);
    
    // Mock worker fetch methods
    worker1.fetch.mockImplementation(async (task: Task<string>) => {
      return {
        taskId: task.id,
        success: true,
        data: task.payload.length,
        timestamp: new Date()
      };
    });
    
    worker1.fetchBatch.mockImplementation(async (tasks: Task<string>[]) => {
      return tasks.map(task => ({
        taskId: task.id,
        success: true,
        data: task.payload.length,
        timestamp: new Date()
      }));
    });
    
    worker2.fetch.mockImplementation(async (task: Task<string>) => {
      return {
        taskId: task.id,
        success: true,
        data: task.payload.length * 2,
        timestamp: new Date()
      };
    });
    
    worker2.fetchBatch.mockImplementation(async (tasks: Task<string>[]) => {
      return tasks.map(task => ({
        taskId: task.id,
        success: true,
        data: task.payload.length * 2,
        timestamp: new Date()
      }));
    });
  });
  
  it('should distribute tasks among workers', async () => {
    // Create tasks
    const tasks: Task<string>[] = [
      { id: '1', payload: 'a' },
      { id: '2', payload: 'bb' },
      { id: '3', payload: 'ccc' },
      { id: '4', payload: 'dddd' },
      { id: '5', payload: 'eeeee' }
    ];
    
    // Execute tasks
    const results = await controller.execute(tasks);
    
    // Check results
    expect(results.length).toBe(5);
    
    // Check that both workers were used
    expect(worker1.fetchBatch).toHaveBeenCalled();
    expect(worker2.fetchBatch).toHaveBeenCalled();
    
    // Check that tasks were distributed correctly
    const worker1Tasks = worker1.fetchBatch.mock.calls[0][0];
    const worker2Tasks = worker2.fetchBatch.mock.calls[0][0];
    
    // Worker 1 should have tasks 1, 3, 5
    expect(worker1Tasks.length).toBe(3);
    expect(worker1Tasks[0].id).toBe('1');
    expect(worker1Tasks[1].id).toBe('3');
    expect(worker1Tasks[2].id).toBe('5');
    
    // Worker 2 should have tasks 2, 4
    expect(worker2Tasks.length).toBe(2);
    expect(worker2Tasks[0].id).toBe('2');
    expect(worker2Tasks[1].id).toBe('4');
    
    // Check controller status
    const status = controller.getStatus();
    expect(status.completedTasks).toBe(5);
    expect(status.failedTasks).toBe(0);
    expect(status.pendingTasks).toBe(0);
    expect(status.activeWorkers).toBe(0);
    expect(status.isExecuting).toBe(false);
  });
  
  it('should handle worker failures', async () => {
    // Mock worker1 to fail
    worker1.fetchBatch.mockImplementation(async (tasks: Task<string>[]) => {
      return tasks.map(task => ({
        taskId: task.id,
        success: false,
        error: new Error('Worker failed'),
        timestamp: new Date()
      }));
    });
    
    // Create tasks
    const tasks: Task<string>[] = [
      { id: '1', payload: 'a' },
      { id: '2', payload: 'bb' },
      { id: '3', payload: 'ccc' },
      { id: '4', payload: 'dddd' }
    ];
    
    // Execute tasks
    const results = await controller.execute(tasks);
    
    // Check results
    expect(results.length).toBe(4);
    
    // Check that both workers were used
    expect(worker1.fetchBatch).toHaveBeenCalled();
    expect(worker2.fetchBatch).toHaveBeenCalled();
    
    // Check that tasks were distributed correctly
    const worker1Tasks = worker1.fetchBatch.mock.calls[0][0];
    const worker2Tasks = worker2.fetchBatch.mock.calls[0][0];
    
    // Worker 1 should have tasks 1, 3
    expect(worker1Tasks.length).toBe(2);
    expect(worker1Tasks[0].id).toBe('1');
    expect(worker1Tasks[1].id).toBe('3');
    
    // Worker 2 should have tasks 2, 4
    expect(worker2Tasks.length).toBe(2);
    expect(worker2Tasks[0].id).toBe('2');
    expect(worker2Tasks[1].id).toBe('4');
    
    // Check controller status
    const status = controller.getStatus();
    expect(status.completedTasks).toBe(2); // Worker 2's tasks
    expect(status.failedTasks).toBe(2);    // Worker 1's tasks
    expect(status.pendingTasks).toBe(0);
    expect(status.activeWorkers).toBe(0);
    expect(status.isExecuting).toBe(false);
  });
  
  it('should throw an error if no workers are available', async () => {
    // Create controller with no workers
    const emptyController = new BaseController<string, number>({
      maxConcurrentWorkers: 2,
      maxTasksPerWorker: 3
    });
    
    // Create tasks
    const tasks: Task<string>[] = [
      { id: '1', payload: 'a' }
    ];
    
    // Execute tasks should throw an error
    await expect(emptyController.execute(tasks)).rejects.toThrow('No workers available');
  });
  
  it('should throw an error if already executing', async () => {
    // Create tasks
    const tasks: Task<string>[] = [
      { id: '1', payload: 'a' }
    ];
    
    // Mock execute to set isExecuting to true but never resolve
    vi.spyOn(controller as any, 'executeTaskBatches').mockImplementation(() => {
      return new Promise(() => {}); // Never resolves
    });
    
    // Start execution
    const promise = controller.execute(tasks);
    
    // Try to execute again
    await expect(controller.execute(tasks)).rejects.toThrow('Controller is already executing');
    
    // Reset mock to allow the first execution to complete
    (controller as any).executeTaskBatches.mockRestore();
    (controller as any).status.isExecuting = false;
  });
});

describe('RegistrationOfficeController', () => {
  let controller: RegistrationOfficeController;
  let worker: MockWorker<RegistrationOfficePayload, RegistrationOfficeResult>;
  
  beforeEach(() => {
    // Create controller
    controller = new RegistrationOfficeController({
      maxConcurrentWorkers: 1,
      maxTasksPerWorker: 10,
      workerLaunchDelayMs: 0 // No delay for testing
    });
    
    // Create mock worker
    worker = new MockWorker<RegistrationOfficePayload, RegistrationOfficeResult>();
    
    // Add worker to controller
    controller.addWorker(worker);
    
    // Mock worker fetch methods
    worker.fetchBatch.mockImplementation(async (tasks: Task<RegistrationOfficePayload>[]) => {
      return tasks.map(task => ({
        taskId: task.id,
        success: true,
        data: [
          {
            id: `office-${task.payload.districtId}-1`,
            name: `Office ${task.payload.districtId}-1`,
            villages: []
          },
          {
            id: `office-${task.payload.districtId}-2`,
            name: `Office ${task.payload.districtId}-2`,
            villages: []
          }
        ],
        timestamp: new Date()
      }));
    });
  });
  
  it('should fetch registration offices for multiple districts', async () => {
    // Fetch registration offices
    const offices = await controller.fetchRegistrationOffices(['1', '2', '3']);
    
    // Check results
    expect(offices.length).toBe(6); // 2 offices per district, 3 districts
    
    // Check that worker was used
    expect(worker.fetchBatch).toHaveBeenCalled();
    
    // Check that tasks were created correctly
    const tasks = worker.fetchBatch.mock.calls[0][0];
    expect(tasks.length).toBe(3);
    expect(tasks[0].payload.distId).toBe('1');
    expect(tasks[1].payload.distId).toBe('2');
    expect(tasks[2].payload.distId).toBe('3');
    
    // Check controller status
    const status = controller.getStatus();
    expect(status.completedTasks).toBe(3);
    expect(status.failedTasks).toBe(0);
    expect(status.pendingTasks).toBe(0);
    expect(status.activeWorkers).toBe(0);
    expect(status.isExecuting).toBe(false);
  });
  
  it('should handle worker failures when fetching registration offices', async () => {
    // Mock worker to fail for one district
    worker.fetchBatch.mockImplementation(async (tasks: Task<RegistrationOfficePayload>[]) => {
      return tasks.map(task => {
        if (task.payload.districtId === '2') {
          return {
            taskId: task.id,
            success: false,
            error: new Error('Failed to fetch registration offices'),
            timestamp: new Date()
          };
        }
        
        return {
          taskId: task.id,
          success: true,
          data: [
            {
              id: `office-${task.payload.districtId}-1`,
              name: `Office ${task.payload.districtId}-1`,
              villages: []
            },
            {
              id: `office-${task.payload.districtId}-2`,
              name: `Office ${task.payload.districtId}-2`,
              villages: []
            }
          ],
          timestamp: new Date()
        };
      });
    });
    
    // Fetch registration offices
    const offices = await controller.fetchRegistrationOffices(['1', '2', '3']);
    
    // Check results
    expect(offices.length).toBe(4); // 2 offices per district, 2 successful districts
    
    // Check that worker was used
    expect(worker.fetchBatch).toHaveBeenCalled();
    
    // Check controller status
    const status = controller.getStatus();
    expect(status.completedTasks).toBe(2);
    expect(status.failedTasks).toBe(1);
    expect(status.pendingTasks).toBe(0);
    expect(status.activeWorkers).toBe(0);
    expect(status.isExecuting).toBe(false);
  });
  
  it('should create a worker with the correct configuration', () => {
    // Create worker
    const workerConfig = {
      baseUrl: 'https://example.com',
      endpoint: '/custom-endpoint',
      httpClient: {} as HttpClient,
      sessionProvider: () => ({} as SessionData)
    };
    
    const worker = controller.createWorker(workerConfig);
    
    // Check that worker was created with the correct configuration
    expect(worker).toBeDefined();
    // We can't directly check the worker's config, but we can check that it's an instance of the correct class
    expect(worker.constructor.name).toBe('RegistrationOfficeFetchWorker');
  });
}); 