import { describe, expect, it } from 'vitest';
import {
	averageR,
	closedTradeCount,
	closedTrades,
	expectancyR,
	expectancyUsd,
	type MetricTrade,
	medianR,
	openTradeCount,
	profitFactor,
	totalPnlPercent,
	totalPnlUsd,
	winRate,
} from '@/lib/metrics/headline';

// ─── Test fixtures ─────────────────────────────────────────────────────

const empty: MetricTrade[] = [];

const allWins: MetricTrade[] = [
	{ realizedPnlUsd: 100, realizedPnlR: 1.0, plannedRiskUsd: 100, status: 'closed' },
	{ realizedPnlUsd: 200, realizedPnlR: 2.0, plannedRiskUsd: 100, status: 'closed' },
	{ realizedPnlUsd: 50, realizedPnlR: 0.5, plannedRiskUsd: 100, status: 'closed' },
];

const allLosses: MetricTrade[] = [
	{ realizedPnlUsd: -100, realizedPnlR: -1.0, plannedRiskUsd: 100, status: 'closed' },
	{ realizedPnlUsd: -50, realizedPnlR: -0.5, plannedRiskUsd: 100, status: 'closed' },
	{ realizedPnlUsd: -200, realizedPnlR: -2.0, plannedRiskUsd: 100, status: 'closed' },
];

const mixed: MetricTrade[] = [
	{ realizedPnlUsd: 300, realizedPnlR: 2.0, plannedRiskUsd: 150, status: 'closed' },
	{ realizedPnlUsd: -100, realizedPnlR: -1.0, plannedRiskUsd: 100, status: 'closed' },
	{ realizedPnlUsd: 150, realizedPnlR: 1.5, plannedRiskUsd: 100, status: 'closed' },
	{ realizedPnlUsd: -50, realizedPnlR: -0.5, plannedRiskUsd: 100, status: 'closed' },
	{ realizedPnlUsd: null, realizedPnlR: null, plannedRiskUsd: null, status: 'open' },
];

const singleTrade: MetricTrade[] = [
	{ realizedPnlUsd: 100, realizedPnlR: 1.0, plannedRiskUsd: 100, status: 'closed' },
];

// ─── Tests ─────────────────────────────────────────────────────────────

describe('closedTrades', () => {
	it('returns empty for no trades', () => {
		expect(closedTrades(empty)).toHaveLength(0);
	});

	it('filters out open and cancelled trades', () => {
		const trades: MetricTrade[] = [
			{ realizedPnlUsd: 100, realizedPnlR: 1, plannedRiskUsd: 100, status: 'closed' },
			{ realizedPnlUsd: null, realizedPnlR: null, plannedRiskUsd: null, status: 'open' },
			{ realizedPnlUsd: null, realizedPnlR: null, plannedRiskUsd: null, status: 'cancelled' },
		];
		expect(closedTrades(trades)).toHaveLength(1);
	});

	it('filters out closed trades with null P&L', () => {
		const trades: MetricTrade[] = [
			{ realizedPnlUsd: null, realizedPnlR: null, plannedRiskUsd: null, status: 'closed' },
		];
		expect(closedTrades(trades)).toHaveLength(0);
	});
});

describe('totalPnlUsd', () => {
	it('returns 0 for empty', () => expect(totalPnlUsd(empty)).toBe(0));
	it('sums all wins', () => expect(totalPnlUsd(allWins)).toBe(350));
	it('sums all losses', () => expect(totalPnlUsd(allLosses)).toBe(-350));
	it('sums mixed', () => expect(totalPnlUsd(mixed)).toBe(300));
	it('handles single trade', () => expect(totalPnlUsd(singleTrade)).toBe(100));
});

describe('totalPnlPercent', () => {
	it('returns 0 for empty', () => expect(totalPnlPercent(empty, 25000)).toBe(0));
	it('computes percent of starting balance', () => {
		expect(totalPnlPercent(mixed, 25000)).toBe(1.2); // 300/25000 * 100
	});
	it('returns 0 for zero starting balance', () => {
		expect(totalPnlPercent(mixed, 0)).toBe(0);
	});
});

describe('openTradeCount / closedTradeCount', () => {
	it('counts open trades', () => expect(openTradeCount(mixed)).toBe(1));
	it('counts closed trades', () => expect(closedTradeCount(mixed)).toBe(4));
	it('returns 0 for empty', () => {
		expect(openTradeCount(empty)).toBe(0);
		expect(closedTradeCount(empty)).toBe(0);
	});
});

describe('winRate', () => {
	it('returns 0 for empty', () => expect(winRate(empty)).toBe(0));
	it('returns 100 for all wins', () => expect(winRate(allWins)).toBe(100));
	it('returns 0 for all losses', () => expect(winRate(allLosses)).toBe(0));
	it('computes mixed correctly', () => expect(winRate(mixed)).toBe(50));
	it('handles single winning trade', () => expect(winRate(singleTrade)).toBe(100));
});

describe('profitFactor', () => {
	it('returns 0 for empty', () => expect(profitFactor(empty)).toBe(0));
	it('returns Infinity for all wins', () => expect(profitFactor(allWins)).toBe(Infinity));
	it('returns 0 for all losses', () => expect(profitFactor(allLosses)).toBe(0));
	it('computes mixed correctly', () => {
		// Gross wins: 300 + 150 = 450, Gross losses: |(-100) + (-50)| = 150
		expect(profitFactor(mixed)).toBe(3);
	});
});

describe('expectancyUsd', () => {
	it('returns 0 for empty', () => expect(expectancyUsd(empty)).toBe(0));
	it('computes average for all wins', () => {
		expect(expectancyUsd(allWins)).toBeCloseTo(116.67, 1);
	});
	it('computes average for mixed', () => {
		expect(expectancyUsd(mixed)).toBe(75); // 300/4
	});
});

describe('expectancyR / averageR', () => {
	it('returns 0 for empty', () => expect(expectancyR(empty)).toBe(0));
	it('computes average R for mixed', () => {
		// (2.0 + -1.0 + 1.5 + -0.5) / 4 = 0.5
		expect(expectancyR(mixed)).toBe(0.5);
	});
	it('averageR is same as expectancyR', () => {
		expect(averageR(mixed)).toBe(expectancyR(mixed));
	});
});

describe('medianR', () => {
	it('returns 0 for empty', () => expect(medianR(empty)).toBe(0));
	it('returns the value for single trade', () => expect(medianR(singleTrade)).toBe(1));
	it('computes median for even count', () => {
		// Sorted R: -1.0, -0.5, 1.5, 2.0 → median = (-0.5 + 1.5) / 2 = 0.5
		expect(medianR(mixed)).toBe(0.5);
	});
	it('computes median for odd count', () => {
		// Sorted: 0.5, 1.0, 2.0 → median = 1.0
		expect(medianR(allWins)).toBe(1);
	});
});
