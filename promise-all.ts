import Queue from './promise-queue';

const promiseAll = async <T>(tasks: (() => Promise<T>)[], maxConcurrencyOrQueue: number | Queue = Infinity): Promise<T[]> => {
	const queue = maxConcurrencyOrQueue instanceof Queue ? maxConcurrencyOrQueue : new Queue(maxConcurrencyOrQueue as number);

	let errorOccurred = false;
	let error: any;
	let results: T[] = new Array(tasks.length);

	for (let i = 0; i < tasks.length; i++) {
		const currentIndex = i;

		queue.add(async () => {
			if (errorOccurred) {
				return;
			}

			try {
				results[currentIndex] = await tasks[currentIndex]();
			} catch (err) {
				errorOccurred = true;
				error = err;
			}
		});
	}

	await queue.waitStop();

	if (errorOccurred) {
		throw error;
	}

	return results;
};

export default promiseAll;
