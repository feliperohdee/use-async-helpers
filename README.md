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
  - [Promise Map](#promise-map)
  - [Promise Filter](#promise-filter)
  - [Promise Reduce](#promise-reduce)
  - [Promise All Settled](#promise-all-settled)
  - [Retry Function](#retry-function)
- [Examples](#examples)
  - [Promise Queue Management](#promise-queue-management)
  - [Concurrent Promise Execution](#concurrent-promise-execution)
  - [Advanced Promise Operations](#advanced-promise-operations)
  - [Retry Mechanism](#retry-mechanism)
- [Testing](#testing)
- [Author](#author)
- [License](#license)

## Installation

```bash
npm install use-async-helpers
```

## Core Features

### Promise Management

- ✨ Concurrent promise execution with customizable limits
- 🔄 PromiseQueue-based promise processing
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

#### Type Definition

```typescript
class PromiseQueue {
	constructor(initialConcurrency?: number);
	add(...tasks: (() => Promise<any>)[]): void;
	setConcurrency(n: number): void;
	stop(): void;
	wait(ms: number): Promise<void>;
	waitStop(): Promise<void>;
}
```

#### PromiseQueue Options

```typescript
type QueueOptions = {
	initialConcurrency?: number; // Default: 5
};
```

#### Basic Usage Example

```typescript
import { PromiseQueue } from 'use-async-helpers';

const queue = new PromiseQueue(3); // Initialize with concurrency of 3
await queue.add(() => fetchData());
queue.setConcurrency(5);
await queue.waitStop();
```

### Promise All

#### Type Definition

```typescript
function promiseAll<T>(tasks: (() => Promise<T>)[], maxConcurrencyOrQueue: number | PromiseQueue = Infinity): Promise<T[]>;
```

#### Features

- Maintains result order
- Controlled concurrency with number or PromiseQueue
- Fast failure on errors
- Resource optimization
- Shared queue capability across multiple calls

#### Basic Usage Example

```typescript
import { promiseAll, PromiseQueue } from 'use-async-helpers';

// With concurrency limit
const apis = ['/api/users', '/api/posts', '/api/comments'];
const tasks = apis.map(api => async () => {
	const response = await fetch(api);
	return response.json();
});

const [users, posts, comments] = await promiseAll(tasks, 2);

// With concurrency queue
const queue = new PromiseQueue(3);
const fileNames = ['data1.json', 'data2.json', 'data3.json'];
const fileTasks = fileNames.map(name => async () => {
	const content = await readFile(name, 'utf-8');
	return JSON.parse(content);
});

const results = await promiseAll(fileTasks, queue);

// Reuse the same queue for another operation
const otherTasks = [
	/* ... */
];
const otherResults = await promiseAll(otherTasks, queue);
```

### Promise Map

#### Type Definition

```typescript
function promiseMap<T, R>(
	promises: Promise<T>[] | T[],
	mapper: (item: Awaited<T>, index: number) => Promise<R> | R,
	maxConcurrencyOrQueue: number | PromiseQueue = Infinity
): Promise<R[]>;
```

#### Features

- Accepts both promises and raw values
- Maintains result order
- Controlled concurrency with number or PromiseQueue
- Transforms items asynchronously with index parameter
- Resource optimization
- Shared queue capability across multiple operations

#### Basic Usage Example

```typescript
import { promiseMap, PromiseQueue } from 'use-async-helpers';

// User Data Transformation with concurrency limit
const userPromises = [Promise.resolve({ id: 1, name: 'John' }), Promise.resolve({ id: 2, name: 'Jane' })];

const transformedUsers = await promiseMap(
	userPromises,
	async (user, index) => {
		const response = await fetch(`/api/users/${user.id}/details`);
		return response.json();
	},
	2
);

// Processing with concurrency queue
const queue = new PromiseQueue(3);
const values = [1, 2, 3, 4, 5];
const doubled = await promiseMap(
	values,
	async (num, index) => {
		await delay(100); // Simulate async operation
		return num * 2;
	},
	queue
);
```

### Promise Filter

#### Type Definition

```typescript
function promiseFilter<T>(
	promises: Promise<T>[] | T[],
	predicate: (item: Awaited<T>, index: number) => Promise<boolean> | boolean,
	maxConcurrencyOrQueue: number | PromiseQueue = Infinity
): Promise<T[]>;
```

#### Features

- Accepts both promises and raw values
- Maintains original item order
- Controlled concurrency with number or PromiseQueue
- Async filtering capability with index parameter
- Resource optimization
- Shared queue capability across multiple operations

#### Basic Usage Example

```typescript
import { promiseFilter, PromiseQueue } from 'use-async-helpers';

// Filtering Promise Results with concurrency limit
const userPromises = [Promise.resolve({ id: 1, active: true }), Promise.resolve({ id: 2, active: false })];

const activeUsers = await promiseFilter(
	userPromises,
	async (user, index) => {
		return user.active;
	},
	2
);

// Filtering with concurrency queue
const queue = new PromiseQueue(2);
const numbers = [1, 2, 3, 4, 5];
const evenNumbers = await promiseFilter(
	numbers,
	async (num, index) => {
		await delay(100); // Simulate async check
		return num % 2 === 0;
	},
	queue
);
```

### Promise Reduce

#### Type Definition

```typescript
function promiseReduce<T, R>(
	promises: Promise<T>[] | T[],
	reducer: (accumulator: R, value: Awaited<T>, index: number) => Promise<R> | R,
	initialValue: R,
	maxConcurrencyOrQueue: number | PromiseQueue = Infinity
): Promise<R>;
```

#### Features

- Accepts both promises and raw values
- Concurrent resolution of promises
- Synchronous reduction after resolution
- Maintains data consistency
- Resource optimization with number or PromiseQueue
- Shared queue capability across multiple operations

#### Basic Usage Example

```typescript
import { promiseReduce } from 'use-async-helpers';

// Sum of Async Values
const numberPromises = [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)];

const sum = await promiseReduce(numberPromises, (acc, num) => acc + num, 0, 2);

// Object Accumulation
const dataPromises = [Promise.resolve({ count: 1 }), Promise.resolve({ count: 2 })];

const total = await promiseReduce(
	dataPromises,
	(acc, data) => ({
		total: acc.total + data.count
	}),
	{ total: 0 },
	2
);
```

### Promise All Settled

#### Type Definition

```typescript
function promiseAllSettled<T>(tasks: (() => Promise<T>)[], maxConcurrencyOrQueue: number | PromiseQueue = Infinity): Promise<SettledResult<T>[]>;

type SettledResult<T> = {
	status: 'fulfilled' | 'rejected';
	value?: T;
	error?: any;
};
```

#### Features

- Maintains result order
- Controlled concurrency with number or PromiseQueue
- Continues execution even with errors
- Detailed result status
- Shared queue capability across multiple calls

#### Basic Usage Example

```typescript
import { promiseAllSettled, PromiseQueue } from 'use-async-helpers';

// With concurrency limit
const urls = ['/api/data1', '/api/broken-endpoint', '/api/data3'];
const tasks = urls.map(url => async () => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch ${url}`);
	return response.json();
});

const results = await promiseAllSettled(tasks, 2);
const successfulData = results.filter(result => result.status === 'fulfilled').map(result => result.value);

// With concurrency queue
const queue = new PromiseQueue(3);
const fileProcessingTasks = [
	/* ... */
];
const fileResults = await promiseAllSettled(fileProcessingTasks, queue);
```

### Retry Function

#### Type Definition

```typescript
type RetryFnOptions = {
	delay?: number | (({ attempts }: { attempts: number }) => number);
	onError?: (context: RetryFnContext) => void;
	maxAttempts?: number;
	timeout?: number;
};

function retryFn<T>(
	fn: (context: { attempts: number; skipRetry: (error: Error) => void }) => Promise<T>,
	options?: RetryFnOptions
): Promise<T>;
```

#### Basic Usage Example

```typescript
import { retryFn } from 'use-async-helpers';

const result = await retryFn(
	async ({ attempts, skipRetry }) => {
		// Your async operation here
		const response = await fetch('https://api.example.com/data');
		if (!response.ok) {
			throw new Error('Request failed');
		}
		return response.json();
	},
	{
		delay: ({ attempts }) => Math.min(1000 * Math.pow(2, attempts - 1), 5000),
		maxAttempts: 3,
		timeout: 10000
	}
);
```

## Complex Examples

### Promise Queue Management

#### Rate-Limited API Requests Example

```typescript
import { PromiseQueue } from 'use-async-helpers';

// Create a queue for API requests
const apiQueue = new PromiseQueue(3);

// API request function
const fetchUserData = async (userId: number) => {
	const response = await fetch(`/api/users/${userId}`);
	return response.json();
};

// Process a large batch of user IDs
async function processUsers(userIds: number[]) {
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

	await apiQueue.waitStop();
	apiQueue.setConcurrency(5);
}

await processUsers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
```

#### File Processing PromiseQueue Example

```typescript
import { PromiseQueue } from 'use-async-helpers';
import { promises as fs } from 'fs';

class FileProcessor {
	private queue: PromiseQueue;
	private processedFiles: Set<string>;

	constructor(maxConcurrency = 3) {
		this.queue = new PromiseQueue(maxConcurrency);
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
		await new Promise(resolve => setTimeout(resolve, 1000));
		return content.toUpperCase();
	}
}

const processor = new FileProcessor(2);
await processor.processDirectory('./data');
```

### Advanced Data Processing Pipeline Example

```typescript
import { promiseMap, promiseFilter, promiseReduce } from 'use-async-helpers';

type DataRecord = {
	id: number;
	value: string;
	timestamp: Date;
};

class DataProcessor {
	async processDataset(records: DataRecord[]) {
		// Filter records from last 24 hours
		const recentRecords = await promiseFilter(
			records,
			async record => {
				const age = Date.now() - record.timestamp.getTime();
				return age <= 24 * 60 * 60 * 1000;
			},
			5
		);

		// Transform records with external API enrichment
		const enrichedRecords = await promiseMap(
			recentRecords,
			async record => {
				const enrichment = await this.fetchEnrichment(record.id);
				return {
					...record,
					enrichment
				};
			},
			3
		);

		// Calculate statistics
		const stats = await promiseReduce(
			enrichedRecords,
			async record => ({
				value: await this.normalizeValue(record.value),
				weight: record.enrichment.confidence
			}),
			(acc, item) => ({
				weightedSum: acc.weightedSum + item.value * item.weight,
				totalWeight: acc.totalWeight + item.weight
			}),
			{ weightedSum: 0, totalWeight: 0 },
			5
		);

		return stats.weightedSum / stats.totalWeight;
	}

	private async fetchEnrichment(id: number) {
		// External API call implementation
	}

	private async normalizeValue(value: string) {
		// Value normalization implementation
	}
}
```

### Resilient API Client Example

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
						if (response.status === 404 || response.status === 403) {
							skipRetry(new Error(`${response.status}: ${response.statusText}`));
						}
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					return await response.json();
				} catch (error) {
					if (error.name === 'AbortError') {
						skipRetry(error);
					}
					throw error;
				}
			},
			{
				maxAttempts: 3,
				delay: ({ attempts }) => Math.min(1000 * Math.pow(2, attempts - 1), 5000),
				timeout: 10000,
				onError: context => {
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

- PromiseQueue Management
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

## License

[MIT](LICENSE)
