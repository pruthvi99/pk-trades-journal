/**
 * Edge slicing — break down performance by grouping dimension.
 * All functions are pure.
 */

export interface EdgeTrade {
	realizedPnlUsd: number | null;
	realizedPnlR: number | null;
	status: 'open' | 'closed' | 'cancelled';
	symbol: string;
	strategyId: string | null;
	instrument: 'option_spread' | 'stock';
	openedAt: string;
	tagIds: string[];
	tradeQuality?: string | null;
	tradeBasis?: string | null;
}

/** A single row in an edge-slicing table. */
export interface EdgeRow {
	label: string;
	trades: number;
	winPercent: number;
	avgR: number;
	expectancyUsd: number;
	totalUsd: number;
}

/**
 * Generic edge slicer: group trades by a key function, compute stats per group.
 */
export function sliceBy(
	trades: EdgeTrade[],
	keyFn: (t: EdgeTrade) => string | string[],
): EdgeRow[] {
	const closed = trades.filter((t) => t.status === 'closed' && t.realizedPnlUsd != null);
	const groups = new Map<string, EdgeTrade[]>();

	for (const t of closed) {
		const keys = keyFn(t);
		const keyArr = Array.isArray(keys) ? keys : [keys];
		for (const key of keyArr) {
			const existing = groups.get(key);
			if (existing) {
				existing.push(t);
			} else {
				groups.set(key, [t]);
			}
		}
	}

	const rows: EdgeRow[] = [];
	for (const [label, group] of groups) {
		const count = group.length;
		const wins = group.filter((t) => (t.realizedPnlUsd ?? 0) > 0).length;
		const totalPnl = group.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
		const rValues = group.filter((t) => t.realizedPnlR != null);
		const avgR =
			rValues.length > 0
				? rValues.reduce((s, t) => s + (t.realizedPnlR ?? 0), 0) / rValues.length
				: 0;

		rows.push({
			label,
			trades: count,
			winPercent: roundTo2((wins / count) * 100),
			avgR: roundTo2(avgR),
			expectancyUsd: roundTo2(totalPnl / count),
			totalUsd: roundTo2(totalPnl),
		});
	}

	return rows.sort((a, b) => b.totalUsd - a.totalUsd);
}

/** Slice by symbol. */
export function sliceBySymbol(trades: EdgeTrade[]): EdgeRow[] {
	return sliceBy(trades, (t) => t.symbol);
}

/** Slice by strategy ID. Use a label map to resolve names. */
export function sliceByStrategy(
	trades: EdgeTrade[],
	strategyNames: Map<string, string>,
): EdgeRow[] {
	return sliceBy(trades, (t) => {
		if (!t.strategyId) return 'No strategy';
		return strategyNames.get(t.strategyId) ?? t.strategyId;
	});
}

/** Slice by tag. A trade with multiple tags appears in multiple rows. */
export function sliceByTag(trades: EdgeTrade[], tagLabels: Map<string, string>): EdgeRow[] {
	return sliceBy(trades, (t) => {
		if (t.tagIds.length === 0) return ['Untagged'];
		return t.tagIds.map((id) => tagLabels.get(id) ?? id);
	});
}

/** Slice by day of week (0=Sun, 6=Sat). */
export function sliceByDayOfWeek(trades: EdgeTrade[]): EdgeRow[] {
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return sliceBy(trades, (t) => {
		const day = new Date(t.openedAt).getUTCDay();
		return dayNames[day] ?? 'Unknown';
	});
}

/** Slice by hour of entry (UTC). */
export function sliceByHour(trades: EdgeTrade[]): EdgeRow[] {
	return sliceBy(trades, (t) => {
		const hour = new Date(t.openedAt).getUTCHours();
		return `${hour.toString().padStart(2, '0')}:00`;
	});
}

/** Slice by instrument type. */
export function sliceByInstrument(trades: EdgeTrade[]): EdgeRow[] {
	return sliceBy(trades, (t) => (t.instrument === 'option_spread' ? 'Spreads' : 'Stocks'));
}

/** Slice by trade quality grade (A, A+, A++, B, B+). */
export function sliceByQuality(trades: EdgeTrade[]): EdgeRow[] {
	return sliceBy(trades, (t) => t.tradeQuality ?? 'Ungraded');
}

/** Slice by trade basis (rules-based vs intuition). */
export function sliceByBasis(trades: EdgeTrade[]): EdgeRow[] {
	return sliceBy(trades, (t) => {
		if (!t.tradeBasis) return 'Unclassified';
		return t.tradeBasis === 'rules' ? 'Rules-based' : 'Intuition';
	});
}

function roundTo2(n: number): number {
	return Math.round(n * 100) / 100;
}
