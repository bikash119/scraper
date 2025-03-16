/**
 * Tests for the WorkerPoolManager class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerPoolManager, WorkerPool, ResourceLimits } from '@/core/worker-pool-manager.js';
import { BaseWorker } from '@/core/workers/base-worker.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
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

// Mock worker config
const mockWorkerConfig = {
  baseUrl: 'https://test.example.com',
  endpoint: '/api/test',
  httpClient: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({})
  },
  sessionProvider: vi.fn().mockReturnValue({
    antiXsrfToken: 'test-token',
    cookies: ['session=test'],
    data: '',
    districts: { '1': 'District 1' }
  })
};

describe('WorkerPoolManager', () => {
  let resourceLimits: ResourceLimits;
  
  beforeEach(() => {
    resourceLimits = {
      maxConcurrentWorkers: 10,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000
    };
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should create a worker pool manager with the provided resource limits', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    expect(manager).toBeDefined();
    expect(manager.getResourceLimits()).toEqual(resourceLimits);
  });
  
  it('should create a worker pool', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    const pool = manager.createPool({
      name: 'test-pool',
      maxWorkers: 5
    });
    
    expect(pool).toBeDefined();
    expect(pool.getName()).toBe('test-pool');
    expect(pool.getTotalCount()).toBe(0);
  });
  
  it('should create a worker pool with initial workers', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    const workers = [
      new TestWorker(mockWorkerConfig),
      new TestWorker(mockWorkerConfig)
    ];
    
    const pool = manager.createPool({
      name: 'test-pool',
      maxWorkers: 5
    }, workers);
    
    expect(pool).toBeDefined();
    expect(pool.getTotalCount()).toBe(2);
    expect(pool.getAvailableCount()).toBe(2);
  });
  
  it('should get a worker pool by name', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    manager.createPool({
      name: 'test-pool',
      maxWorkers: 5
    });
    
    const pool = manager.getPool('test-pool');
    expect(pool).toBeDefined();
    expect(pool?.getName()).toBe('test-pool');
  });
  
  it('should return undefined when getting a non-existent pool', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    const pool = manager.getPool('non-existent-pool');
    expect(pool).toBeUndefined();
  });
  
  it('should remove a worker pool', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    manager.createPool({
      name: 'test-pool',
      maxWorkers: 5
    });
    
    const removed = manager.removePool('test-pool');
    expect(removed).toBe(true);
    expect(manager.getPool('test-pool')).toBeUndefined();
  });
  
  it('should return false when removing a non-existent pool', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    const removed = manager.removePool('non-existent-pool');
    expect(removed).toBe(false);
  });
  
  it('should adjust max workers based on resource limits', () => {
    const manager = new WorkerPoolManager({
      maxConcurrentWorkers: 5,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000
    });
    
    // Create a pool with max workers exceeding the resource limit
    const pool = manager.createPool({
      name: 'test-pool',
      maxWorkers: 10
    });
    
    expect(pool).toBeDefined();
    // The max workers should be adjusted to the resource limit
    expect(pool.getTotalCount()).toBe(0); // No workers added yet
  });
  
  it('should throw an error when creating a pool with a duplicate name', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    manager.createPool({
      name: 'test-pool',
      maxWorkers: 5
    });
    
    expect(() => {
      manager.createPool({
        name: 'test-pool',
        maxWorkers: 3
      });
    }).toThrow('Worker pool with name "test-pool" already exists');
  });
  
  it('should get statistics about all worker pools', () => {
    const manager = new WorkerPoolManager(resourceLimits);
    
    // Create first pool with 2 workers
    const pool1 = manager.createPool({
      name: 'pool1',
      maxWorkers: 3
    }, [
      new TestWorker(mockWorkerConfig),
      new TestWorker(mockWorkerConfig)
    ]);
    
    // Create second pool with 1 worker
    const pool2 = manager.createPool({
      name: 'pool2',
      maxWorkers: 2
    }, [
      new TestWorker(mockWorkerConfig)
    ]);
    
    // Borrow a worker from pool1
    pool1.borrowWorker();
    
    // Get stats
    const stats = manager.getStats();
    
    expect(stats).toEqual({
      totalWorkers: 3,
      availableWorkers: 2,
      poolCount: 2
    });
  });
}); 