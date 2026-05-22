/**
 * Headline metrics — computed from closed trades only.
 * All functions are pure: array in, number out.
 */

/** Minimal trade data needed for headline metrics. */
export interface MetricTrade {
	realizedPnlUsd: number | null;
	realizedPnlR: number | null;
	plannedRiskUsd: number | null;
	status: 'open' | 'closed' | 'cancelled';
}

/** Filter to only closed trades with a realized P&L. */
export function closedTrades(trades: MetricTrade[]): MetricTrade[] {
	return trades.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null);
}

/** Total realized P&L in USD across closed trades. */
export function totalPnlUsd(trades: MetricTrade[]): number {
	const ct = closedTrades(trades);
	return roundTo2(ct.reduce((sum, t) => sum + (t.realizedPnlUsd ?? 0), 0));
}

/** Total realized P&L as a percentage of starting balance. */
export function totalPnlPercent(trades: MetricTrade[], startingBalance: number): number {
	if (startingBalance <= 0) return 0;
	return roundTo2((totalPnlUsd(trades) / startingBalance) * 100);
}

/** Count of open trades. */
export function openTradeCount(trades: MetricTrade[]): number {
	return trades.filter((t) => t.status === 'open').length;
}

/** Count of closed trades. */
export function closedTradeCount(trades: MetricTrade[]): number {
	return closedTrades(trades).length;
}

/** Win rate: percentage of closed trades with positive P&L. */
export function winRate(trades: MetricTrade[]): number {
	const ct = closedTrades(trades);
	if (ct.length === 0) return 0;
	const wins = ct.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
	return roundTo2((wins / ct.length) * 100);
}

/**
 * Profit factor: gross wins / |gross losses|.
 * Returns Infinity if there are no losses. Returns 0 if there are no wins.
 */
export function profitFactor(trades: MetricTrade[]): number {
	const ct = closedTrades(trades);
	let grossWin = 0;
	let grossLoss = 0;
	for (const t of ct) {
		const pnl = t.realizedPnlUsd ?? 0;
		if (pnl > 0) grossWin += pnl;
		else grossLoss += Math.abs(pnl);
	}
	if (grossLoss === 0) return grossWin > 0 ? Number.POSITIVE_INFINITY : 0;
	return roundTo2(grossWin / grossLoss);
}

/** Average P&L per closed trade in USD. */
export function expectancyUsd(trades: MetricTrade[]): number {
	const ct = closedTrades(trades);
	if (ct.length === 0) return 0;
	return roundTo2(totalPnlUsd(trades) / ct.length);
}

/** Average R-multiple per closed trade. */
export function expectancyR(trades: MetricTrade[]): number {
	const ct = closedTrades(trades).filter((t) => t.realizedPnlR != null);
	if (ct.length === 0) return 0;
	const sum = ct.reduce((s, t) => s + (t.realizedPnlR ?? 0), 0);
	return roundTo2(sum / ct.length);
}

/** Average R-multiple of closed trades that have an R value. */
export function averageR(trades: MetricTrade[]): number {
	return expectancyR(trades);
}

/** Median R-multiple of closed trades. */
export function medianR(trades: MetricTrade[]): number {
	const rValues = closedTrades(trades)
		.filter((t) => t.realizedPnlR != null)
		.map((t) => t.realizedPnlR!)
		.sort((a, b) => a - b);

	if (rValues.length === 0) return 0;
	const mid = Math.floor(rValues.length / 2);
	if (rValues.length % 2 === 0) {
		return roundTo2((rValues[mid - 1]! + rValues[mid]!) / 2);
	}
	return rValues[mid]!;
}

/** Average winning trade P&L in USD. */
export function avgWinUsd(trades: MetricTrade[]): number {
	const wins = closedTrades(trades).filter((t) => (t.realizedPnlUsd ?? 0) > 0);
	if (wins.length === 0) return 0;
	return roundTo2(wins.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0) / wins.length);
}

/** Average losing trade P&L in USD (negative number). */
export function avgLossUsd(trades: MetricTrade[]): number {
	const losses = closedTrades(trades).filter((t) => (t.realizedPnlUsd ?? 0) < 0);
	if (losses.length === 0) return 0;
	return roundTo2(losses.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0) / losses.length);
}

/** Payoff ratio: avg win / |avg loss|. Higher is better. */
export function payoffRatio(trades: MetricTrade[]): number {
	const aw = avgWinUsd(trades);
	const al = avgLossUsd(trades);
	if (al === 0) return aw > 0 ? Infinity : 0;
	return roundTo2(aw / Math.abs(al));
}

/** Best single trade P&L. */
export function bestTradeUsd(trades: MetricTrade[]): number {
	const ct = closedTrades(trades);
	if (ct.length === 0) return 0;
	return roundTo2(Math.max(...ct.map((t) => t.realizedPnlUsd ?? 0)));
}

/** Worst single trade P&L. */
export function worstTradeUsd(trades: MetricTrade[]): number {
	const ct = closedTrades(trades);
	if (ct.length === 0) return 0;
	return roundTo2(Math.min(...ct.map((t) => t.realizedPnlUsd ?? 0)));
}

/** Kelly Criterion: f* = W - (1-W)/R where W=win rate, R=payoff ratio. */
export function kellyCriterion(trades: MetricTrade[]): number {
	const wr = winRate(trades) / 100;
	const pr = payoffRatio(trades);
	if (pr === 0 || pr === Infinity) return 0;
	const kelly = wr - (1 - wr) / pr;
	return roundTo2(kelly * 100); // as percentage
}

/** Number of winning trades. */
export function winCount(trades: MetricTrade[]): number {
	return closedTrades(trades).filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
}

/** Number of losing trades. */
export function lossCount(trades: MetricTrade[]): number {
	return closedTrades(trades).filter((t) => (t.realizedPnlUsd ?? 0) < 0).length;
}

/** Number of breakeven trades ($0 P&L). */
export function breakEvenCount(trades: MetricTrade[]): number {
	return closedTrades(trades).filter((t) => (t.realizedPnlUsd ?? 0) === 0).length;
}

/** Gross profit (sum of winning trades). */
export function grossProfit(trades: MetricTrade[]): number {
	const wins = closedTrades(trades).filter((t) => (t.realizedPnlUsd ?? 0) > 0);
	return roundTo2(wins.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0));
}

/** Gross loss (sum of losing trades, as positive number). */
export function grossLoss(trades: MetricTrade[]): number {
	const losses = closedTrades(trades).filter((t) => (t.realizedPnlUsd ?? 0) < 0);
	return roundTo2(Math.abs(losses.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0)));
}

/** Standard deviation of trade P&L. */
export function pnlStdDev(trades: MetricTrade[]): number {
	const ct = closedTrades(trades);
	if (ct.length < 2) return 0;
	const mean = ct.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0) / ct.length;
	const variance =
		ct.reduce((s, t) => s + ((t.realizedPnlUsd ?? 0) - mean) ** 2, 0) / (ct.length - 1);
	return roundTo2(Math.sqrt(variance));
}

function roundTo2(n: number): number {
	return Math.round(n * 100) / 100;
}
