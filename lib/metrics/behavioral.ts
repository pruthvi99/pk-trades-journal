/**
 * Behavioral analytics — tilt detection, confidence calibration,
 * revenge trade detection, overtrading analysis.
 * All functions are pure.
 */

export interface BehavioralTrade {
	realizedPnlUsd: number | null;
	realizedPnlR: number | null;
	status: 'open' | 'closed' | 'cancelled';
	openedAt: string;
	closedAt: string | null;
	preConfidence: number | null;
	preMood: string | null;
	preSleepHours: number | null;
	preFollowingPlan: boolean | null;
	duringStress: number | null;
	postSatisfaction: number | null;
}

// ─── Tilt Detection ────────────────────────────────────────────────────────

export interface TiltPoint {
	/** "After 1W", "After 2W", "After 1L", "After 2L" */
	label: string;
	streakType: 'win' | 'loss';
	streakLength: number;
	/** Trades taken after this streak */
	nextTrades: number;
	/** Win rate of the trade immediately following this streak */
	nextWinPercent: number;
	/** Avg P&L of the trade following this streak */
	nextAvgPnl: number;
}

/**
 * Analyze how performance changes after winning/losing streaks.
 * "After 2 consecutive wins, what's your next-trade win rate?"
 * This detects tilt (degraded performance after losses) or
 * overconfidence (degraded after wins).
 */
export function tiltDetection(trades: BehavioralTrade[]): TiltPoint[] {
	const sorted = trades
		.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null)
		.sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));

	if (sorted.length < 3) return [];

	// For each trade (except first), calculate the streak leading into it
	const results = new Map<string, number[]>();

	for (let i = 1; i < sorted.length; i++) {
		// Count streak ending at i-1
		let streakLen = 1;
		const prevWin = (sorted[i - 1]!.realizedPnlUsd ?? 0) > 0;
		const streakType = prevWin ? 'win' : 'loss';

		for (let j = i - 2; j >= 0; j--) {
			const jWin = (sorted[j]!.realizedPnlUsd ?? 0) > 0;
			if (jWin === prevWin) streakLen++;
			else break;
		}

		// Record the outcome of trade i (the one AFTER the streak)
		for (let len = 1; len <= streakLen; len++) {
			const key = `${streakType}-${len}`;
			const pnl = sorted[i]!.realizedPnlUsd ?? 0;
			const existing = results.get(key);
			if (existing) existing.push(pnl);
			else results.set(key, [pnl]);
		}
	}

	const points: TiltPoint[] = [];
	for (const [key, pnls] of results) {
		const [type, len] = key.split('-');
		const wins = pnls.filter((p) => p > 0).length;
		points.push({
			label: `After ${len}${type === 'win' ? 'W' : 'L'}`,
			streakType: type as 'win' | 'loss',
			streakLength: Number(len),
			nextTrades: pnls.length,
			nextWinPercent: r2((wins / pnls.length) * 100),
			nextAvgPnl: r2(pnls.reduce((s, p) => s + p, 0) / pnls.length),
		});
	}

	return points
		.filter((p) => p.nextTrades >= 2) // need at least 2 data points
		.sort((a, b) => {
			if (a.streakType !== b.streakType) return a.streakType === 'win' ? -1 : 1;
			return a.streakLength - b.streakLength;
		});
}

// ─── Confidence Calibration ────────────────────────────────────────────────

export interface CalibrationBin {
	/** "1–3", "4–5", "6–7", "8–10" */
	label: string;
	minConf: number;
	maxConf: number;
	trades: number;
	actualWinPercent: number;
	avgPnl: number;
	avgR: number;
}

const CONFIDENCE_BINS = [
	{ label: '1–3', min: 1, max: 3 },
	{ label: '4–5', min: 4, max: 5 },
	{ label: '6–7', min: 6, max: 7 },
	{ label: '8–10', min: 8, max: 10 },
] as const;

/**
 * Bin trades by pre-trade confidence and show actual win rate per bin.
 * Reveals if trader is well-calibrated (high confidence = high win rate)
 * or miscalibrated.
 */
export function confidenceCalibration(trades: BehavioralTrade[]): CalibrationBin[] {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.preConfidence != null,
	);

	return CONFIDENCE_BINS.map((bin) => {
		const inBin = closed.filter((t) => t.preConfidence! >= bin.min && t.preConfidence! <= bin.max);
		const wins = inBin.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
		const totalPnl = inBin.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
		const rValues = inBin.filter((t) => t.realizedPnlR != null);
		const avgR =
			rValues.length > 0
				? rValues.reduce((s, t) => s + (t.realizedPnlR ?? 0), 0) / rValues.length
				: 0;

		return {
			label: bin.label,
			minConf: bin.min,
			maxConf: bin.max,
			trades: inBin.length,
			actualWinPercent: inBin.length > 0 ? r2((wins / inBin.length) * 100) : 0,
			avgPnl: inBin.length > 0 ? r2(totalPnl / inBin.length) : 0,
			avgR: r2(avgR),
		};
	}).filter((b) => b.trades > 0);
}

// ─── Revenge Trade Detection ───────────────────────────────────────────────

