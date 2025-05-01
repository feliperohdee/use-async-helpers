import { beforeEach, describe, expect, it, vi } from 'vitest';

import PromiseQueue from './promise-queue';

describe('/promise-queue', () => {
	let queue: PromiseQueue;

	beforeEach(() => {
		queue = new PromiseQueue();
	});

	it('should add tasks to the queue', async () => {
		const task = vi.fn(() => Promise.resolve());
		queue.add(task);

		await queue.waitStop();
		expect(task).toHaveBeenCalledTimes(1);
	});

	it('should respect concurrency limit', async () => {
		const TIME = 50;

		for await (const n of [1, 2, 3]) {
			queue.setConcurrency(n);

			const task = vi.fn(() => queue.wait(TIME));
			const startTime = Date.now();
			queue.add(task, task, task, task);
			await queue.waitStop();
			const endTime = Date.now();

			expect(task).toHaveBeenCalledTimes(4);

			if (n === 1) {
				expect(endTime - startTime).toBeGreaterThanOrEqual(TIME * 4);
			} else {
				expect(endTime - startTime).toBeGreaterThanOrEqual(TIME * 2);
			}
		}
	});

	it('should allow changing concurrency', async () => {
		const task = vi.fn(() => Promise.resolve());
		queue.setConcurrency(1);
		queue.add(task, task);
		await queue.waitStop();
		expect(task).toHaveBeenCalledTimes(2);

		queue.setConcurrency(3);
		queue.add(task, task, task);
		await queue.waitStop();
		expect(task).toHaveBeenCalledTimes(5);
	});

	it('should handle errors in tasks', async () => {
		const successTask = vi.fn(() => Promise.resolve());
		const errorTask = vi.fn(() => Promise.reject(new Error('Test error')));

		queue.add(successTask, errorTask, successTask);
		await queue.waitStop();

		expect(successTask).toHaveBeenCalledTimes(2);
		expect(errorTask).toHaveBeenCalledTimes(1);
	});

	it('should wait for specified time', async () => {
		const startTime = Date.now();
		await queue.wait(100);
		const endTime = Date.now();
		expect(endTime - startTime).toBeGreaterThanOrEqual(95); // must be at least 100ms
	});

	it('should stop running tasks', async () => {
		const task = vi.fn(() => queue.wait(100));
		queue.add(task, task, task);
		await queue.wait(50); // Wait a bit for tasks to start
		queue.stop();
		await queue.waitStop();
		expect(task).toHaveBeenCalledTimes(3);
		expect(await queue.waitStop()).toBeUndefined();
	});

	describe('dynamic execution', () => {
		let queue: PromiseQueue;
		let executionOrder: number[];

		beforeEach(() => {
			queue = new PromiseQueue(2); // Set concurrency to 2
			executionOrder = [];
		});

		it('should execute new tasks immediately when capacity is available', async () => {
			// Create long-running task
			const longTask = vi.fn(async () => {
				executionOrder.push(1);
				await queue.wait(200); // Long task
				executionOrder.push(4);
				return 'long task done';
			});

			// Create medium-running task
			const mediumTask = vi.fn(async () => {
				executionOrder.push(2);
				await queue.wait(100); // Medium task
				executionOrder.push(3);
				return 'medium task done';
			});

			// Create short tasks that will be added later
			const shortTask1 = vi.fn(async () => {
				executionOrder.push(5);
				await queue.wait(50); // Short task
				executionOrder.push(6);
				return 'short task 1 done';
			});

			const shortTask2 = vi.fn(async () => {
				executionOrder.push(7);
				await queue.wait(50); // Short task
				executionOrder.push(8);
				return 'short task 2 done';
			});

			// Start with longTask and mediumTask
			await queue.add(longTask, mediumTask);

			// Wait for mediumTask to complete but longTask should still be running
			await queue.wait(150);

			// At this point, mediumTask should be done, and we should have capacity
			// Add new tasks - they should start immediately without waiting for longTask
			await queue.add(shortTask1, shortTask2);

			// Wait for all tasks to complete
			await queue.waitStop();

			// Verify all tasks were called
			expect(longTask).toHaveBeenCalledTimes(1);
			expect(mediumTask).toHaveBeenCalledTimes(1);
			expect(shortTask1).toHaveBeenCalledTimes(1);
			expect(shortTask2).toHaveBeenCalledTimes(1);

			// Verify execution order
			// 0: longTask starts
			// 1: mediumTask starts
			// 2: mediumTask completes
			// 3: longTask completes
			// 4: shortTask1 starts (key test - should start before longTask completes)
			// 5: shortTask2 starts
			// 6: shortTask1 completes
			// 7: shortTask2 completes
			expect(executionOrder[0]).toEqual(1); // longTask starts
			expect(executionOrder[1]).toEqual(2); // mediumTask starts
			expect(executionOrder[2]).toEqual(3); // mediumTask completes

			// Critical test: shortTask1 should start before longTask completes
			expect(executionOrder[3]).toEqual(5); // shortTask1 starts

			// The rest of the order should follow
			expect(executionOrder[4]).toEqual(4); // longTask completes
			expect(executionOrder[5]).toEqual(7); // shortTask2 starts
			expect(executionOrder[6]).toEqual(6); // shortTask1 completes
			expect(executionOrder[7]).toEqual(8); // shortTask2 completes
		});

		it('should handle dynamic concurrency changes with running tasks', async () => {
			// Start with concurrency 1
			queue.setConcurrency(1);

			const results: string[] = [];

			// Create tasks that track their execution
			const createTask = (id: number, delay: number) => {
				return async () => {
					executionOrder.push(id);
					await queue.wait(delay);
					results.push(`Task ${id} completed`);
					return `Task ${id} completed`;
				};
			};

			// Add 3 tasks with varying durations
			await queue.add(createTask(1, 100), createTask(2, 100), createTask(3, 100));

			// Wait for first task to start
			await queue.wait(50);

			// Task 1 should be running, 2 and 3 waiting
			expect(executionOrder).toEqual([1]);

			// Increase concurrency during execution
			await queue.setConcurrency(3);

			// Wait a bit to allow tasks to start due to increased concurrency
			await queue.wait(20);

			// Task 2 and 3 should now have started as well
			expect(executionOrder).toContain(2);
			expect(executionOrder).toContain(3);

			// Add more tasks
			await queue.add(createTask(4, 50), createTask(5, 50));

			// Wait for all tasks to complete
			await queue.waitStop();

			// Verify all 5 tasks completed
			expect(results.length).toEqual(5);

			// Verify all tasks were executed
			expect(executionOrder).toContain(1);
			expect(executionOrder).toContain(2);
			expect(executionOrder).toContain(3);
			expect(executionOrder).toContain(4);
			expect(executionOrder).toContain(5);
		});

		it('should handle a mix of fast and slow tasks with dynamic additions', async () => {
			// Create a mix of fast and slow tasks
			const taskResults: number[] = [];

			// Slow task (500ms)
			const slowTask = async () => {
				const id = 1;
				executionOrder.push(id);
				await queue.wait(500);
				taskResults.push(id);
			};

			// Medium tasks (100ms)
			const createMediumTask = (id: number) => async () => {
				executionOrder.push(id);
				await queue.wait(100);
				taskResults.push(id);
			};

			// Fast tasks (50ms)
			const createFastTask = (id: number) => async () => {
				executionOrder.push(id);
				await queue.wait(50);
				taskResults.push(id);
			};

			// Start with slow task and one medium task
			await queue.add(slowTask, createMediumTask(2));

			// Wait for both to start
			await queue.wait(20);

			// Wait for medium task to finish but slow task still running
			await queue.wait(100);

			// Add more tasks - should start immediately as capacity becomes available
			await queue.add(createFastTask(3), createFastTask(4), createMediumTask(5));

			// Wait a bit for some tasks to start based on available capacity
			await queue.wait(20);

			// Add even more tasks while others are running
			await queue.add(createFastTask(6), createFastTask(7));

			// Wait for all tasks to complete
			await queue.waitStop();

			// Verify all tasks executed
			expect(taskResults.length).toEqual(7);
			expect(taskResults).toContain(1);
			expect(taskResults).toContain(2);
			expect(taskResults).toContain(3);
			expect(taskResults).toContain(4);
			expect(taskResults).toContain(5);
			expect(taskResults).toContain(6);
			expect(taskResults).toContain(7);

			// Fast tasks (3, 4, 6, 7) should complete before slow task (1)
			const slowTaskIndex = taskResults.indexOf(1);
			expect(taskResults.indexOf(3)).toBeLessThan(slowTaskIndex);
			expect(taskResults.indexOf(4)).toBeLessThan(slowTaskIndex);
			expect(taskResults.indexOf(6)).toBeLessThan(slowTaskIndex);
			expect(taskResults.indexOf(7)).toBeLessThan(slowTaskIndex);
		});
	});
});
