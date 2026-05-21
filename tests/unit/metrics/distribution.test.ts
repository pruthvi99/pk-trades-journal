import { describe, expect, it } from 'vitest';
import {
	type DistributionTrade,
	equityCurve,
	maxDrawdown,
	rDistribution,
	streaks,
} from '@/lib/metrics/distribution';

const empty: DistributionTrade[] = [];

const mixedTrades: DistributionTrade[] = [
	{ realizedPnlUsd: 100, realizedPnlR: 1.0, status: 'closed', closedAt: '2025-01-01T10:00:00Z' },
	{ realizedPnlUsd: 200, realizedPnlR: 2.0, status: 'closed', closedAt: '2025-01-02T10:00:00Z' },
	{ realizedPnlUsd: -150, realizedPnlR: -1.5, status: 'closed', closedAt: '2025-01-03T10:00:00Z' },
	{ realizedPnlUsd: -100, realizedPnlR: -1.0, status: 'closed', closedAt: '2025-01-04T10:00:00Z' },
	{ realizedPnlUsd: 300, realizedPnlR: 3.0, status: 'closed', closedAt: '2025-01-05T10:00:00Z' },
];

const allWins: DistributionTrade[] = [
	{ realizedPnlUsd: 100, realizedPnlR: 1.0, status: 'closed', closedAt: '2025-01-01T10:00:00Z' },
	{ realizedPnlUsd: 200, realizedPnlR: 2.0, status: 'closed', closedAt: '2025-01-02T10:00:00Z' },
];

const allLosses: DistributionTrade[] = [
	{ realizedPnlUsd: -50, realizedPnlR: -0.5, status: 'closed', closedAt: '2025-01-01T10:00:00Z' },
	{ realizedPnlUsd: -100, realizedPnlR: -1.0, status: 'closed', closedAt: '2025-01-02T10:00:00Z' },
];

describe('equityCurve', () => {
	it('returns empty for no trades', () => {
		expect(equityCurve(empty, 25000)).toHaveLength(0);
	});

	it('builds cumulative curve from starting balance', () => {
		const curve = equityCurve(mixedTrades, 25000);
		expect(curve).toHaveLength(5);
		expect(curve[0]!.equity).toBe(25100); // 25000 + 100
		expect(curve[1]!.equity).toBe(25300); // + 200
		expect(curve[2]!.equity).toBe(25150); // - 150
		expect(curve[3]!.equity).toBe(25050); // - 100
		expect(curve[4]!.equity).toBe(25350); // + 300
	});

	it('tracks tradeIndex starting at 1', () => {
		const curve = equityCurve(mixedTrades, 25000);
		expect(curve[0]!.tradeIndex).toBe(1);
		expect(curve[4]!.tradeIndex).toBe(5);
	});

	it('excludes open trades', () => {
		const trades: DistributionTrade[] = [
			...mixedTrades,
			{ realizedPnlUsd: null, realizedPnlR: null, status: 'open', closedAt: null },
		];
		expect(equityCurve(trades, 25000)).toHaveLength(5);
	});
});

describe('maxDrawdown', () => {
	it('returns zeros for no trades', () => {
		const result = maxDrawdown(empty, 25000);
		expect(result.maxDrawdownUsd).toBe(0);
		expect(result.maxDrawdownPercent).toBe(0);
		expect(result.longestDrawdownDays).toBe(0);
	});

	it('returns zeros for all wins', () => {
		const result = maxDrawdown(allWins, 25000);
		expect(result.maxDrawdownUsd).toBe(0);
	});

	it('computes drawdown for mixed trades', () => {
		const result = maxDrawdown(mixedTrades, 25000);
		// Peak: 25300 (after trade 2), Trough: 25050 (after trade 4)
		// Drawdown: 25300 - 25050 = 250
		expect(result.maxDrawdownUsd).toBe(250);
		expect(result.maxDrawdownPercent).toBeCloseTo(0.99, 1);
	});

	it('computes drawdown for all losses', () => {
		const result = maxDrawdown(allLosses, 25000);
		// Starting: 25000, after trade 1: 24950, after trade 2: 24850
		// Peak was 25000, trough 24850 → DD = 150
		expect(result.maxDrawdownUsd).toBe(150);
	});

	it('computes drawdown duration in days', () => {
		const result = maxDrawdown(mixedTrades, 25000);
		// Drawdown from Jan 3 to Jan 5 (when we make new high) = 2 days
		expect(result.longestDrawdownDays).toBeGreaterThanOrEqual(2);
	});
});

describe('streaks', () => {
	it('returns zeros for no trades', () => {
		const result = streaks(empty);
		expect(result.currentStreak).toBe(0);
		expect(result.currentStreakType).toBe('none');
		expect(result.maxWinStreak).toBe(0);
		expect(result.maxLossStreak).toBe(0);
	});

	it('computes all wins streak', () => {
		const result = streaks(allWins);
		expect(result.maxWinStreak).toBe(2);
		expect(result.maxLossStreak).toBe(0);
		expect(result.currentStreakType).toBe('win');
		expect(result.currentStreak).toBe(2);
	});

	it('computes all losses streak', () => {
		const result = streaks(allLosses);
		expect(result.maxWinStreak).toBe(0);
		expect(result.maxLossStreak).toBe(2);
		expect(result.currentStreakType).toBe('loss');
	});

	it('computes mixed streaks', () => {
		const result = streaks(mixedTrades);
		// W, W, L, L, W → max win: 2, max loss: 2, current: 1 win
		expect(result.maxWinStreak).toBe(2);
		expect(result.maxLossStreak).toBe(2);
		expect(result.currentStreak).toBe(1);
		expect(result.currentStreakType).toBe('win');
	});
});

describe('rDistribution', () => {
	it('returns empty for no trades', () => {
		expect(rDistribution(empty)).toHaveLength(0);
	});

	it('returns sorted R values', () => {
		const result = rDistribution(mixedTrades);
		expect(result).toEqual([-1.5, -1, 1, 2, 3]);
	});

	it('excludes open trades', () => {
		const trades: DistributionTrade[] = [
			...mixedTrades,
			{ realizedPnlUsd: null, realizedPnlR: null, status: 'open', closedAt: null },
		];
		expect(rDistribution(trades)).toHaveLength(5);
	});
});
