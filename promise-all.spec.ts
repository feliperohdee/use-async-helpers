import { describe, expect, it, vi } from 'vitest';

import promiseAll from './promise-all';
import PromiseQueue from './promise-queue';

const wait = (ms: number) => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

describe('/promise-all', () => {
	it('should executes tasks respecting max concurrency', async () => {
		const executedTasks: number[] = [];
		const tasks = [
			async () => {
				await wait(300);
				executedTasks.push(1);
				return 1;
			},
			async () => {
				await wait(100);
				executedTasks.push(2);
				return 2;
			},
			async () => {
				await wait(200);
				executedTasks.push(3);
				return 3;
			}
		];

		const res = await promiseAll(tasks, 2);

		expect(res).toEqual([1, 2, 3]);
		expect(executedTasks).toEqual([2, 1, 3]);
	});

	it('should handles empty tasks array', async () => {
		const res = await promiseAll([], 2);

		expect(res).toEqual([]);
	});

	it('should handles errors in tasks', async () => {
		const errorMessage = 'Task failed';
		const tasks = [
			async () => 1,
			async () => {
				throw new Error(errorMessage);
			},
			async () => 3
		];

		await expect(promiseAll(tasks, 2)).rejects.toThrow(errorMessage);
	});

	it('should runs tasks concurrently', async () => {
		const maxConcurrency = 2;
		const runningTasks = new Set();
		const maxObserved = { value: 0 };
		const tasks = Array(5)
			.fill(null)
			.map((_, index) => async () => {
				runningTasks.add(index);
				maxObserved.value = Math.max(maxObserved.value, runningTasks.size);
				await wait(50);
				runningTasks.delete(index);
				return index;
			});

		await promiseAll(tasks, maxConcurrency);
		expect(maxObserved.value).toEqual(maxConcurrency);
	});

	it('should runs tasks concurrently with queue', async () => {
		const maxConcurrency = 2;
		const runningTasks = new Set();
		const maxObserved = { value: 0 };
		const tasks = Array(5)
			.fill(null)
			.map((_, index) => async () => {
				runningTasks.add(index);
				maxObserved.value = Math.max(maxObserved.value, runningTasks.size);
				await wait(50);
				runningTasks.delete(index);
				return index;
			});

		await promiseAll(tasks, new PromiseQueue(maxConcurrency));
		expect(maxObserved.value).toEqual(maxConcurrency);
	});

	it('should handle deadlock with queue', async () => {
		const queue = new PromiseQueue(1);
		const task1 = vi.fn(async () => {
			await queue.wait(100);
			await task2();

			return true;
		});

		const task2 = vi.fn(async () => {
			await promiseAll(
				[
					async () => {
						await queue.wait(100);

						return true;
					}
				],
				queue
			);
		});

		await promiseAll([task1], queue);

		expect(task1).toHaveBeenCalledOnce();
		expect(task2).toHaveBeenCalledOnce();
	});

	it('should preserves task res order', async () => {
		const tasks = [
			async () => {
				await wait(300);
				return 'slow';
			},
			async () => {
				await wait(100);
				return 'fast';
			}
		];

		const res = await promiseAll(tasks, 2);

		expect(res).toEqual(['slow', 'fast']);
	});

	it('should handles large number of tasks', async () => {
		const spy = vi.fn();
		const tasks = Array(10)
			.fill(null)
			.map((_, i) => async () => {
				await wait(Math.random() * 100);
				spy(i);
				return i;
			});

		const res = await promiseAll(tasks, 3);

		expect(spy).toHaveBeenCalledTimes(10);
		expect(res).toHaveLength(10);
	});
});
