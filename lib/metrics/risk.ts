/**
 * Risk metrics — computed from closed trades.
 * All functions are pure.
 */

export interface RiskTrade {
	realizedPnlUsd: number | null;
	plannedRiskUsd: number | null;
	preFollowingPlan: boolean | null;
	status: 'open' | 'closed' | 'cancelled';
}

/** Average planned risk per trade in USD. */
export function avgRiskUsd(trades: RiskTrade[]): number {
	const withRisk = trades.filter(
		(t) => t.status === 'closed' && t.plannedRiskUsd != null && t.plannedRiskUsd > 0,
	);
	if (withRisk.length === 0) return 0;
	return roundTo2(withRisk.reduce((s, t) => s + (t.plannedRiskUsd ?? 0), 0) / withRisk.length);
}

/** Average planned risk as percentage of starting balance. */
export function avgRiskPercent(trades: RiskTrade[], startingBalance: number): number {
	if (startingBalance <= 0) return 0;
	const avg = avgRiskUsd(trades);
	return roundTo2((avg / startingBalance) * 100);
}

/** Largest single loss in USD (most negative P&L). */
export function largestLossUsd(trades: RiskTrade[]): number {
	const closed = trades.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null);
	if (closed.length === 0) return 0;
	const min = Math.min(...closed.map((t) => t.realizedPnlUsd ?? 0));
	return min < 0 ? roundTo2(min) : 0;
}

/**
 * Risk-adjusted return: total P&L / max drawdown.
 * Returns 0 if max drawdown is 0.
 */
export function riskAdjustedReturn(totalPnlUsd: number, maxDrawdownUsd: number): number {
	if (maxDrawdownUsd === 0) return totalPnlUsd > 0 ? Number.POSITIVE_INFINITY : 0;
	return roundTo2(totalPnlUsd / maxDrawdownUsd);
}

/**
 * Plan adherence rate: percentage of closed trades where preFollowingPlan is true.
 * Only counts trades that have a value set.
 */
export function planAdherenceRate(trades: RiskTrade[]): number {
	const withPlan = trades.filter((t) => t.status === 'closed' && t.preFollowingPlan != null);
	if (withPlan.length === 0) return 0;
	const following = withPlan.filter((t) => t.preFollowingPlan === true).length;
	return roundTo2((following / withPlan.length) * 100);
}

function roundTo2(n: number): number {
	return Math.round(n * 100) / 100;
}
