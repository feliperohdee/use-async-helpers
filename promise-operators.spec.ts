import { describe, expect, it, vi } from 'vitest';
import { promiseMap, promiseFilter, promiseReduce } from './promise-operators';

const wait = (ms: number) => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

describe('/promise-operators', () => {
	describe('promiseFilter', () => {
		it('should filter', async () => {
			const items = [1, 2, Promise.resolve(3), 4, 5];

			const res = await promiseFilter(
				items,
				num => {
					return num % 2 === 0;
				},
				3
			);

			expect(res).toEqual([2, 4]);
		});

		it('should filter with async predicate', async () => {
			const items = [1, 2, Promise.resolve(3), 4, 5];

			const res = await promiseFilter(
				items,
				async num => {
					await wait(100);

					return num % 2 === 0;
				},
				3
			);

			expect(res).toEqual([2, 4]);
		});

		it('should handles empty items array', async () => {
			const res = await promiseFilter(
				[],
				() => {
					return true;
				},
				2
			);

			expect(res).toEqual([]);
		});

		it('should handles errors in predicate', async () => {
			const errorMessage = 'Predicate failed';
			const items = [1, 2, 3];

			await expect(
				promiseFilter(
					items,
					num => {
						if (num === 2) {
							throw new Error(errorMessage);
						}

						return true;
					},
					2
				)
			).rejects.toThrow(errorMessage);
		});

		it('should preserves order of filtered items', async () => {
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
		it('should map', async () => {
			const executedItems: number[] = [];
			const items = [1, Promise.resolve(2), 3];

			const res = await promiseMap(
				items,
				num => {
					executedItems.push(num);

					return num * 2;
				},
				2
			);

			expect(res).toEqual([2, 4, 6]);
			expect(executedItems).toEqual([1, 2, 3]);
		});

		it('should map with async mapper', async () => {
			const executedItems: number[] = [];
			const items = [1, Promise.resolve(2), 3];

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

		it('should handles empty items array', async () => {
			const res = await promiseMap(
				[],
				x => {
					return x * 2;
				},
				2
			);

			expect(res).toEqual([]);
		});

		it('should handles errors in mapping function', async () => {
			const errorMessage = 'Mapping failed';
			const items = [1, 2, 3];

			await expect(
				promiseMap(
					items,
					async num => {
						if (num === 2) {
							throw new Error(errorMessage);
						}

						return num * 2;
					},
					2
				)
			).rejects.toThrow(errorMessage);
		});

		it('should runs mapping concurrently', async () => {
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

		it('should preserves result order', async () => {
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
		it('should reduces', async () => {
			const items = [1, Promise.resolve(2), 3];

			const res = await promiseReduce(
				items,
				(acc, val) => {
					return acc + val;
				},
				0,
				2
			);

			expect(res).toEqual(6);
		});

		it('should handles empty items array', async () => {
			const res = await promiseReduce(
				[],
				(acc, val) => {
					return acc + val;
				},
				0,
				2
			);
			expect(res).toEqual(0);
		});

		it('should handles complex reduction', async () => {
			const items = [1, 2, 3, 4, 5];

			const res = await promiseReduce(
				items,
				(acc, val) => {
					return {
						sum: acc.sum + val,
						count: acc.count + 1
					};
				},
				{ sum: 0, count: 0 },
				2
			);

			expect(res).toEqual({ sum: 15, count: 5 });
		});
	});
});