export interface RevengeTradeStat {
	/** Trades opened within threshold minutes of a losing trade closing */
	revengeTradeCount: number;
	totalTrades: number;
	revengePercent: number;
	/** Win rate on revenge trades */
	revengeWinPercent: number;
	/** Win rate on non-revenge trades */
	normalWinPercent: number;
	/** Average P&L on revenge vs normal */
	revengeAvgPnl: number;
	normalAvgPnl: number;
}

/**
 * Detect revenge trades: trades opened within `thresholdMinutes` of a losing
 * trade being closed. Compare their performance to normal trades.
 */
export function revengeTradeDetection(
	trades: BehavioralTrade[],
	thresholdMinutes = 30,
): RevengeTradeStat {
	const closed = trades
		.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null)
		.sort((a, b) => a.openedAt.localeCompare(b.openedAt));

	// Find losing trades and their close times
	const lossTimes = closed
		.filter((t) => (t.realizedPnlUsd ?? 0) < 0)
		.map((t) => new Date(t.closedAt!).getTime());

	const revengePnls: number[] = [];
	const normalPnls: number[] = [];

	for (const t of closed) {
		const openTime = new Date(t.openedAt).getTime();
		const isRevenge = lossTimes.some(
			(lossTime) => openTime > lossTime && openTime - lossTime <= thresholdMinutes * 60_000,
		);

		const pnl = t.realizedPnlUsd ?? 0;
		if (isRevenge) revengePnls.push(pnl);
		else normalPnls.push(pnl);
	}

	const revengeWins = revengePnls.filter((p) => p > 0).length;
	const normalWins = normalPnls.filter((p) => p > 0).length;

	return {
		revengeTradeCount: revengePnls.length,
		totalTrades: closed.length,
		revengePercent: closed.length > 0 ? r2((revengePnls.length / closed.length) * 100) : 0,
		revengeWinPercent: revengePnls.length > 0 ? r2((revengeWins / revengePnls.length) * 100) : 0,
		normalWinPercent: normalPnls.length > 0 ? r2((normalWins / normalPnls.length) * 100) : 0,
		revengeAvgPnl:
			revengePnls.length > 0 ? r2(revengePnls.reduce((s, p) => s + p, 0) / revengePnls.length) : 0,
		normalAvgPnl:
			normalPnls.length > 0 ? r2(normalPnls.reduce((s, p) => s + p, 0) / normalPnls.length) : 0,
	};
}

// ─── Overtrading Detection ─────────────────────────────────────────────────

export interface OvertradingDay {
	date: string;
	trades: number;
	pnlUsd: number;
	winPercent: number;
}

export interface OvertradingStat {
	avgTradesPerDay: number;
	maxTradesInDay: number;
	/** Days where trades > avg + 1 stddev */
	overtradeDays: OvertradingDay[];
	/** Performance on days with above-avg trade count vs below-avg */
	highVolumeWinPercent: number;
	lowVolumeWinPercent: number;
	highVolumeAvgPnl: number;
	lowVolumeAvgPnl: number;
}

/**
 * Detect overtrading patterns: days with unusually high trade counts
 * and compare their performance to normal-volume days.
 */
export function overtradingDetection(trades: BehavioralTrade[]): OvertradingStat {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null,
	);

	// Group by date opened
	const byDate = new Map<string, number[]>();
	for (const t of closed) {
		const date = t.openedAt.slice(0, 10);
		const existing = byDate.get(date);
		if (existing) existing.push(t.realizedPnlUsd ?? 0);
		else byDate.set(date, [t.realizedPnlUsd ?? 0]);
	}

	if (byDate.size === 0) {
		return {
			avgTradesPerDay: 0,
			maxTradesInDay: 0,
			overtradeDays: [],
			highVolumeWinPercent: 0,
			lowVolumeWinPercent: 0,
			highVolumeAvgPnl: 0,
			lowVolumeAvgPnl: 0,
		};
	}

	const dayCounts = Array.from(byDate.values()).map((pnls) => pnls.length);
	const avgPerDay = dayCounts.reduce((s, n) => s + n, 0) / dayCounts.length;
	const maxInDay = Math.max(...dayCounts);

	// Threshold = avg + 1 stddev
	const std =
		dayCounts.length > 1
			? Math.sqrt(dayCounts.reduce((s, n) => s + (n - avgPerDay) ** 2, 0) / (dayCounts.length - 1))
			: 0;
	const threshold = avgPerDay + std;

	const overtradeDays: OvertradingDay[] = [];
	const highVolPnls: number[] = [];
	const lowVolPnls: number[] = [];

	for (const [date, pnls] of byDate) {
		const wins = pnls.filter((p) => p > 0).length;
		const totalPnl = pnls.reduce((s, p) => s + p, 0);
		const isHigh = pnls.length > threshold;

		if (isHigh) {
			overtradeDays.push({
				date,
				trades: pnls.length,
				pnlUsd: r2(totalPnl),
				winPercent: r2((wins / pnls.length) * 100),
			});
			highVolPnls.push(...pnls);
		} else {
			lowVolPnls.push(...pnls);
		}
	}

	const highWins = highVolPnls.filter((p) => p > 0).length;
	const lowWins = lowVolPnls.filter((p) => p > 0).length;

	return {
		avgTradesPerDay: r2(avgPerDay),
		maxTradesInDay: maxInDay,
		overtradeDays: overtradeDays.sort((a, b) => b.trades - a.trades),
		highVolumeWinPercent: highVolPnls.length > 0 ? r2((highWins / highVolPnls.length) * 100) : 0,
		lowVolumeWinPercent: lowVolPnls.length > 0 ? r2((lowWins / lowVolPnls.length) * 100) : 0,
		highVolumeAvgPnl:
			highVolPnls.length > 0 ? r2(highVolPnls.reduce((s, p) => s + p, 0) / highVolPnls.length) : 0,
		lowVolumeAvgPnl:
			lowVolPnls.length > 0 ? r2(lowVolPnls.reduce((s, p) => s + p, 0) / lowVolPnls.length) : 0,
	};
}

