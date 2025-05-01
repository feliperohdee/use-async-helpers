import promiseAll from './promise-all';
import Queue from './promise-queue';

const promiseFilter = async <T>(
	promises: Promise<T>[] | T[],
	predicate: (item: Awaited<T>, index: number) => Promise<boolean> | boolean,
	maxConcurrencyOrQueue: number | Queue = Infinity
): Promise<T[]> => {
	const promisesArray = promises.map(item => {
		return item instanceof Promise ? item : Promise.resolve(item);
	});

	const results = await promiseMap(
		promisesArray,
		async (resolvedPromise, index) => ({
			item: resolvedPromise,
			keep: await predicate(resolvedPromise, index)
		}),
		maxConcurrencyOrQueue
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
	mapper: (value: Awaited<T>, index: number) => Promise<R> | R,
	maxConcurrencyOrQueue: number | Queue = Infinity
): Promise<R[]> => {
	const promisesArray = promises.map(value => {
		return value instanceof Promise ? value : Promise.resolve(value);
	});

	if (promisesArray.length === 0) {
		return [];
	}

	const tasks = promisesArray.map((promise, index) => {
		return async () => {
			const resolvedPromise = await promise;

			return mapper(resolvedPromise, index);
		};
	});

	return promiseAll(tasks, maxConcurrencyOrQueue);
};

const promiseReduce = async <T, R>(
	promises: Promise<T>[] | T[],
	reducer: (reduction: R, value: Awaited<T>, index: number) => Promise<R> | R,
	initialValue: R,
	maxConcurrencyOrQueue: number | Queue = Infinity
): Promise<R> => {
	const promisesArray = promises.map(item => {
		return item instanceof Promise ? item : Promise.resolve(item);
	});

	if (promisesArray.length === 0) {
		return initialValue;
	}

	const tasks = promisesArray.map(promise => {
		return () => {
			return promise;
		};
	});

	let resolvedValues = await promiseAll(tasks, maxConcurrencyOrQueue);
	let accumulator = initialValue;

	for (let i = 0; i < resolvedValues.length; i++) {
		accumulator = await reducer(accumulator, resolvedValues[i] as Awaited<T>, i);
	}

	return accumulator;
};

export { promiseFilter, promiseMap, promiseReduce };
