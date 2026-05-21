import { describe, expect, it } from 'vitest';
import {
	type EdgeTrade,
	sliceBy,
	sliceByDayOfWeek,
	sliceByHour,
	sliceByInstrument,
	sliceBySymbol,
	sliceByTag,
} from '@/lib/metrics/edge';

const trades: EdgeTrade[] = [
	{
		realizedPnlUsd: 300,
		realizedPnlR: 2.0,
		status: 'closed',
		symbol: 'SPY',
		strategyId: 's1',
		instrument: 'option_spread',
		openedAt: '2025-01-06T15:00:00Z', // Monday 15:00
		tagIds: ['t1', 't2'],
	},
	{
		realizedPnlUsd: -100,
		realizedPnlR: -1.0,
		status: 'closed',
		symbol: 'SPY',
		strategyId: 's1',
		instrument: 'option_spread',
		openedAt: '2025-01-07T10:00:00Z', // Tuesday 10:00
		tagIds: ['t1'],
	},
	{
		realizedPnlUsd: 150,
		realizedPnlR: 1.5,
		status: 'closed',
		symbol: 'NVDA',
		strategyId: 's2',
		instrument: 'stock',
		openedAt: '2025-01-06T14:00:00Z', // Monday 14:00
		tagIds: [],
	},
	{
		realizedPnlUsd: null,
		realizedPnlR: null,
		status: 'open',
		symbol: 'AAPL',
		strategyId: 's1',
		instrument: 'stock',
		openedAt: '2025-01-08T09:00:00Z',
		tagIds: ['t2'],
	},
];

describe('sliceBy (generic)', () => {
	it('returns empty for no closed trades', () => {
		expect(sliceBy([], (t) => t.symbol)).toHaveLength(0);
	});

	it('excludes open trades', () => {
		const result = sliceBy(trades, (t) => t.symbol);
		const labels = result.map((r) => r.label);
		expect(labels).not.toContain('AAPL');
	});
});

describe('sliceBySymbol', () => {
	it('groups by symbol', () => {
		const result = sliceBySymbol(trades);
		expect(result).toHaveLength(2);

		const spy = result.find((r) => r.label === 'SPY');
		expect(spy).toBeDefined();
		expect(spy!.trades).toBe(2);
		expect(spy!.totalUsd).toBe(200);
		expect(spy!.winPercent).toBe(50);

		const nvda = result.find((r) => r.label === 'NVDA');
		expect(nvda).toBeDefined();
		expect(nvda!.trades).toBe(1);
		expect(nvda!.totalUsd).toBe(150);
		expect(nvda!.winPercent).toBe(100);
	});
});

describe('sliceByTag', () => {
	it('groups by tag, trade appears in multiple groups', () => {
		const labels = new Map([
			['t1', 'Breakout'],
			['t2', 'Earnings'],
		]);
		const result = sliceByTag(trades, labels);

		const breakout = result.find((r) => r.label === 'Breakout');
		expect(breakout).toBeDefined();
		expect(breakout!.trades).toBe(2); // trade 1 and trade 2

		const earnings = result.find((r) => r.label === 'Earnings');
		expect(earnings).toBeDefined();
		expect(earnings!.trades).toBe(1); // trade 1 only

		const untagged = result.find((r) => r.label === 'Untagged');
		expect(untagged).toBeDefined();
		expect(untagged!.trades).toBe(1); // trade 3
	});
});

describe('sliceByDayOfWeek', () => {
	it('groups by day of week', () => {
		const result = sliceByDayOfWeek(trades);
		const monday = result.find((r) => r.label === 'Monday');
		expect(monday).toBeDefined();
		expect(monday!.trades).toBe(2); // trade 1 and 3

		const tuesday = result.find((r) => r.label === 'Tuesday');
		expect(tuesday).toBeDefined();
		expect(tuesday!.trades).toBe(1);
	});
});

describe('sliceByHour', () => {
	it('groups by hour of entry', () => {
		const result = sliceByHour(trades);
		expect(result.some((r) => r.label === '15:00')).toBe(true);
		expect(result.some((r) => r.label === '10:00')).toBe(true);
		expect(result.some((r) => r.label === '14:00')).toBe(true);
	});
});

describe('sliceByInstrument', () => {
	it('groups by instrument type', () => {
		const result = sliceByInstrument(trades);
		const spreads = result.find((r) => r.label === 'Spreads');
		expect(spreads!.trades).toBe(2);
		const stocks = result.find((r) => r.label === 'Stocks');
		expect(stocks!.trades).toBe(1);
	});
});
