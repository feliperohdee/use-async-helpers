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

	add(...fn: (() => Promise<any>)[]): void {
		this.queue = [...this.queue, ...fn];

		if (!this.started) {
			this.started = true;

			queueMicrotask(() => {
				this.run();
			});
		}
	}

	remainingCapacity(): number {
		return this.concurrency - this.runningPromises;
	}

	setConcurrency(n: number): void {
		this.concurrency = n;
	}

	private async run(): Promise<void> {
		if (!this.running) {
			this.running = true;

			while (this.queue.length) {
				const batch = this.queue.splice(0, this.concurrency);
				const promises = batch.map(async fn => {
					try {
						await fn();
					} catch {
						// suppress errors
					} finally {
						this.runningPromises--;
					}
				});

				this.runningPromises += promises.length;

				await Promise.all(promises);
			}

			this.stop();
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
