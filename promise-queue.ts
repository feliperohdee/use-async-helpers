class Queue {
	private concurrency: number;
	private queue: (() => Promise<any>)[];
	private running: boolean;
	private runningPromises: number;
	private started: boolean;

	constructor(initialConcurrency: number = 5) {
		this.concurrency = initialConcurrency;
		this.queue = [];
		this.running = false;
		this.runningPromises = 0;
		this.started = false;
	}

	add(...fn: (() => Promise<any>)[]): void {
		this.queue = this.queue.concat(fn);

		if (!this.started) {
			this.started = true;
			setTimeout(() => this.run());
		}
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
		}

		this.stop();
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

export default Queue;
