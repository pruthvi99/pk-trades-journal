/**
 * Advanced risk metrics — Sharpe, Sortino, Calmar ratios,
 * underwater curve, recovery factor, fee impact.
 * All functions are pure.
 */

export interface AdvRiskTrade {
	realizedPnlUsd: number | null;
	realizedPnlR: number | null;
	plannedRiskUsd: number | null;
	feesUsd: number | null;
	status: 'open' | 'closed' | 'cancelled';
	closedAt: string | null;
}

// ─── Risk Ratios ───────────────────────────────────────────────────────────

/**
 * Sharpe Ratio = mean(returns) / stddev(returns).
 * Uses per-trade P&L as "returns" (not daily).
 * Annualized by √(trades per year) if annualize=true.
 */
export function sharpeRatio(trades: AdvRiskTrade[], annualize = false): number {
	const pnls = closedPnls(trades);
	if (pnls.length < 2) return 0;

	const mean = avg(pnls);
	const std = stddev(pnls);
	if (std === 0) return mean > 0 ? Infinity : 0;

	let ratio = mean / std;
	if (annualize) {
		const tradesPerYear = estimateTradesPerYear(trades);
		ratio *= Math.sqrt(tradesPerYear);
	}
	return r2(ratio);
}

/**
 * Sortino Ratio = mean(returns) / downside_deviation.
 * Only uses negative returns for volatility calculation.
 */
export function sortinoRatio(trades: AdvRiskTrade[], annualize = false): number {
	const pnls = closedPnls(trades);
	if (pnls.length < 2) return 0;

	const mean = avg(pnls);
	const negatives = pnls.filter((p) => p < 0);
	if (negatives.length === 0) return mean > 0 ? Infinity : 0;

	const downsideDev = Math.sqrt(negatives.reduce((s, p) => s + p * p, 0) / pnls.length);
	if (downsideDev === 0) return mean > 0 ? Infinity : 0;

	let ratio = mean / downsideDev;
	if (annualize) {
		ratio *= Math.sqrt(estimateTradesPerYear(trades));
	}
	return r2(ratio);
}

/**
 * Calmar Ratio = annualized return / max drawdown.
 */
export function calmarRatio(totalPnl: number, maxDrawdownUsd: number): number {
	if (maxDrawdownUsd === 0) return totalPnl > 0 ? Infinity : 0;
	return r2(totalPnl / maxDrawdownUsd);
}

/**
 * Recovery Factor = total net profit / max drawdown.
 */
export function recoveryFactor(totalPnl: number, maxDrawdownUsd: number): number {
	if (maxDrawdownUsd === 0) return totalPnl > 0 ? Infinity : 0;
	return r2(totalPnl / maxDrawdownUsd);
}

// ─── Underwater Curve ──────────────────────────────────────────────────────

export interface UnderwaterPoint {
	tradeIndex: number;
	closedAt: string;
	drawdownUsd: number;
	drawdownPercent: number;
}

/**
 * Generate underwater (drawdown) curve — shows depth of drawdown at each trade.
 * Values are negative when below peak, 0 at peak.
 */
export function underwaterCurve(
	trades: AdvRiskTrade[],
	startingBalance: number,
): UnderwaterPoint[] {
	const sorted = trades
		.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null)
		.sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));

	let cumPnl = 0;
	let peak = startingBalance;
	const points: UnderwaterPoint[] = [];

	for (let i = 0; i < sorted.length; i++) {
		cumPnl += sorted[i]!.realizedPnlUsd ?? 0;
		const equity = startingBalance + cumPnl;
		if (equity > peak) peak = equity;
		const dd = equity - peak; // negative when underwater
		points.push({
			tradeIndex: i + 1,
			closedAt: sorted[i]!.closedAt!,
			drawdownUsd: r2(dd),
			drawdownPercent: peak > 0 ? r2((dd / peak) * 100) : 0,
		});
	}

	return points;
}

// ─── Fee Impact ────────────────────────────────────────────────────────────

