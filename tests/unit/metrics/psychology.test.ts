import { describe, expect, it } from 'vitest';
import {
	confidenceByOutcome,
	type PsychTrade,
	winRateByMood,
	winRateBySleep,
	wouldRetakeRate,
} from '@/lib/metrics/psychology';

const empty: PsychTrade[] = [];

const trades: PsychTrade[] = [
	{
		realizedPnlUsd: 300,
		status: 'closed',
		preConfidence: 8,
		preMood: 'calm',
		preSleepHours: 7,
		postWouldRetake: true,
	},
	{
		realizedPnlUsd: -100,
		status: 'closed',
		preConfidence: 5,
		preMood: 'anxious',
		preSleepHours: 5,
		postWouldRetake: false,
	},
	{
		realizedPnlUsd: 150,
		status: 'closed',
		preConfidence: 7,
		preMood: 'calm',
		preSleepHours: 8,
		postWouldRetake: true,
	},
	{
		realizedPnlUsd: -50,
		status: 'closed',
		preConfidence: 3,
		preMood: 'fomo',
		preSleepHours: 4,
		postWouldRetake: false,
	},
	{
		realizedPnlUsd: null,
		status: 'open',
		preConfidence: null,
		preMood: null,
		preSleepHours: null,
		postWouldRetake: null,
	},
];

describe('confidenceByOutcome', () => {
	it('returns 0 for empty', () => {
		const result = confidenceByOutcome(empty);
		expect(result.winnersAvg).toBe(0);
		expect(result.losersAvg).toBe(0);
	});

	it('computes average confidence for winners and losers', () => {
		const result = confidenceByOutcome(trades);
		// Winners: 8, 7 → avg 7.5
		expect(result.winnersAvg).toBe(7.5);
		// Losers: 5, 3 → avg 4
		expect(result.losersAvg).toBe(4);
	});
});

describe('winRateByMood', () => {
	it('returns empty for empty', () => {
		expect(winRateByMood(empty)).toHaveLength(0);
	});

	it('groups by mood with win rates', () => {
		const result = winRateByMood(trades);

		const calm = result.find((r) => r.mood === 'calm');
		expect(calm).toBeDefined();
		expect(calm!.trades).toBe(2);
		expect(calm!.winPercent).toBe(100);

		const anxious = result.find((r) => r.mood === 'anxious');
		expect(anxious).toBeDefined();
		expect(anxious!.trades).toBe(1);
		expect(anxious!.winPercent).toBe(0);

		const fomo = result.find((r) => r.mood === 'fomo');
		expect(fomo).toBeDefined();
		expect(fomo!.winPercent).toBe(0);
	});
});

describe('winRateBySleep', () => {
	it('returns zeros for empty', () => {
		const result = winRateBySleep(empty);
		expect(result.underSixHours.trades).toBe(0);
		expect(result.sixPlusHours.trades).toBe(0);
	});

	it('splits by 6-hour threshold', () => {
		const result = winRateBySleep(trades);

		// Under 6h: 5h (loss), 4h (loss) → 0% win rate
		expect(result.underSixHours.trades).toBe(2);
		expect(result.underSixHours.winPercent).toBe(0);

		// 6+ hours: 7h (win), 8h (win) → 100% win rate
		expect(result.sixPlusHours.trades).toBe(2);
		expect(result.sixPlusHours.winPercent).toBe(100);
	});
});

describe('wouldRetakeRate', () => {
	it('returns 0 for empty', () => expect(wouldRetakeRate(empty)).toBe(0));
	it('computes rate from trades with data', () => {
		// 2 true, 2 false → 50%
		expect(wouldRetakeRate(trades)).toBe(50);
	});
	it('excludes trades without value', () => {
		const trades: PsychTrade[] = [
			{
				realizedPnlUsd: 100,
				status: 'closed',
				preConfidence: null,
				preMood: null,
				preSleepHours: null,
				postWouldRetake: null,
			},
		];
		expect(wouldRetakeRate(trades)).toBe(0);
	});
});
