/**
 * Psychology vs outcome metrics.
 * All functions are pure.
 */

export interface PsychTrade {
	realizedPnlUsd: number | null;
	status: 'open' | 'closed' | 'cancelled';
	preConfidence: number | null;
	preMood: string | null;
	preSleepHours: number | null;
	postWouldRetake: boolean | null;
}

/**
 * Average pre-confidence on winners vs losers.
 */
export function confidenceByOutcome(trades: PsychTrade[]): {
	winnersAvg: number;
	losersAvg: number;
} {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.preConfidence != null,
	);

	const winners = closed.filter((t) => (t.realizedPnlUsd ?? 0) > 0);
	const losers = closed.filter((t) => (t.realizedPnlUsd ?? 0) < 0);

	return {
		winnersAvg: avg(winners.map((t) => t.preConfidence!)),
		losersAvg: avg(losers.map((t) => t.preConfidence!)),
	};
}

/** Win rate grouped by pre-mood. */
export interface MoodWinRate {
	mood: string;
	trades: number;
	winPercent: number;
}

export function winRateByMood(trades: PsychTrade[]): MoodWinRate[] {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.preMood != null,
	);

	const groups = new Map<string, PsychTrade[]>();
	for (const t of closed) {
		const mood = t.preMood!;
		const existing = groups.get(mood);
		if (existing) existing.push(t);
		else groups.set(mood, [t]);
	}

	const result: MoodWinRate[] = [];
	for (const [mood, group] of groups) {
		const wins = group.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
		result.push({
			mood,
			trades: group.length,
			winPercent: roundTo2((wins / group.length) * 100),
		});
	}

	return result.sort((a, b) => b.winPercent - a.winPercent);
}

/**
 * Win rate when sleep < 6 hours vs >= 6 hours.
 */
export function winRateBySleep(trades: PsychTrade[]): {
	underSixHours: { trades: number; winPercent: number };
	sixPlusHours: { trades: number; winPercent: number };
} {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.preSleepHours != null,
	);

	const under = closed.filter((t) => (t.preSleepHours ?? 0) < 6);
	const over = closed.filter((t) => (t.preSleepHours ?? 0) >= 6);

	return {
		underSixHours: {
			trades: under.length,
			winPercent: winPct(under),
		},
		sixPlusHours: {
			trades: over.length,
			winPercent: winPct(over),
		},
	};
}

/**
 * "Would retake" rate: percentage of closed trades where postWouldRetake is true.
 */
export function wouldRetakeRate(trades: PsychTrade[]): number {
	const withValue = trades.filter((t) => t.status === 'closed' && t.postWouldRetake != null);
	if (withValue.length === 0) return 0;
	const yes = withValue.filter((t) => t.postWouldRetake === true).length;
	return roundTo2((yes / withValue.length) * 100);
}

function winPct(trades: PsychTrade[]): number {
	if (trades.length === 0) return 0;
	const wins = trades.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
	return roundTo2((wins / trades.length) * 100);
}

function avg(nums: number[]): number {
	if (nums.length === 0) return 0;
	return roundTo2(nums.reduce((s, n) => s + n, 0) / nums.length);
}

function roundTo2(n: number): number {
	return Math.round(n * 100) / 100;
}
