/**
 * P&L computation engine.
 * Pure functions that derive realized P&L from trade executions and legs.
 *
 * Handles:
 * - Multi-leg option spreads (credit and debit)
 * - Stock scalps
 * - Pyramiding (multiple entries)
 * - Partial exits (scaling out)
 * - Adjustments
 * - Fee handling
 * - R-multiple calculation
 *
 * All functions are pure — no database access, no side effects.
 */

/** Minimal leg data needed for P&L computation. */
export interface PnlLeg {
	side: 'buy' | 'sell';
	price: number;
	/** Number of shares (stock) or contracts (options). Use whichever applies. */
	quantity: number;
	/** 100 for options, 1 for stock */
	multiplier: number;
}

/** Minimal execution data needed for P&L computation. */
export interface PnlExecution {
	kind: 'entry' | 'exit' | 'adjustment';
	legs: PnlLeg[];
	feesUsd: number;
}

/**
 * Compute the net cash flow of a single execution.
 * Buying costs money (negative), selling receives money (positive).
 * This is from the trader's perspective.
 */
export function executionCashFlow(execution: PnlExecution): number {
	let flow = 0;
	for (const leg of execution.legs) {
		const notional = leg.price * leg.quantity * leg.multiplier;
		// sell = receive premium/cash (positive), buy = pay premium/cash (negative)
		flow += leg.side === 'sell' ? notional : -notional;
	}
	return flow;
}

/**
 * Compute realized P&L in USD for a trade from all its executions.
 *
 * Method: sum all cash flows from all executions, then subtract total fees.
 * For a completed trade (all positions closed), this gives the true realized P&L.
 *
 * For credit spreads: entry is a net credit (positive cash flow),
 * exit is a net debit (negative cash flow). P&L = net credit - net debit - fees.
 *
 * For debit spreads: entry is a net debit (negative cash flow),
 * exit is a net credit (positive cash flow). P&L = net credit - net debit - fees.
 *
 * For stocks: buy entry is negative, sell exit is positive. P&L = exit - entry - fees.
 *
 * @param executions - All executions for a single trade
 * @param tradeLevelFees - Additional fees at the trade level (not per-execution)
 * @returns Realized P&L in USD, rounded to 2 decimal places
 */
export function computeRealizedPnl(executions: PnlExecution[], tradeLevelFees: number = 0): number {
	if (executions.length === 0) return 0;

	let totalCashFlow = 0;
	let totalFees = tradeLevelFees;

	for (const exec of executions) {
		totalCashFlow += executionCashFlow(exec);
		totalFees += exec.feesUsd;
	}

	// Round to 2 decimal places to avoid floating-point artifacts
	return roundTo2(totalCashFlow - totalFees);
}

/**
 * Compute the R-multiple of a trade.
 * R = realized_pnl / planned_risk.
 * Returns null if planned risk is not set or is zero.
 */
export function computeRMultiple(
	realizedPnlUsd: number,
	plannedRiskUsd: number | null | undefined,
): number | null {
	if (plannedRiskUsd == null || plannedRiskUsd === 0) return null;
	return roundTo2(realizedPnlUsd / plannedRiskUsd);
}

/**
 * Compute the total fees across all executions plus trade-level fees.
 */
export function computeTotalFees(executions: PnlExecution[], tradeLevelFees: number = 0): number {
	let total = tradeLevelFees;
	for (const exec of executions) {
		total += exec.feesUsd;
	}
	return roundTo2(total);
}

/** Round a number to 2 decimal places. */
function roundTo2(n: number): number {
	return Math.round(n * 100) / 100;
}