export interface FeeImpact {
	totalFeesUsd: number;
	feesAsPercentOfGrossProfit: number;
	feesAsPercentOfVolume: number;
	avgFeePerTrade: number;
	/** Monthly fee breakdown */
	monthlyFees: Array<{ month: string; label: string; fees: number; trades: number }>;
}

const MONTH_NAMES = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

/**
 * Analyze the impact of fees on trading performance.
 */
export function feeImpact(trades: AdvRiskTrade[]): FeeImpact {
	const closed = trades.filter((t) => t.status === 'closed' && t.closedAt != null);

	const totalFees = closed.reduce((s, t) => s + (t.feesUsd ?? 0), 0);
	const grossWins = closed
		.filter((t) => (t.realizedPnlUsd ?? 0) > 0)
		.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);

	// Monthly fees
	const monthGroups = new Map<string, { fees: number; trades: number }>();
	for (const t of closed) {
		const key = t.closedAt!.slice(0, 7);
		const entry = monthGroups.get(key) ?? { fees: 0, trades: 0 };
		entry.fees += t.feesUsd ?? 0;
		entry.trades += 1;
		monthGroups.set(key, entry);
	}

	const monthlyFees = Array.from(monthGroups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, d]) => {
			const [y, m] = month.split('-');
			return {
				month,
				label: `${MONTH_NAMES[Number(m) - 1]} ${y}`,
				fees: r2(d.fees),
				trades: d.trades,
			};
		});

	return {
		totalFeesUsd: r2(totalFees),
		feesAsPercentOfGrossProfit: grossWins > 0 ? r2((totalFees / grossWins) * 100) : 0,
		feesAsPercentOfVolume: 0, // Would need trade volume data
		avgFeePerTrade: closed.length > 0 ? r2(totalFees / closed.length) : 0,
		monthlyFees,
	};
}

// ─── Risk Size Bins ────────────────────────────────────────────────────────

export interface RiskSizeBin {
	label: string;
	order: number;
	trades: number;
	avgPnl: number;
	totalPnl: number;
	winPercent: number;
	avgRiskUsd: number;
}

/**
 * Bucket trades by their planned risk size to see if bigger/smaller
 * positions perform differently.
 */
export function riskSizeBins(trades: AdvRiskTrade[]): RiskSizeBin[] {
	const closed = trades.filter(
		(t) =>
			t.status === 'closed' &&
			t.realizedPnlUsd != null &&
			t.plannedRiskUsd != null &&
			t.plannedRiskUsd > 0,
	);

	if (closed.length === 0) return [];

	// Dynamic bucketing based on actual risk range
	const risks = closed.map((t) => t.plannedRiskUsd!).sort((a, b) => a - b);
	const median = risks[Math.floor(risks.length / 2)]!;

	const buckets = [
		{ label: `≤ $${Math.round(median * 0.5)}`, max: median * 0.5, order: 0 },
		{ label: `$${Math.round(median * 0.5)}–$${Math.round(median)}`, max: median, order: 1 },
		{ label: `$${Math.round(median)}–$${Math.round(median * 1.5)}`, max: median * 1.5, order: 2 },
		{ label: `> $${Math.round(median * 1.5)}`, max: Infinity, order: 3 },
	];

	const bucketData = buckets.map(() => ({ pnls: [] as number[], risks: [] as number[] }));

	for (const t of closed) {
		const risk = t.plannedRiskUsd!;
		let prevMax = 0;
		for (let i = 0; i < buckets.length; i++) {
			if (risk > prevMax && (risk <= buckets[i]!.max || buckets[i]!.max === Infinity)) {
				bucketData[i]!.pnls.push(t.realizedPnlUsd ?? 0);
				bucketData[i]!.risks.push(risk);
				break;
			}
			prevMax = buckets[i]!.max;
		}
	}

	return buckets
		.map((b, i) => {
			const d = bucketData[i]!;
			if (d.pnls.length === 0) return null;
			const wins = d.pnls.filter((p) => p > 0).length;
			const totalPnl = d.pnls.reduce((s, p) => s + p, 0);
			return {
				label: b.label,
				order: b.order,
				trades: d.pnls.length,
				avgPnl: r2(totalPnl / d.pnls.length),
				totalPnl: r2(totalPnl),
				winPercent: r2((wins / d.pnls.length) * 100),
				avgRiskUsd: r2(d.risks.reduce((s, r) => s + r, 0) / d.risks.length),
			};
		})
		.filter((b): b is RiskSizeBin => b !== null);
}