// ─── Plan Deviation Impact ─────────────────────────────────────────────────

export interface PlanDeviationImpact {
	followedPlanTrades: number;
	deviatedTrades: number;
	followedWinPercent: number;
	deviatedWinPercent: number;
	followedAvgPnl: number;
	deviatedAvgPnl: number;
	followedAvgR: number;
	deviatedAvgR: number;
}

/**
 * Compare performance when following the plan vs deviating.
 */
export function planDeviationImpact(trades: BehavioralTrade[]): PlanDeviationImpact {
	const withPlan = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.preFollowingPlan != null,
	);

	const followed = withPlan.filter((t) => t.preFollowingPlan === true);
	const deviated = withPlan.filter((t) => t.preFollowingPlan === false);

	const compute = (group: BehavioralTrade[]) => {
		const wins = group.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
		const totalPnl = group.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
		const rValues = group.filter((t) => t.realizedPnlR != null);
		const avgR =
			rValues.length > 0
				? rValues.reduce((s, t) => s + (t.realizedPnlR ?? 0), 0) / rValues.length
				: 0;
		return {
			trades: group.length,
			winPercent: group.length > 0 ? r2((wins / group.length) * 100) : 0,
			avgPnl: group.length > 0 ? r2(totalPnl / group.length) : 0,
			avgR: r2(avgR),
		};
	};

	const f = compute(followed);
	const d = compute(deviated);

	return {
		followedPlanTrades: f.trades,
		deviatedTrades: d.trades,
		followedWinPercent: f.winPercent,
		deviatedWinPercent: d.winPercent,
		followedAvgPnl: f.avgPnl,
		deviatedAvgPnl: d.avgPnl,
		followedAvgR: f.avgR,
		deviatedAvgR: d.avgR,
	};
}

// ─── Stress vs Performance ─────────────────────────────────────────────────

export interface StressBin {
	label: string;
	trades: number;
	winPercent: number;
	avgPnl: number;
}

/**
 * Bin trades by during-trade stress level and compare outcomes.
 */
export function stressAnalysis(trades: BehavioralTrade[]): StressBin[] {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.duringStress != null,
	);

	const bins = [
		{ label: 'Low (1–3)', min: 1, max: 3 },
		{ label: 'Medium (4–6)', min: 4, max: 6 },
		{ label: 'High (7–10)', min: 7, max: 10 },
	];

	return bins
		.map((bin) => {
			const inBin = closed.filter((t) => t.duringStress! >= bin.min && t.duringStress! <= bin.max);
			const wins = inBin.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
			const totalPnl = inBin.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
			return {
				label: bin.label,
				trades: inBin.length,
				winPercent: inBin.length > 0 ? r2((wins / inBin.length) * 100) : 0,
				avgPnl: inBin.length > 0 ? r2(totalPnl / inBin.length) : 0,
			};
		})
		.filter((b) => b.trades > 0);
}

// ─── Satisfaction Calibration ──────────────────────────────────────────────

export interface SatisfactionStat {
	highSatisfactionTrades: number;
	lowSatisfactionTrades: number;
	/** Trades where postSatisfaction >= 7 — what % would they retake? */
	highSatWouldRetake: number;
	lowSatWouldRetake: number;
	/** Avg P&L on high vs low satisfaction trades */
	highSatAvgPnl: number;
	lowSatAvgPnl: number;
}

/**
 * Correlate post-trade satisfaction with actual P&L outcomes.
 */
export function satisfactionAnalysis(trades: BehavioralTrade[]): SatisfactionStat {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.postSatisfaction != null,
	);

	const high = closed.filter((t) => t.postSatisfaction! >= 7);
	const low = closed.filter((t) => t.postSatisfaction! < 7);

	return {
		highSatisfactionTrades: high.length,
		lowSatisfactionTrades: low.length,
		highSatWouldRetake: 0, // Would need postWouldRetake field
		lowSatWouldRetake: 0,
		highSatAvgPnl:
			high.length > 0 ? r2(high.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0) / high.length) : 0,
		lowSatAvgPnl:
			low.length > 0 ? r2(low.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0) / low.length) : 0,
	};
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function r2(n: number): number {
	return Math.round(n * 100) / 100;
}
