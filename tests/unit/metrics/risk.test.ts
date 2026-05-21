import { describe, expect, it } from 'vitest';
import {
	avgRiskPercent,
	avgRiskUsd,
	largestLossUsd,
	planAdherenceRate,
	type RiskTrade,
	riskAdjustedReturn,
} from '@/lib/metrics/risk';

const empty: RiskTrade[] = [];

const mixed: RiskTrade[] = [
	{ realizedPnlUsd: 300, plannedRiskUsd: 150, preFollowingPlan: true, status: 'closed' },
	{ realizedPnlUsd: -100, plannedRiskUsd: 100, preFollowingPlan: true, status: 'closed' },
	{ realizedPnlUsd: 150, plannedRiskUsd: 200, preFollowingPlan: false, status: 'closed' },
	{ realizedPnlUsd: -250, plannedRiskUsd: 100, preFollowingPlan: null, status: 'closed' },
	{ realizedPnlUsd: null, plannedRiskUsd: null, preFollowingPlan: null, status: 'open' },
];

describe('avgRiskUsd', () => {
	it('returns 0 for empty', () => expect(avgRiskUsd(empty)).toBe(0));
	it('averages planned risk of closed trades', () => {
		// (150 + 100 + 200 + 100) / 4 = 137.50
		expect(avgRiskUsd(mixed)).toBe(137.5);
	});
});

describe('avgRiskPercent', () => {
	it('returns 0 for empty', () => expect(avgRiskPercent(empty, 25000)).toBe(0));
	it('returns 0 for zero starting balance', () => expect(avgRiskPercent(mixed, 0)).toBe(0));
	it('computes percent correctly', () => {
		expect(avgRiskPercent(mixed, 25000)).toBe(0.55); // 137.5 / 25000 * 100
	});
});

describe('largestLossUsd', () => {
	it('returns 0 for empty', () => expect(largestLossUsd(empty)).toBe(0));
	it('returns most negative P&L', () => expect(largestLossUsd(mixed)).toBe(-250));
	it('returns 0 when all trades are wins', () => {
		const wins: RiskTrade[] = [
			{ realizedPnlUsd: 100, plannedRiskUsd: 50, preFollowingPlan: true, status: 'closed' },
		];
		expect(largestLossUsd(wins)).toBe(0);
	});
});

describe('riskAdjustedReturn', () => {
	it('returns Infinity when no drawdown and positive P&L', () => {
		expect(riskAdjustedReturn(100, 0)).toBe(Infinity);
	});
	it('returns 0 when no drawdown and zero P&L', () => {
		expect(riskAdjustedReturn(0, 0)).toBe(0);
	});
	it('computes ratio', () => {
		expect(riskAdjustedReturn(500, 250)).toBe(2);
	});
});

describe('planAdherenceRate', () => {
	it('returns 0 for empty', () => expect(planAdherenceRate(empty)).toBe(0));
	it('computes rate from trades with plan data', () => {
		// 2 true, 1 false, 1 null (excluded) → 2/3 = 66.67%
		expect(planAdherenceRate(mixed)).toBeCloseTo(66.67, 1);
	});
	it('returns 0 when no trades have plan data', () => {
		const trades: RiskTrade[] = [
			{ realizedPnlUsd: 100, plannedRiskUsd: 50, preFollowingPlan: null, status: 'closed' },
		];
		expect(planAdherenceRate(trades)).toBe(0);
	});
});
