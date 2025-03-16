# Scraper Library

A powerful and flexible web scraping library with resource management and concurrency control.

## Features

- **Resource Management**: Control the number of concurrent workers and request rates
- **Worker Pool Management**: Efficiently manage and reuse workers
- **Controller-based Architecture**: Organize scraping logic into controllers
- **Type Safety**: Built with TypeScript for better developer experience
- **Extensible**: Easy to extend with custom workers and controllers

## Architecture

The library is built around the following core components:

### ScrapingSession

The entry point to the scraper. It manages the entire scraping process, including:

1. Adhering to resource limits
2. Initializing the worker pool manager
3. Creating and managing controllers
4. Creating worker pools for controllers

### WorkerPoolManager

Manages worker pools and ensures resource limits are respected across all pools.

### WorkerPool

Manages a set of workers of the same type, allowing controllers to borrow and return workers as needed.

### Controllers

Controllers are responsible for creating workers, adding them to worker pools, and executing tasks. The library includes:

- `BaseController`: A generic controller implementation that can be extended for specific use cases
- Specialized controllers for specific scraping tasks (e.g., `DistrictController`, `RegistrationOfficeController`)

Each controller is responsible for:
1. Creating its own workers during initialization
2. Adding workers to its assigned worker pool
3. Borrowing workers from the pool to execute tasks
4. Returning workers to the pool after task execution

### Workers

Workers are responsible for executing individual tasks. The library includes:

- `BaseWorker`: A generic worker implementation that can be extended for specific use cases
- Specialized workers for specific scraping tasks (e.g., `DistrictFetchWorker`, `RegistrationOfficeFetchWorker`)

## Usage Example

```typescript
import { 
  ScrapingSession, 
  ScrapingSessionConfig
} from 'scraper';

// Create scraping session config
const config: ScrapingSessionConfig = {
  resourceLimits: {
    maxConcurrentWorkers: 10,
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000
  },
  baseUrl: 'https://api.example.com',
  httpClient: myHttpClient,
  sessionProvider: mySessionProvider
};

// Create and initialize the scraping session
// This will create controllers and workers
const session = new ScrapingSession(config);
await session.initialize();

// Get a controller and execute tasks
const myController = session.getController('district');
const tasks = [
  { id: '1', payload: { stateId: '1' } },
  { id: '2', payload: { stateId: '2' } }
];
const results = await myController.execute(tasks);

// Stop the session when done
await session.stop();
```

## Creating Custom Controllers and Workers

### Custom Worker

```typescript
import { BaseWorker } from 'scraper';

// Define payload and result types
interface MyPayload {
  id: string;
}

interface MyResult {
  value: string;
}

// Create a custom worker
class MyWorker extends BaseWorker<MyPayload, MyResult> {
  protected async executeTask(payload: MyPayload): Promise<MyResult> {
    // Implement task execution logic
    return { value: `Result for ${payload.id}` };
  }
}
```

### Custom Controller

```typescript
import { BaseController, ControllerConfigWithPool, WorkerConfig, Worker } from 'scraper';
import { MyWorker } from './my-worker';

// Create a custom controller
class MyController extends BaseController<MyPayload, MyResult> {
  constructor(config: ControllerConfigWithPool) {
    super(config);
  }
  
  // Initialize workers during controller creation
  protected override initializeWorkers(): void {
    if (!this.workerPool) return;
    
    // Create and add workers to the pool
    const numWorkers = Math.min(3, this.config.maxConcurrentWorkers || 5);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = this.createWorker(this.createWorkerConfig('/my-endpoint'));
      this.addWorker(worker);
    }
  }
  
  // Create workers of the appropriate type
  protected override createWorker(workerConfig: WorkerConfig): Worker<MyPayload, MyResult> {
    return new MyWorker(workerConfig);
  }
}
```

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## License

MIT 