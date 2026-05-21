import { describe, expect, it } from 'vitest';

describe('smoke test', () => {
	it('vitest is working', () => {
		expect(1 + 1).toBe(2);
	});

	it('can import pnl module', async () => {
		const { computeRealizedPnl, computeRMultiple } = await import('@/lib/pnl');
		expect(computeRealizedPnl([])).toBe(0);
		expect(computeRMultiple(0, null)).toBeNull();
	});

	it('can import all metric modules', async () => {
		await import('@/lib/metrics/headline');
		await import('@/lib/metrics/distribution');
		await import('@/lib/metrics/edge');
		await import('@/lib/metrics/risk');
		await import('@/lib/metrics/psychology');
	});
});
