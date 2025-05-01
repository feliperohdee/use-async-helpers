import Queue from './promise-queue';

type SettledResult<T> = {
	status: 'fulfilled' | 'rejected';
	value?: T;
	error?: any;
};

const allSettled = async <T>(
	tasks: (() => Promise<T>)[],
	maxConcurrencyOrQueue: number | Queue = Infinity
): Promise<SettledResult<T>[]> => {
	const queue = maxConcurrencyOrQueue instanceof Queue ? maxConcurrencyOrQueue : new Queue(maxConcurrencyOrQueue as number);
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
