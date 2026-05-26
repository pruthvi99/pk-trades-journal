/**
 * Distribution metrics — drawdown, streaks, equity curve data.
 * All functions are pure.
 */

export interface DistributionTrade {
	realizedPnlUsd: number | null;
	realizedPnlR: number | null;
	status: 'open' | 'closed' | 'cancelled';
	closedAt: string | null;
}

/** A single point on the equity curve. */
export interface EquityPoint {
	tradeIndex: number;
	closedAt: string;
	cumulativePnl: number;
	equity: number;
}

/**
 * Generate equity curve data from closed trades sorted by closedAt.
 * Equity starts from startingBalance.
 */
export function equityCurve(trades: DistributionTrade[], startingBalance: number): EquityPoint[] {
	const sorted = trades
		.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null)
		.sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));

	let cumPnl = 0;
	return sorted.map((t, i) => {
		cumPnl += t.realizedPnlUsd ?? 0;
		return {
			tradeIndex: i + 1,
			closedAt: t.closedAt!,
			cumulativePnl: roundTo2(cumPnl),
			equity: roundTo2(startingBalance + cumPnl),
		};
	});
}

/** Drawdown result. */
export interface DrawdownResult {
	maxDrawdownUsd: number;
	maxDrawdownPercent: number;
	longestDrawdownDays: number;
}

/**
 * Compute max drawdown from equity curve.
 * Max drawdown = largest peak-to-trough decline.
 */
export function maxDrawdown(trades: DistributionTrade[], startingBalance: number): DrawdownResult {
	const curve = equityCurve(trades, startingBalance);
	if (curve.length === 0) {
		return { maxDrawdownUsd: 0, maxDrawdownPercent: 0, longestDrawdownDays: 0 };
	}

	let peak = startingBalance;
	let maxDd = 0;
	let maxDdPercent = 0;

	// Track drawdown duration
	let drawdownStartDate: string | null = null;
	let longestDays = 0;

	for (const point of curve) {
		if (point.equity > peak) {
			// New peak — end any active drawdown
			if (drawdownStartDate) {
				const days = daysBetween(drawdownStartDate, point.closedAt);
				longestDays = Math.max(longestDays, days);
				drawdownStartDate = null;
			}
			peak = point.equity;
		} else {
			// In drawdown
			if (!drawdownStartDate) {
				drawdownStartDate = point.closedAt;
			}
			const dd = peak - point.equity;
			if (dd > maxDd) {
				maxDd = dd;
				maxDdPercent = peak > 0 ? (dd / peak) * 100 : 0;
			}
		}
	}

	// If still in drawdown at the end
	if (drawdownStartDate && curve.length > 0) {
		const lastDate = curve[curve.length - 1]!.closedAt;
		const days = daysBetween(drawdownStartDate, lastDate);
		longestDays = Math.max(longestDays, days);
	}

	return {
		maxDrawdownUsd: roundTo2(maxDd),
		maxDrawdownPercent: roundTo2(maxDdPercent),
		longestDrawdownDays: longestDays,
	};
}

/** Win/loss streak info. */
export interface StreakResult {
	currentStreak: number;
	currentStreakType: 'win' | 'loss' | 'none';
	maxWinStreak: number;
	maxLossStreak: number;
}

/**
 * Compute win/loss streaks from closed trades sorted by closedAt.
 */
export function streaks(trades: DistributionTrade[]): StreakResult {
	const sorted = trades
		.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null)
		.sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));

	if (sorted.length === 0) {
		return { currentStreak: 0, currentStreakType: 'none', maxWinStreak: 0, maxLossStreak: 0 };
	}

	let maxWin = 0;
	let maxLoss = 0;
	let currentCount = 0;
	let currentType: 'win' | 'loss' | 'none' = 'none';

	for (const t of sorted) {
		const pnl = t.realizedPnlUsd ?? 0;
		if (pnl === 0) continue; // skip breakeven trades — they don't extend or break a streak
		const type = pnl > 0 ? 'win' : 'loss';

		if (type === currentType) {
			currentCount++;
		} else {
			currentType = type;
			currentCount = 1;
		}

		if (currentType === 'win') maxWin = Math.max(maxWin, currentCount);
		else maxLoss = Math.max(maxLoss, currentCount);
	}

	return {
		currentStreak: currentCount,
		currentStreakType: currentType,
		maxWinStreak: maxWin,
		maxLossStreak: maxLoss,
	};
}

/**
 * R-multiple distribution: returns sorted array of R values for histogram.
 */
export function rDistribution(trades: DistributionTrade[]): number[] {
	return trades
		.filter((t) => t.status === 'closed' && t.realizedPnlR != null)
		.map((t) => t.realizedPnlR!)
		.sort((a, b) => a - b);
}

function daysBetween(a: string, b: string): number {
	const msPerDay = 86_400_000;
	const dateA = new Date(a);
	const dateB = new Date(b);
	return Math.max(0, Math.round(Math.abs(dateB.getTime() - dateA.getTime()) / msPerDay));
}

function roundTo2(n: number): number {
	return Math.round(n * 100) / 100;
}
