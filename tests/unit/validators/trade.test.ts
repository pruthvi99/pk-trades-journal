import { describe, expect, it } from 'vitest';
import { createTradeSchema, updateTradeSchema } from '@/lib/validators/trade';

describe('createTradeSchema', () => {
	it('accepts valid minimal trade', () => {
		const result = createTradeSchema.safeParse({
			symbol: 'spy',
			instrument: 'option_spread',
			direction: 'short',
			openedAt: '2025-01-15T15:30:00.000Z',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.symbol).toBe('SPY'); // transformed to uppercase
		}
	});

	it('accepts valid full trade', () => {
		const result = createTradeSchema.safeParse({
			symbol: 'NVDA',
			instrument: 'stock',
			direction: 'long',
			strategyId: '550e8400-e29b-41d4-a716-446655440000',
			plannedEntry: 150.0,
			plannedStop: 148.0,
			plannedTarget: 155.0,
			plannedSize: 100,
			plannedRiskUsd: 200,
			openedAt: '2025-01-15T15:30:00.000Z',
			notesMd: 'Opening drive breakout above VWAP',
			preConfidence: 7,
			preConviction: 'Strong volume above VWAP',
			preMood: 'focused',
			preSleepHours: 7.5,
			preCaffeine: true,
			preFollowingPlan: true,
			tagIds: ['550e8400-e29b-41d4-a716-446655440000'],
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty symbol', () => {
		const result = createTradeSchema.safeParse({
			symbol: '',
			instrument: 'stock',
			direction: 'long',
			openedAt: '2025-01-15T15:30:00.000Z',
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid instrument', () => {
		const result = createTradeSchema.safeParse({
			symbol: 'SPY',
			instrument: 'futures',
			direction: 'long',
			openedAt: '2025-01-15T15:30:00.000Z',
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid mood', () => {
		const result = createTradeSchema.safeParse({
			symbol: 'SPY',
			instrument: 'stock',
			direction: 'long',
			openedAt: '2025-01-15T15:30:00.000Z',
			preMood: 'angry',
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative planned entry', () => {
		const result = createTradeSchema.safeParse({
			symbol: 'SPY',
			instrument: 'stock',
			direction: 'long',
			openedAt: '2025-01-15T15:30:00.000Z',
			plannedEntry: -10,
		});
		expect(result.success).toBe(false);
	});

	it('rejects confidence outside 1-10', () => {
		const result = createTradeSchema.safeParse({
			symbol: 'SPY',
			instrument: 'stock',
			direction: 'long',
			openedAt: '2025-01-15T15:30:00.000Z',
			preConfidence: 11,
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid datetime', () => {
		const result = createTradeSchema.safeParse({
			symbol: 'SPY',
			instrument: 'stock',
			direction: 'long',
			openedAt: 'not-a-date',
		});
		expect(result.success).toBe(false);
	});
});

describe('updateTradeSchema', () => {
	it('accepts partial update', () => {
		const result = updateTradeSchema.safeParse({
			status: 'closed',
			closedAt: '2025-01-15T16:00:00.000Z',
			postSatisfaction: 8,
			postLessons: 'Held to target as planned',
			postWouldRetake: true,
		});
		expect(result.success).toBe(true);
	});

	it('accepts empty object', () => {
		const result = updateTradeSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});
