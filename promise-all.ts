import PromiseQueue from './promise-queue';

const promiseAll = async <T>(tasks: (() => Promise<T>)[], maxConcurrencyOrQueue: number | PromiseQueue = Infinity): Promise<T[]> => {
	const queue =
		maxConcurrencyOrQueue instanceof PromiseQueue
			? (() => {
					const queue = maxConcurrencyOrQueue;

					if (!queue.started) {
						return queue;
					}

					return new PromiseQueue({ parent: queue });
				})()
			: new PromiseQueue({
					concurrency: maxConcurrencyOrQueue as number
				});

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
