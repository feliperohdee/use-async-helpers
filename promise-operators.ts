import promiseAll from './promise-all';

const promiseFilter = async <T>(
	items: T[],
	predicate: (item: T, index: number) => Promise<boolean>,
	maxConcurrency: number
): Promise<T[]> => {
	const results = await promiseMap(
		items,
		async (item, index) => ({
			item,
			shouldKeep: await predicate(item, index)
		}),
		maxConcurrency
	);

	return results
		.filter(result => {
			return result.shouldKeep;
		})
		.map(result => {
			return result.item;
		});
};

const promiseMap = async <T, R>(items: T[], fn: (item: T, index: number) => Promise<R>, maxConcurrency: number): Promise<R[]> => {
	const tasks = items.map((item, index) => {
		return () => {
			return fn(item, index);
		};
	});

	return promiseAll(tasks, maxConcurrency);
};

const promiseReduce = async <T, R, A>(
	items: T[],
	fn: (item: T, index: number) => Promise<R>,
	reducer: (accumulator: A, value: R) => A,
	initialValue: A,
	maxConcurrency: number
): Promise<A> => {
	const mappedValues = await promiseMap(items, fn, maxConcurrency);

	return mappedValues.reduce(reducer, initialValue);
};

export { promiseFilter, promiseMap, promiseReduce };
