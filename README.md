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
  - [Queue Management](#queue-management)
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

#### Type Definition

```typescript
class Queue {
	constructor(initialConcurrency?: number);
	add(...tasks: (() => Promise<any>)[]): void;
	setConcurrency(n: number): void;
	stop(): void;
	wait(ms: number): Promise<void>;
	waitStop(): Promise<void>;
}
```

#### Queue Options

```typescript
type QueueOptions = {
	initialConcurrency?: number; // Default: 5
};
```

#### Basic Usage Example

```typescript
import { Queue } from 'use-async-helpers';

const queue = new Queue(3); // Initialize with concurrency of 3
await queue.add(() => fetchData());
queue.setConcurrency(5);
await queue.waitStop();
```

### Promise All

#### Type Definition

```typescript
function promiseAll<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]>;
```

#### Features

- Maintains result order
- Controlled concurrency
- Fast failure on errors
- Resource optimization

#### Basic Usage Example

```typescript
import { promiseAll } from 'use-async-helpers';

// API Request Example
const apis = ['/api/users', '/api/posts', '/api/comments'];
const tasks = apis.map(api => async () => {
	const response = await fetch(api);
	return response.json();
});

const [users, posts, comments] = await promiseAll(tasks, 2);

// File Processing Example
const fileNames = ['data1.json', 'data2.json', 'data3.json'];
const fileTasks = fileNames.map(name => async () => {
	const content = await readFile(name, 'utf-8');
	return JSON.parse(content);
});

const results = await promiseAll(fileTasks, 2);
```

### Promise Map

#### Type Definition

```typescript
function promiseMap<T, R>(items: T[], fn: (item: T, index: number) => Promise<R>, maxConcurrency: number): Promise<R[]>;
```

#### Features

- Maintains result order
- Controlled concurrency
- Transforms items asynchronously
- Resource optimization

#### Basic Usage Example

```typescript
import { promiseMap } from 'use-async-helpers';

// User Data Transformation Example
const userIds = [1, 2, 3, 4, 5];
const users = await promiseMap(
	userIds,
	async id => {
		const response = await fetch(`/api/users/${id}`);
		return response.json();
	},
	2
);

// File Processing Example
const files = ['file1.txt', 'file2.txt', 'file3.txt'];
const contents = await promiseMap(
	files,
	async filename => {
		const content = await readFile(filename);
		return content.toUpperCase();
	},
	3
);
```

### Promise Filter

#### Type Definition

```typescript
function promiseFilter<T>(items: T[], predicate: (item: T, index: number) => Promise<boolean>, maxConcurrency: number): Promise<T[]>;
```

#### Features

- Maintains original item order
- Controlled concurrency
- Async filtering capability
- Resource optimization

#### Basic Usage Example

```typescript
import { promiseFilter } from 'use-async-helpers';

// URL Validation Example
const urls = ['url1', 'url2', 'url3', 'url4'];
const validUrls = await promiseFilter(
	urls,
	async url => {
		try {
			const response = await fetch(url);
			return response.ok;
		} catch {
			return false;
		}
	},
	2
);

// File Existence Check Example
const files = ['file1.txt', 'file2.txt', 'file3.txt'];
const existingFiles = await promiseFilter(
	files,
	async file => {
		try {
			await access(file);
			return true;
		} catch {
			return false;
		}
	},
	3
);
```

### Promise Reduce

#### Type Definition

```typescript
function promiseReduce<T, R, A>(
	items: T[],
	mapFn: (item: T, index: number) => Promise<R>,
	reducer: (accumulator: A, value: R) => A,
	initialValue: A,
	maxConcurrency: number
): Promise<A>;
```

#### Features

- Two-phase processing: async mapping followed by sync reduction
- Controlled concurrency for mapping phase
- Maintains data consistency
- Resource optimization

#### Basic Usage Example

```typescript
import { promiseReduce } from 'use-async-helpers';

// File Size Sum Example
const files = ['file1.txt', 'file2.txt', 'file3.txt'];
const totalSize = await promiseReduce(
	files,
	async file => {
		const stats = await stat(file);
		return stats.size;
	},
	(total, size) => total + size,
	0,
	2
);

// Word Count Example
const wordCount = await promiseReduce(
	files,
	async file => {
		const content = await readFile(file, 'utf-8');
		return content.split(/\s+/).length;
	},
	(total, count) => total + count,
	0,
	2
);
```

### Promise All Settled

#### Type Definition

```typescript
type SettledResult<T> = {
	status: 'fulfilled' | 'rejected';
	value?: T;
	error?: any;
};

function promiseAllSettled<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<SettledResult<T>[]>;
```

#### Basic Usage Example

```typescript
import { promiseAllSettled } from 'use-async-helpers';

// User Data Processing Example
const userIds = [1, 2, 3, 4, 5];
const tasks = userIds.map(id => async () => {
	const response = await fetch(`/api/users/${id}`);
	return response.json();
});

const results = await promiseAllSettled(tasks, 2);
results.forEach((result, index) => {
	if (result.status === 'fulfilled') {
		console.log(`User ${userIds[index]} loaded:`, result.value);
	} else {
		console.log(`Failed to load user ${userIds[index]}:`, result.error);
	}
});
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

### Queue Management

#### Rate-Limited API Requests Example

```typescript
import { Queue } from 'use-async-helpers';

// Create a queue for API requests
const apiQueue = new Queue(3);

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

#### File Processing Queue Example

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

## License

[MIT](LICENSE)
