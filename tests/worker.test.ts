/**
 * Tests for the worker type system and implementations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  Task, 
  TaskResult, 
  RegistrationOfficePayload, 
  RegistrationOfficeResult,
  SessionData,
  HttpClient,
  WorkerConfig
} from '../src/types/worker.js';
import { BaseWorker } from '../src/workers/base-worker.js';
import { RegistrationOfficeFetchWorker } from '../src/workers/registration-office-fetch-worker.js';
import { RegistrationOffice } from '../src/types/state.js';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock HTTP client
class MockHttpClient implements HttpClient {
  get = vi.fn();
  post = vi.fn();
}

// Mock session data
const mockSessionData: SessionData = {
  antiXsrfToken: 'mock-token',
  cookies: ['cookie1=value1', 'cookie2=value2'],
  data: 'mock-data',
  districts: { '1': 'District 1', '2': 'District 2' }
};

// Mock session provider
const mockSessionProvider = vi.fn(() => mockSessionData);

describe('Worker Type System', () => {
  it('should define Task interface correctly', () => {
    const task: Task<string> = {
      id: '123',
      payload: 'test-payload'
    };
    
    expect(task.id).toBe('123');
    expect(task.payload).toBe('test-payload');
  });
  
  it('should define TaskResult interface correctly', () => {
    const result: TaskResult<number> = {
      taskId: '123',
      success: true,
      data: 42,
      timestamp: new Date()
    };
    
    expect(result.taskId).toBe('123');
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
    expect(result.timestamp).toBeInstanceOf(Date);
  });
  
  it('should define RegistrationOfficePayload type correctly', () => {
    const payload: RegistrationOfficePayload = {
      districtId: '123'
    };
    
    expect(payload.districtId).toBe('123');
  });
  
  it('should define RegistrationOfficeResult type correctly', () => {
    const result: RegistrationOfficeResult = [
      {
        id: '1',
        name: 'Office 1',
        villages: []
      }
    ];
    
    expect(result[0].id).toBe('1');
    expect(result[0].name).toBe('Office 1');
    expect(result[0].villages).toEqual([]);
  });
});

describe('BaseWorker', () => {
  class TestWorker extends BaseWorker<string, number> {
    protected async executeTask(payload: string): Promise<number> {
      return payload.length;
    }
  }
  
  let httpClient: MockHttpClient;
  let worker: TestWorker;
  
  beforeEach(() => {
    httpClient = new MockHttpClient();
    worker = new TestWorker({
      baseUrl: 'https://example.com',
      endpoint: '/test',
      httpClient,
      sessionProvider: mockSessionProvider
    });
  });
  
  it('should execute a task successfully', async () => {
    const task: Task<string> = {
      id: '123',
      payload: 'test-payload'
    };
    
    const result = await worker.fetch(task);
    
    expect(result.taskId).toBe('123');
    expect(result.success).toBe(true);
    expect(result.data).toBe(12); // Length of 'test-payload'
    expect(result.timestamp).toBeInstanceOf(Date);
  });
  
  it('should handle task execution errors', async () => {
    class ErrorWorker extends BaseWorker<string, number> {
      protected async executeTask(payload: string): Promise<number> {
        throw new Error('Test error');
      }
    }
    
    const errorWorker = new ErrorWorker({
      baseUrl: 'https://example.com',
      endpoint: '/test',
      httpClient,
      sessionProvider: mockSessionProvider
    });
    
    const task: Task<string> = {
      id: '123',
      payload: 'test-payload'
    };
    
    const result = await errorWorker.fetch(task);
    
    expect(result.taskId).toBe('123');
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Test error');
    expect(result.timestamp).toBeInstanceOf(Date);
  });
  
  it('should execute multiple tasks in batch', async () => {
    const tasks: Task<string>[] = [
      { id: '1', payload: 'a' },
      { id: '2', payload: 'bb' },
      { id: '3', payload: 'ccc' }
    ];
    
    const results = await worker.fetchBatch(tasks);
    
    expect(results.length).toBe(3);
    expect(results[0].taskId).toBe('1');
    expect(results[0].data).toBe(1);
    expect(results[1].taskId).toBe('2');
    expect(results[1].data).toBe(2);
    expect(results[2].taskId).toBe('3');
    expect(results[2].data).toBe(3);
  });
});

describe('RegistrationOfficeFetchWorker', () => {
  let httpClient: MockHttpClient;
  let worker: RegistrationOfficeFetchWorker;
  
  beforeEach(() => {
    httpClient = new MockHttpClient();
    worker = new RegistrationOfficeFetchWorker({
      baseUrl: 'https://igrodisha.gov.in',
      endpoint: '/GetRegoffice',
      httpClient,
      sessionProvider: mockSessionProvider
    });
    
    // Mock successful response
    httpClient.post.mockResolvedValue({
      d: [
        {
          REGOFF_ID: 1,
          REGOFF_NAME: 'Office 1',
          REGOFF_HEAD_ID: 101,
          REGOFF_INITIAL: 'OFF1',
          REGOFF_TYPE_ID: 1,
          REGOFF_ACTIVE: 1
        },
        {
          REGOFF_ID: 2,
          REGOFF_NAME: 'Office 2',
          REGOFF_HEAD_ID: 102,
          REGOFF_INITIAL: 'OFF2',
          REGOFF_TYPE_ID: 1,
          REGOFF_ACTIVE: 1
        }
      ]
    });
  });
  
  it('should fetch registration offices successfully', async () => {
    const task: Task<RegistrationOfficePayload> = {
      id: '123',
      payload: { districtId: '1' }
    };
    
    const result = await worker.fetch(task);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    
    const offices = result.data as RegistrationOfficeResult;
    expect(offices[0].id).toBe('1');
    expect(offices[0].name).toBe('Office 1');
    expect(offices[0].head_id).toBe('101');
    expect(offices[0].office_initial).toBe('OFF1');
    expect(offices[0].type_id).toBe('1');
    expect(offices[0].active).toBe(true);
    expect(offices[0].villages).toEqual([]);
    
    expect(offices[1].id).toBe('2');
    expect(offices[1].name).toBe('Office 2');
    
    // Verify HTTP client was called correctly
    expect(httpClient.post).toHaveBeenCalledWith(
      '/GetRegoffice',
      { distId: '1' },
      expect.objectContaining({
        'Content-Type': 'application/json; charset=UTF-8',
        '__AntiXsrfToken': 'mock-token',
        'Cookie': 'cookie1=value1; cookie2=value2'
      })
    );
  });
  
  it('should handle API errors', async () => {
    // Mock error response
    httpClient.post.mockRejectedValueOnce(new Error('API error'));
    
    const task: Task<RegistrationOfficePayload> = {
      id: '123',
      payload: { districtId: '1' }
    };
    
    const result = await worker.fetch(task);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Failed to fetch registration offices for district ID 1');
  });
  
  it('should handle empty response', async () => {
    // Mock empty response
    httpClient.post.mockResolvedValueOnce({ d: [] });
    
    const task: Task<RegistrationOfficePayload> = {
      id: '123',
      payload: { districtId: '1' }
    };
    
    const result = await worker.fetch(task);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });
}); 