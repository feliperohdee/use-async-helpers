import { describe, expect, it, vi } from 'vitest';
import { promiseMap, promiseFilter, promiseReduce } from './promise-operators';

const wait = (ms: number) => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

describe('/promise-operators', () => {
	describe('promiseFilter', () => {
		it('filters items respecting max concurrency', async () => {
			const executedItems: number[] = [];
			const items = [1, 2, 3, 4, 5];

			const res = await promiseFilter(
				items,
				async num => {
					await wait((items.length - num + 1) * 100);
					executedItems.push(num);
					return num % 2 === 0;
				},
				3
			);

			expect(res).toEqual([2, 4]);
			expect(executedItems).toEqual([3, 2, 1, 4, 5]);
		});

		it('handles empty items array', async () => {
			const res = await promiseFilter([], async () => true, 2);
			expect(res).toEqual([]);
		});

		it('handles errors in predicate', async () => {
			const errorMessage = 'Predicate failed';
			const items = [1, 2, 3];

			await expect(
				promiseFilter(
					items,
					async num => {
						if (num === 2) throw new Error(errorMessage);
						return true;
					},
					2
				)
			).rejects.toThrow(errorMessage);
		});

		it('runs filtering concurrently', async () => {
			const maxConcurrency = 2;
			const runningOperations = new Set();
			const maxObserved = { value: 0 };

			await promiseFilter(
				Array(5).fill(1),
				async (_, index) => {
					runningOperations.add(index);
					maxObserved.value = Math.max(maxObserved.value, runningOperations.size);
					await wait(50);
					runningOperations.delete(index);
					return true;
				},
				maxConcurrency
			);

			expect(maxObserved.value).toEqual(maxConcurrency);
		});

		it('preserves order of filtered items', async () => {
			const items = [3, 1, 4, 1, 5];
			const res = await promiseFilter(
				items,
				async num => {
					await wait(num * 50);
					return num > 3;
				},
				2
			);

			expect(res).toEqual([4, 5]);
		});
	});

	describe('promiseMap', () => {
		it('executes mapping respecting max concurrency', async () => {
			const executedItems: number[] = [];
			const items = [1, 2, 3];

			const res = await promiseMap(
				items,
				async num => {
					await wait((items.length - num + 1) * 100);
					executedItems.push(num);
					return num * 2;
				},
				2
			);

			expect(res).toEqual([2, 4, 6]);
			expect(executedItems).toEqual([2, 1, 3]);
		});

		it('handles empty items array', async () => {
			const res = await promiseMap([], async x => x * 2, 2);
			expect(res).toEqual([]);
		});

		it('handles errors in mapping function', async () => {
			const errorMessage = 'Mapping failed';
			const items = [1, 2, 3];

			await expect(
				promiseMap(
					items,
					async num => {
						if (num === 2) throw new Error(errorMessage);
						return num * 2;
					},
					2
				)
			).rejects.toThrow(errorMessage);
		});

		it('runs mapping concurrently', async () => {
			const maxConcurrency = 2;
			const runningOperations = new Set();
			const maxObserved = { value: 0 };

			await promiseMap(
				Array(5).fill(1),
				async (_, index) => {
					runningOperations.add(index);
					maxObserved.value = Math.max(maxObserved.value, runningOperations.size);
					await wait(50);
					runningOperations.delete(index);
					return index;
				},
				maxConcurrency
			);

			expect(maxObserved.value).toEqual(maxConcurrency);
		});

		it('preserves result order', async () => {
			const items = ['slow', 'fast'];
			const res = await promiseMap(
				items,
				async str => {
					await wait(str === 'slow' ? 300 : 100);
					return str.toUpperCase();
				},
				2
			);

			expect(res).toEqual(['SLOW', 'FAST']);
		});
	});

	describe('promiseReduce', () => {
		it('reduces items respecting max concurrency in mapping phase', async () => {
			const executedItems: number[] = [];
			const items = [1, 2, 3];

			const res = await promiseReduce(
				items,
				async num => {
					await wait((items.length - num + 1) * 100);
					executedItems.push(num);
					return num * 2;
				},
				(acc, val) => {
					return acc + val;
				},
				0,
				2
			);

			expect(res).toEqual(12);
			expect(executedItems).toEqual([2, 1, 3]);
		});

		it('handles empty items array', async () => {
			const res = await promiseReduce(
				[],
				async x => x * 2,
				(acc, val) => {
					return acc + val;
				},
				0,
				2
			);
			expect(res).toEqual(0);
		});

		it('handles errors in mapping function', async () => {
			const errorMessage = 'Mapping failed';
			const items = [1, 2, 3];

			await expect(
				promiseReduce(
					items,
					async num => {
						if (num === 2) throw new Error(errorMessage);
						return num * 2;
					},
					(acc, val) => {
						return acc + val;
					},
					0,
					2
				)
			).rejects.toThrow(errorMessage);
		});

		it('runs mapping phase concurrently', async () => {
			const maxConcurrency = 2;
			const runningOperations = new Set();
			const maxObserved = { value: 0 };

			await promiseReduce(
				Array(5).fill(1),
				async (_, index) => {
					runningOperations.add(index);
					maxObserved.value = Math.max(maxObserved.value, runningOperations.size);
					await wait(50);
					runningOperations.delete(index);
					return index;
				},
				(acc, val) => {
					return acc + val;
				},
				0,
				maxConcurrency
			);

			expect(maxObserved.value).toEqual(maxConcurrency);
		});

		it('maintains correct reduction order regardless of execution timing', async () => {
			const items = ['slow', 'fast'];
			const res = await promiseReduce(
				items,
				async str => {
					await wait(str === 'slow' ? 300 : 100);
					return str.toUpperCase();
				},
				(acc, val) => {
					return acc + val;
				},
				'',
				2
			);

			expect(res).toEqual('SLOWFAST');
		});

		it('handles complex reduction with async mapping', async () => {
			const spy = vi.fn();
			const items = [1, 2, 3, 4, 5];

			const res = await promiseReduce(
				items,
				async num => {
					await wait(Math.random() * 100);
					spy(num);
					return num * 2;
				},
				(acc, val) => {
					return {
						sum: acc.sum + val,
						count: acc.count + 1
					};
				},
				{ sum: 0, count: 0 },
				2
			);

			expect(spy).toHaveBeenCalledTimes(5);
			expect(res).toEqual({ sum: 30, count: 5 });
		});
	});
});
