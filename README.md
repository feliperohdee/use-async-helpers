# use-async-helpers

A comprehensive TypeScript utility library for managing concurrent promises, providing advanced queue management and promise orchestration capabilities.

[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/-Vitest-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Table of Contents

- [Installation](#installation)
- [Core Features](#core-features)
- [API Reference](#api-reference)
  - [Promise Queue](#promise-queue)
  - [Promise All](#promise-all)
  - [Promise All Settled](#promise-all-settled)
  - [Retry Function](#retry-function)
- [Examples](#examples)
- [Testing](#testing)
- [License](#license)

## Installation

```bash
npm install use-async-helpers
```

## Core Features

### Promise Management
- ✨ Concurrent promise execution with customizable limits
- 🔄 Queue-based promise processing
- 🎯 Result order preservation
- ⚡ Dynamic concurrency adjustment

### Error Handling
- 🛡️ Customizable retry mechanisms
- 🔍 Detailed error contexts
- 🚦 Error suppression options
- ⏱️ Operation timeouts

### Performance
- 📊 Efficient task batching
- 🎚️ Concurrency control
- ⚖️ Resource management
- 🔄 Optimal task distribution

## API Reference

### Promise Queue

A flexible queue system for managing promise execution with concurrency control.

```typescript
import { Queue } from 'use-async-helpers';

const queue = new Queue(3); // Initialize with concurrency of 3

// Methods
queue.add(...tasks);        // Add tasks to queue
queue.setConcurrency(n);    // Adjust concurrency
queue.stop();              // Stop queue processing
queue.wait(ms);            // Wait specified duration
queue.waitStop();          // Wait for queue completion
```

#### Queue Options
- `initialConcurrency`: Initial concurrent tasks limit (default: 5)

### Promise All

Execute multiple promises with concurrency control while maintaining order.

```typescript
import { promiseAll } from 'use-async-helpers';

const results = await promiseAll(tasks, maxConcurrency);
```

#### Features
- Maintains result order
- Controlled concurrency
- Fast failure on errors
- Resource optimization

### Promise All Settled

Similar to Promise All but continues execution even when tasks fail.

```typescript
import { promiseAllSettled } from 'use-async-helpers';

const results = await promiseAllSettled(tasks, maxConcurrency);
```

#### Result Types
```typescript
type SettledResult<T> = {
  status: 'fulfilled' | 'rejected';
  value?: T;
  error?: any;
};
```

### Retry Function

Advanced retry mechanism with customizable behavior.

```typescript
import { retryFn } from 'use-async-helpers';

const result = await retryFn(async ({ attempts, skipRetry }) => {
  // Your async operation here
}, options);
```

#### Retry Options
```typescript
type RetryFnOptions = {
  delay?: number | (({ attempts }: { attempts: number }) => number);
  onError?: (context: RetryFnContext) => void;
  maxAttempts?: number;
  timeout?: number;
}
```

## Examples

### Queue Management

#### Rate-Limited API Requests
```typescript
import { Queue } from 'use-async-helpers';

// Create a queue for API requests with max 3 concurrent requests
const apiQueue = new Queue(3);

// API request function
const fetchUserData = async (userId: number) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

// Process a large batch of user IDs
async function processUsers(userIds: number[]) {
  // Add all requests to queue
  userIds.forEach(userId => {
    apiQueue.add(async () => {
      try {
        const userData = await fetchUserData(userId);
        console.log(`Processed user ${userId}:`, userData);
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
      }
    });
  });

  // Wait for all requests to complete
  await apiQueue.waitStop();
  
  // Adjust concurrency if needed
  apiQueue.setConcurrency(5);
  
  // Process more users with new concurrency
  moreUserIds.forEach(userId => {
    apiQueue.add(() => fetchUserData(userId));
  });
}

// Usage
await processUsers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
```

#### File Processing Queue
```typescript
import { Queue } from 'use-async-helpers';
import { promises as fs } from 'fs';

class FileProcessor {
  private queue: Queue;
  private processedFiles: Set<string>;

  constructor(maxConcurrency = 3) {
    this.queue = new Queue(maxConcurrency);
    this.processedFiles = new Set();
  }

  async processDirectory(dirPath: string) {
    const files = await fs.readdir(dirPath);
    
    files.forEach(file => {
      this.queue.add(async () => {
        if (this.processedFiles.has(file)) return;
        
        try {
          const content = await fs.readFile(`${dirPath}/${file}`, 'utf-8');
          await this.processFile(content);
          this.processedFiles.add(file);
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
        }
      });
    });

    await this.queue.waitStop();
    console.log(`Processed ${this.processedFiles.size} files`);
  }

  private async processFile(content: string) {
    // Simulate file processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return content.toUpperCase();
  }
}

// Usage
const processor = new FileProcessor(2);
await processor.processDirectory('./data');
```

### Concurrent Promise Execution

#### Parallel Data Processing
```typescript
import { promiseAll } from 'use-async-helpers';

type DataChunk = {
  id: number;
  data: string[];
}

async function processDataChunks(chunks: DataChunk[]) {
  const tasks = chunks.map(chunk => async () => {
    const results = await Promise.all(
      chunk.data.map(item => processItem(item))
    );
    return {
      chunkId: chunk.id,
      results
    };
  });

  // Process max 3 chunks concurrently
  const processedChunks = await promiseAll(tasks, 3);
  return processedChunks;
}

// Usage
const chunks = [
  { id: 1, data: ['a', 'b', 'c'] },
  { id: 2, data: ['d', 'e', 'f'] },
  { id: 3, data: ['g', 'h', 'i'] },
  { id: 4, data: ['j', 'k', 'l'] }
];

const results = await processDataChunks(chunks);
```

#### Image Processing Pipeline
```typescript
import { promiseAllSettled } from 'use-async-helpers';

type Image = {
  id: string;
  url: string;
}

class ImageProcessor {
  async processImages(images: Image[]) {
    const tasks = images.map(image => async () => {
      try {
        const downloaded = await this.downloadImage(image.url);
        const processed = await this.processImage(downloaded);
        return await this.uploadImage(processed);
      } catch (error) {
        throw new Error(`Failed to process image ${image.id}: ${error.message}`);
      }
    });

    // Process 2 images concurrently, continue on failures
    const results = await promiseAllSettled(tasks, 2);
    
    // Handle results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Successfully processed image ${images[index].id}`);
      } else {
        console.error(`Failed to process image ${images[index].id}:`, result.error);
      }
    });

    return results;
  }

  private async downloadImage(url: string): Promise<Buffer> {
    // Image download implementation
  }

  private async processImage(data: Buffer): Promise<Buffer> {
    // Image processing implementation
  }

  private async uploadImage(data: Buffer): Promise<string> {
    // Image upload implementation
  }
}
```

### Retry Mechanism

#### Resilient API Client
```typescript
import { retryFn } from 'use-async-helpers';

class ApiClient {
  constructor(private baseUrl: string) {}

  async fetchWithRetry<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return retryFn(
      async ({ attempts, skipRetry }) => {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options.headers
            }
          });

          if (!response.ok) {
            // Don't retry on certain status codes
            if (response.status === 404 || response.status === 403) {
              skipRetry(new Error(`${response.status}: ${response.statusText}`));
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          if (error.name === 'AbortError') {
            skipRetry(error); // Don't retry on manual cancellation
          }
          throw error;
        }
      },
      {
        maxAttempts: 3,
        delay: ({ attempts }) => Math.min(1000 * Math.pow(2, attempts - 1), 5000), // Exponential backoff
        timeout: 10000,
        onError: (context) => {
          console.warn(`Attempt ${context.attempts} failed, retrying...`);
        }
      }
    );
  }
}

// Usage
const client = new ApiClient('https://api.example.com');

try {
  const data = await client.fetchWithRetry('/users/123');
  console.log('User data:', data);
} catch (error) {
  console.error('Failed to fetch user data:', error);
}
```

## Testing

The library includes comprehensive test coverage:

```bash
npm test
```

Test Suites Include:
- Queue Management
- Concurrent Execution
- Error Handling
- Retry Mechanisms
- Timing and Ordering
- Resource Management
- Edge Cases

## 👨‍💻 Author

**Felipe Rohde**

- Twitter: [@felipe_rohde](https://twitter.com/felipe_rohde)
- Github: [@feliperohdee](https://github.com/feliperohdee)
- Email: feliperohdee@gmail.com
