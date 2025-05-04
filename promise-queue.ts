class PromiseQueue {
	private queue: (() => Promise<any>)[];
	public children: Set<PromiseQueue>;
	public concurrency: number;
	public id: string;
	public parent: PromiseQueue | null;
	public running: boolean;
	public runningPromises: number;
	public started: boolean;

	constructor(options?: { concurrency?: number; parent?: PromiseQueue }) {
		this.children = new Set();
		this.concurrency = options?.concurrency ?? 5;
		this.id = crypto.randomUUID();
		this.parent = options?.parent || null;
		this.queue = [];
		this.running = false;
		this.runningPromises = 0;
		this.started = false;
	}

	add(...fn: (() => Promise<any>)[]) {
		this.queue = [...this.queue, ...fn];

		if (!this.started) {
			this.started = true;
			this.running = true;
			// Register with parent when we start processing
			if (this.parent) {
				this.parent.registerChild(this);
				this.updateConcurrency();
			}

			this.processNext();
		} else if (this.running && this.remainingCapacity() > 0) {
			// If we have capacity and we're already running, process next tasks
			this.processNext();
		}
	}

	private async executeTask(fn: () => Promise<any>) {
		try {
			await fn();
		} catch {
			// suppress errors
		}
	}

	private async launchTask(fn: () => Promise<any>) {
		try {
			await this.executeTask(fn);
		} catch (error) {
			// Catch any errors from executeTask (shouldn't happen as it catches internally)
		} finally {
			this.runningPromises--;

			// When a task completes, try to process more tasks if available
			if (this.queue.length > 0 && this.remainingCapacity() > 0 && this.running) {
				this.processNext();
			} else if (this.queue.length === 0 && this.runningPromises === 0) {
				// If queue is empty and no tasks are running, we're done
				this.running = false;
				this.started = false;
				if (this.parent) {
					this.parent.unregisterChild(this);
				}
			}
		}
	}

	private registerChild(child: PromiseQueue): void {
		this.children.add(child);

		// Update concurrency for all children when a new child is added
		for (const childQueue of this.children) {
			childQueue.updateConcurrency();
		}
	}

	remainingCapacity(): number {
		return this.concurrency - this.runningPromises;
	}

	private processNext() {
		if (this.parent) {
			// Update concurrency based on parent settings
			this.updateConcurrency();
		}

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
			this.launchTask(fn);
		}
	}

	setConcurrency(n: number) {
		this.concurrency = n;

		// Update concurrency of child queues
		for (const childQueue of this.children) {
			childQueue.updateConcurrency();
		}

		// If we increased concurrency and have tasks waiting, try to process more
		if (this.running && this.queue.length > 0 && this.remainingCapacity() > 0) {
			this.processNext();
		}
	}

	setParent(parent: PromiseQueue): void {
		if (!parent) {
			throw new Error('Parent queue cannot be null or undefined');
		}

		this.parent = parent;
	}

	stop(): void {
		this.queue = [];
		this.running = false;
		this.runningPromises = 0;
		this.started = false;

		if (this.parent) {
			this.parent.unregisterChild(this);
		}
	}

	private unregisterChild(child: PromiseQueue): void {
		this.children.delete(child);
	}

	private updateConcurrency(): void {
		if (!this.parent) {
			return;
		}

		// minimum concurrency is 1, or 1/4 of parent's concurrency
		const minimumConcurrency = Math.max(1, Math.ceil(this.parent.concurrency / 4));
		// per child concurrency is parent's concurrency divided by number of children
		const perChild = Math.ceil(this.parent.concurrency / this.parent.children.size);

		this.concurrency = Math.max(minimumConcurrency, perChild);
	}

	async wait(ms: number) {
		return new Promise(resolve => {
			return setTimeout(resolve, ms);
		});
	}

	async waitStop() {
		while (this.queue.length || this.runningPromises > 0) {
			await this.wait(50);
		}
	}
}

export default PromiseQueue;
