import PromiseQueue from './promise-queue';

type SettledResult<T> = {
	status: 'fulfilled' | 'rejected';
	value?: T;
	error?: any;
};

const allSettled = async <T>(
	tasks: (() => Promise<T>)[],
	maxConcurrencyOrQueue: number | PromiseQueue = Infinity
): Promise<SettledResult<T>[]> => {
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

	const results: SettledResult<T>[] = new Array(tasks.length);

	for (let i = 0; i < tasks.length; i++) {
		const index = i;
		queue.add(async () => {
			try {
				const value = await tasks[index]();
				results[index] = { status: 'fulfilled', value };
			} catch (error) {
				results[index] = { status: 'rejected', error };
			}
		});
	}

	await queue.waitStop();
	return results;
};

export default allSettled;
