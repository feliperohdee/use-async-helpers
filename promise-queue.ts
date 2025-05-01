class PromiseQueue {
	public concurrency: number;
	public id: string;
	private queue: (() => Promise<any>)[];
	public running: boolean;
	public runningPromises: number;
	public started: boolean;

	constructor(initialConcurrency: number = 5) {
		this.id = crypto.randomUUID();
		this.concurrency = initialConcurrency;
		this.queue = [];
		this.running = false;
		this.runningPromises = 0;
		this.started = false;
	}

	async add(...fn: (() => Promise<any>)[]): Promise<void> {
		this.queue = [...this.queue, ...fn];

		if (!this.started) {
			this.started = true;
			this.running = true;
			await this.processNext();
		} else if (this.running && this.remainingCapacity() > 0) {
			// If we have capacity and we're already running, process next tasks
			await this.processNext();
		}
	}

	private async executeTask(fn: () => Promise<any>): Promise<void> {
		try {
			await fn();
		} catch {
			// suppress errors
		}
	}

	private async launchTask(fn: () => Promise<any>): Promise<void> {
		try {
			await this.executeTask(fn);
		} catch (error) {
			// Catch any errors from executeTask (shouldn't happen as it catches internally)
		} finally {
			this.runningPromises--;

			// When a task completes, try to process more tasks if available
			if (this.queue.length > 0 && this.remainingCapacity() > 0 && this.running) {
				await this.processNext();
			} else if (this.queue.length === 0 && this.runningPromises === 0) {
				// If queue is empty and no tasks are running, we're done
				this.running = false;
				this.started = false;
			}
		}
	}

	remainingCapacity(): number {
		return this.concurrency - this.runningPromises;
	}

	private async processNext(): Promise<void> {
		// Process as many tasks as we have capacity for
		const availableCapacity = this.remainingCapacity();

		if (availableCapacity <= 0 || this.queue.length === 0) {
			return;
		}

		const batchSize = Math.min(availableCapacity, this.queue.length);
		const tasks = this.queue.splice(0, batchSize);

		this.runningPromises += tasks.length;

		// Execute each task independently
		for (const fn of tasks) {
			// Launch task execution without awaiting
			this.launchTask(fn);
		}
	}

	async setConcurrency(n: number): Promise<void> {
		this.concurrency = n;

		// If we increased concurrency and have tasks waiting, try to process more
		if (this.running && this.queue.length > 0 && this.remainingCapacity() > 0) {
			await this.processNext();
		}
	}

	stop(): void {
		this.queue = [];
		this.running = false;
		this.runningPromises = 0;
		this.started = false;
	}

	async wait(ms: number): Promise<void> {
		return new Promise(resolve => {
			return setTimeout(resolve, ms);
		});
	}

	async waitStop(): Promise<void> {
		while (this.queue.length || this.runningPromises > 0) {
			await this.wait(50);
		}
	}
}

export default PromiseQueue;
