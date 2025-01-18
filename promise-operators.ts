import promiseAll from './promise-all';

const promiseFilter = async <T>(
	promises: Promise<T>[] | T[],
	predicate: (item: Awaited<T>, index: number) => Promise<boolean> | boolean,
	maxConcurrency: number
): Promise<T[]> => {
	const promiseArray = promises.map(item => {
		return item instanceof Promise ? item : Promise.resolve(item);
	});

	const results = await promiseMap(
		promiseArray,
		async (resolvedItem, index) => ({
			item: resolvedItem,
			keep: await predicate(resolvedItem, index)
		}),
		maxConcurrency
	);

	return results
		.filter(result => {
			return result.keep;
		})
		.map(result => {
			return result.item;
		});
};

const promiseMap = async <T, R>(
	promises: Promise<T>[] | T[],
	mapper: (item: Awaited<T>, index: number) => Promise<R> | R,
	maxConcurrency: number
): Promise<R[]> => {
	const promiseArray = promises.map(item => {
		return item instanceof Promise ? item : Promise.resolve(item);
	});

	const tasks = promiseArray.map((promise, index) => {
		return async () => {
			const resolvedItem = await promise;

			return mapper(resolvedItem, index);
		};
	});

	return promiseAll(tasks, maxConcurrency);
};

const promiseReduce = async <T, R>(
	promises: Promise<T>[] | T[],
	reducer: (accumulator: R, value: Awaited<T>) => R,
	initialValue: R,
	maxConcurrency: number
): Promise<R> => {
	const mappedValues = await promiseMap(
		promises,
		res => {
			return res;
		},
		maxConcurrency
	);

	return mappedValues.reduce(reducer, initialValue);
};

export { promiseFilter, promiseMap, promiseReduce };