// ─── Direction Analysis ────────────────────────────────────────────────────

export interface DirectionStats {
	direction: string;
	trades: number;
	wins: number;
	winPercent: number;
	avgPnl: number;
	totalPnl: number;
	avgR: number;
}

export interface DirectionTrade extends AdvRiskTrade {
	direction: 'long' | 'short' | 'neutral';
}

/**
 * Break down performance by trade direction (long vs short vs neutral).
 */
export function directionAnalysis(trades: DirectionTrade[]): DirectionStats[] {
	const closed = trades.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null);
	const groups = new Map<string, DirectionTrade[]>();

	for (const t of closed) {
		const dir = t.direction;
		const label = dir.charAt(0).toUpperCase() + dir.slice(1);
		const existing = groups.get(label);
		if (existing) existing.push(t);
		else groups.set(label, [t]);
	}

	return Array.from(groups.entries())
		.map(([direction, group]) => {
			const wins = group.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
			const totalPnl = group.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
			const rValues = group.filter((t) => t.realizedPnlR != null);
			const avgR =
				rValues.length > 0
					? rValues.reduce((s, t) => s + (t.realizedPnlR ?? 0), 0) / rValues.length
					: 0;
			return {
				direction,
				trades: group.length,
				wins,
				winPercent: r2((wins / group.length) * 100),
				avgPnl: r2(totalPnl / group.length),
				totalPnl: r2(totalPnl),
				avgR: r2(avgR),
			};
		})
		.sort((a, b) => b.totalPnl - a.totalPnl);
}

// ─── Monthly P&L Grid (Year-at-a-Glance) ──────────────────────────────────

export interface MonthlyGridCell {
	year: number;
	month: number; // 1–12
	label: string;
	pnlUsd: number;
	trades: number;
}

/**
 * Build a year×month grid for GitHub-contributions-style heatmap.
 */
export function monthlyGrid(trades: AdvRiskTrade[]): MonthlyGridCell[] {
	const closed = trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null,
	);

	const groups = new Map<string, { pnl: number; trades: number }>();
	for (const t of closed) {
		const key = t.closedAt!.slice(0, 7);
		const entry = groups.get(key) ?? { pnl: 0, trades: 0 };
		entry.pnl += t.realizedPnlUsd ?? 0;
		entry.trades += 1;
		groups.set(key, entry);
	}

	return Array.from(groups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, d]) => {
			const [y, m] = key.split('-').map(Number);
			return {
				year: y!,
				month: m!,
				label: `${MONTH_NAMES[m! - 1]} ${y}`,
				pnlUsd: r2(d.pnl),
				trades: d.trades,
			};
		});
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function closedPnls(trades: AdvRiskTrade[]): number[] {
	return trades
		.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null)
		.map((t) => t.realizedPnlUsd!);
}

function avg(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function stddev(nums: number[]): number {
	if (nums.length < 2) return 0;
	const mean = avg(nums);
	const variance = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / (nums.length - 1);
	return Math.sqrt(variance);
}

function estimateTradesPerYear(trades: AdvRiskTrade[]): number {
	const closed = trades.filter((t) => t.status === 'closed' && t.closedAt != null);
	if (closed.length < 2) return 252; // default
	const sorted = closed.sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
	const firstDate = new Date(sorted[0]!.closedAt!);
	const lastDate = new Date(sorted[sorted.length - 1]!.closedAt!);
	const daySpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / 86_400_000);
	return (closed.length / daySpan) * 365;
}

function r2(n: number): number {
	return Math.round(n * 100) / 100;
}
