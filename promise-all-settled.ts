type SettledResult<T> = {
	status: 'fulfilled' | 'rejected';
	value?: T;
	error?: any;
};

const allSettled = async <T>(tasks: (() => Promise<T>)[], maxConcurrency: number = Infinity): Promise<SettledResult<T>[]> => {
	let results: SettledResult<T>[] = new Array(tasks.length);
	let nextIndex = 0;

	const runTask = async () => {
		while (true) {
			const index = nextIndex++;

			if (index >= tasks.length) {
				break;
			}

			try {
				const value = await tasks[index]();
				results[index] = { status: 'fulfilled', value };
			} catch (error) {
				results[index] = { status: 'rejected', error };
			}
		}
	};

	const workers = Array(Math.min(maxConcurrency, tasks.length))
		.fill(null)
		.map(() => {
			return runTask();
		});

	await Promise.all(workers);
	return results;
};

export default allSettled;
