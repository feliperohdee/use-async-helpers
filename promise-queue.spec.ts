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
});
