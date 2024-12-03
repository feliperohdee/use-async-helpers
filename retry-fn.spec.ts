import { describe, it, expect, vi } from 'vitest';

import retryFn, { RetryFn } from './retry-fn';

describe('retr-fn', () => {
	it('should return res on successful first attempt', async () => {
		const fn: RetryFn<string> = () => 'success';
		const res = await retryFn(fn);

		expect(res).toEqual('success');
	});

	it('should retry on failure until success', async () => {
		let totalAttempts = 0;

		const fn: RetryFn<string> = vi.fn(({ attempts }) => {
			totalAttempts = attempts;

			if (attempts <= 3) {
				throw new Error(`Attempt ${attempts} failed`);
			}

			return 'success';
		});

		const res = await retryFn(fn);

		expect(fn).toHaveBeenCalledTimes(4);
		expect(res).toEqual('success');
		expect(totalAttempts).toEqual(4);
	});

	it('should respect default maxAttempts option', async () => {
		let totalAttempts = 0;

		const fn: RetryFn<string> = vi.fn(({ attempts }) => {
			totalAttempts = attempts;

			throw new Error(`Attempt ${attempts} failed`);
		});

		await expect(retryFn(fn)).rejects.toThrow('Attempt 5 failed');

		expect(fn).toHaveBeenCalledTimes(5);
		expect(totalAttempts).toEqual(5);
	});

	it('should respect custom maxAttempts option', async () => {
		let totalAttempts = 0;

		const fn: RetryFn<string> = vi.fn(({ attempts }) => {
			totalAttempts = attempts;

			throw new Error(`Attempt ${attempts} failed`);
		});

		await expect(retryFn(fn, { maxAttempts: 3 })).rejects.toThrow('Attempt 3 failed');

		expect(fn).toHaveBeenCalledTimes(3);
		expect(totalAttempts).toEqual(3);
	});

	it('should handle timeout option', async () => {
		const fn: RetryFn<string> = vi.fn(() => {
			return new Promise<string>(resolve => {
				setTimeout(() => {
					return resolve('success');
				}, 2000);
			});
		});

		await expect(retryFn(fn, { timeout: 1000 })).rejects.toThrow('Operation timed out');
	});

	it('should call onError with correct context', async () => {
		const onError = vi.fn();
		const error = new Error('Test error');

		const fn: RetryFn<string> = vi.fn(() => {
			throw error;
		});

		await expect(retryFn(fn, { maxAttempts: 2, onError })).rejects.toThrow('Test error');

		expect(onError).toHaveBeenCalledTimes(2);
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				attempts: 2,
				skipRetry: expect.any(Function)
			})
		);

		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should stop retrying when skipRetry is called', async () => {
		let totalAttempts = 0;

		const fn: RetryFn<string> = vi.fn(({ attempts, skipRetry }) => {
			totalAttempts = attempts;

			if (attempts === 2) {
				skipRetry(new Error('Custom error'));
			}

			throw new Error('Regular error');
		});

		await expect(retryFn(fn, { maxAttempts: 5 })).rejects.toThrow('Custom error');

		expect(fn).toHaveBeenCalledTimes(2);
		expect(totalAttempts).toEqual(2);
	});

	it('should skip retry with original error if no custom error provided', async () => {
		const fn: RetryFn<string> = ({ skipRetry }) => {
			skipRetry();
			throw new Error('Original error');
		};

		await expect(retryFn(fn)).rejects.toThrow('Original error');
	});

	it('should wait between retries', async () => {
		let totalAttempts = 0;
		let startTime = Date.now();

		const fn: RetryFn<string> = vi.fn(({ attempts }) => {
			totalAttempts = attempts;

			if (attempts < 3) {
				throw new Error(`Attempt ${attempts} failed`);
			}

			return 'success';
		});

		const res = await retryFn(fn);

		expect(res).toEqual('success');
		expect(totalAttempts).toEqual(3);
		expect(fn).toHaveBeenCalledTimes(3);
		expect(Date.now() - startTime).toBeGreaterThanOrEqual(200);
	});

	it('should wait between retries with custom delay function', async () => {
		let totalAttempts = 0;
		let startTime = Date.now();

		const fn: RetryFn<string> = vi.fn(({ attempts }) => {
			totalAttempts = attempts;

			if (attempts < 3) {
				throw new Error(`Attempt ${attempts} failed`);
			}

			return 'success';
		});

		const res = await retryFn(fn, {
			delay: ({ attempts }) => {
				return attempts * 50;
			}
		});

		expect(res).toEqual('success');
		expect(totalAttempts).toEqual(3);
		expect(fn).toHaveBeenCalledTimes(3);
		expect(Date.now() - startTime).toBeGreaterThanOrEqual(150);
	});

	it('should wait between retries with custom delay', async () => {
		let totalAttempts = 0;
		let startTime = Date.now();

		const fn: RetryFn<string> = vi.fn(({ attempts }) => {
			totalAttempts = attempts;

			if (attempts < 3) {
				throw new Error(`Attempt ${attempts} failed`);
			}

			return 'success';
		});

		const res = await retryFn(fn, {
			delay: 100
		});

		expect(res).toEqual('success');
		expect(totalAttempts).toEqual(3);
		expect(fn).toHaveBeenCalledTimes(3);
		expect(Date.now() - startTime).toBeGreaterThanOrEqual(200);
	});

	it('should handle async functions', async () => {
		let totalAttempts = 0;

		const fn: RetryFn<string> = vi.fn(async ({ attempts }) => {
			totalAttempts = attempts;

			await new Promise(resolve => {
				return setTimeout(resolve, 100);
			});

			if (attempts < 2) {
				throw new Error(`Attempt ${attempts} failed`);
			}

			return 'success';
		});

		const res = await retryFn(fn);

		expect(res).toEqual('success');
		expect(totalAttempts).toEqual(2);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
