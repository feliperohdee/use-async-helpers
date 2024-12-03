const promiseAll = async <T>(tasks: (() => Promise<T>)[], maxConcurrency: number): Promise<T[]> => {
	let results: T[] = new Array(tasks.length);
	let nextIndex = 0;
	let errorOccurred = false;
	let error: any;

	const runTask = async () => {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (errorOccurred) {
				break;
			}

			const currentIndex = nextIndex++;

			if (currentIndex >= tasks.length) {
				break;
			}

			try {
				results[currentIndex] = await tasks[currentIndex]();
			} catch (err) {
				errorOccurred = true;
				error = err;
				break;
			}
		}
	};

	const workers = Array(Math.min(maxConcurrency, tasks.length))
		.fill(null)
		.map(() => {
			return runTask();
		});

	await Promise.all(workers);

	if (errorOccurred) {
		throw error;
	}

	return results;
};

export default promiseAll;
