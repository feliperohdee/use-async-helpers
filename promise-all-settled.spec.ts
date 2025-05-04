import { describe, expect, it, vi } from 'vitest';

import promiseAllSettled from './promise-all-settled';
import PromiseQueue from './promise-queue';

const wait = (ms: number) => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

describe('/promise-all-settled', () => {
	it('should executes tasks concurrently', async () => {
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

		const res = await promiseAllSettled(tasks, 2);

		expect(executedTasks).toEqual([2, 1, 3]);
		expect(res).toEqual([
			{ status: 'fulfilled', value: 1 },
			{ status: 'fulfilled', value: 2 },
			{ status: 'fulfilled', value: 3 }
		]);
	});

	it('should executes tasks concurrently with queue', async () => {
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

		const res = await promiseAllSettled(tasks, new PromiseQueue({ concurrency: 2 }));

		expect(executedTasks).toEqual([2, 1, 3]);
		expect(res).toEqual([
			{ status: 'fulfilled', value: 1 },
			{ status: 'fulfilled', value: 2 },
			{ status: 'fulfilled', value: 3 }
		]);
	});

	it('should handle deadlock with queue', async () => {
		const queue = new PromiseQueue({ concurrency: 10 });
		const task1 = vi.fn(async () => {
			await queue.wait(100);
			await task2();

			return true;
		});

		const task2 = vi.fn(async () => {
			await promiseAllSettled(
				[
					async () => {
						await queue.wait(100);

						return true;
					}
				],
				queue
			);
		});

		await promiseAllSettled([task1], queue);

		expect(task1).toHaveBeenCalledOnce();
		expect(task2).toHaveBeenCalledOnce();
	}, 1000);

	it('should handles empty tasks array', async () => {
		const res = await promiseAllSettled([], 2);

		expect(res).toEqual([]);
	});

	it('should handles mix of successful and failed tasks', async () => {
		const errorMessage = 'Task failed';
		const tasks = [
			async () => 1,
			async () => {
				throw new Error(errorMessage);
			},
			async () => 3
		];

		const res = await promiseAllSettled(tasks, 2);

		expect(res).toEqual([
			{ status: 'fulfilled', value: 1 },
			{ status: 'rejected', error: new Error(errorMessage) },
			{ status: 'fulfilled', value: 3 }
		]);
	});

	it('should runs tasks concurrently respecting maxConcurrency limit', async () => {
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

		await promiseAllSettled(tasks, maxConcurrency);
		expect(maxObserved.value).toEqual(maxConcurrency);
	});

	it('should preserves result order regardless of completion time', async () => {
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

		const res = await promiseAllSettled(tasks, 2);

		expect(res).toEqual([
			{ status: 'fulfilled', value: 'slow' },
			{ status: 'fulfilled', value: 'fast' }
		]);
	});

	it('should handles large number of tasks with mixed res', async () => {
		const spy = vi.fn();
		const tasks = Array(10)
			.fill(null)
			.map((_, i) => async () => {
				await wait(Math.random() * 100);

				spy(i);

				if (i % 3 === 0) {
					throw new Error(`Error ${i}`);
				}

				return i;
			});

		const res = await promiseAllSettled(tasks, 3);

		expect(spy).toHaveBeenCalledTimes(10);
		expect(res).toHaveLength(10);

		expect(
			res.filter(r => {
				return r.status === 'fulfilled';
			})
		).toHaveLength(6);
		expect(
			res.filter(r => {
				return r.status === 'rejected';
			})
		).toHaveLength(4);

		[0, 3, 6].forEach(index => {
			expect(res[index].status).toEqual('rejected');
			expect(res[index].error).toEqual(new Error(`Error ${index}`));
		});
	});

	it('should continues processing remaining tasks after errors', async () => {
		const executedTasks: number[] = [];
		const tasks = [
			async () => {
				executedTasks.push(1);
				throw new Error('First task error');
			},
			async () => {
				executedTasks.push(2);
				return 2;
			},
			async () => {
				executedTasks.push(3);
				throw new Error('Third task error');
			}
		];

		const res = await promiseAllSettled(tasks, 2);

		expect(executedTasks).toEqual([1, 2, 3]);
		expect(res).toHaveLength(3);
		expect(res[0].status).toEqual('rejected');
		expect(res[1].status).toEqual('fulfilled');
		expect(res[2].status).toEqual('rejected');
	});
});
