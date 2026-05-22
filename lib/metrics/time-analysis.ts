/**
 * Time-based analysis — monthly P&L, rolling metrics, holding periods,
 * trade frequency, and hour×day heatmap.
 * All functions are pure.
 */

export interface TimeTrade {
	realizedPnlUsd: number | null;
	realizedPnlR: number | null;
	plannedRiskUsd: number | null;
	status: 'open' | 'closed' | 'cancelled';
	openedAt: string;
	closedAt: string | null;
}

// ─── Monthly P&L ───────────────────────────────────────────────────────────

export interface MonthlyPnl {
	/** "YYYY-MM" */
	month: string;
	/** Human label "Jan 2026" */
	label: string;
	pnlUsd: number;
	trades: number;
	wins: number;
	losses: number;
	winPercent: number;
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
 * Group closed trades by the month they were closed, return monthly P&L bars.
 */
export function monthlyPnl(trades: TimeTrade[]): MonthlyPnl[] {
	const closed = filterClosed(trades);
	const groups = new Map<string, { pnl: number; trades: number; wins: number; losses: number }>();

	for (const t of closed) {
		const key = t.closedAt!.slice(0, 7); // "YYYY-MM"
		const entry = groups.get(key) ?? { pnl: 0, trades: 0, wins: 0, losses: 0 };
		const pnl = t.realizedPnlUsd ?? 0;
		entry.pnl += pnl;
		entry.trades += 1;
		if (pnl > 0) entry.wins += 1;
		else entry.losses += 1;
		groups.set(key, entry);
	}

	return Array.from(groups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, d]) => {
			const [y, m] = month.split('-');
			return {
				month,
				label: `${MONTH_NAMES[Number(m) - 1]} ${y}`,
				pnlUsd: r2(d.pnl),
				trades: d.trades,
				wins: d.wins,
				losses: d.losses,
				winPercent: d.trades > 0 ? r2((d.wins / d.trades) * 100) : 0,
			};
		});
}

// ─── Weekly P&L ────────────────────────────────────────────────────────────

export interface WeeklyPnl {
	/** ISO week start date "YYYY-MM-DD" (Monday) */
	weekStart: string;
	label: string;
	pnlUsd: number;
	trades: number;
}

/**
 * Group closed trades by ISO week.
 */
export function weeklyPnl(trades: TimeTrade[]): WeeklyPnl[] {
	const closed = filterClosed(trades);
	const groups = new Map<string, { pnl: number; trades: number }>();

	for (const t of closed) {
		const d = new Date(t.closedAt!);
		const monday = getMonday(d);
		const key = isoDate(monday);
		const entry = groups.get(key) ?? { pnl: 0, trades: 0 };
		entry.pnl += t.realizedPnlUsd ?? 0;
		entry.trades += 1;
		groups.set(key, entry);
	}

	return Array.from(groups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([weekStart, d]) => ({
			weekStart,
			label: `Wk ${weekStart.slice(5)}`,
			pnlUsd: r2(d.pnl),
			trades: d.trades,
		}));
}

// ─── Rolling Metrics ───────────────────────────────────────────────────────

export interface RollingPoint {
	tradeIndex: number;
	closedAt: string;
	rollingPnl: number;
	rollingWinRate: number;
	rollingExpectancy: number;
	rollingAvgR: number;
}

/**
 * Compute rolling metrics over a trailing window of N trades.
 * Returns one point per closed trade (once window is filled).
 */
export function rollingMetrics(trades: TimeTrade[], windowSize: number): RollingPoint[] {
	const sorted = filterClosed(trades).sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
	if (sorted.length < windowSize) return [];

	const points: RollingPoint[] = [];

	for (let i = windowSize - 1; i < sorted.length; i++) {
		const window = sorted.slice(i - windowSize + 1, i + 1);
		const pnls = window.map((t) => t.realizedPnlUsd ?? 0);
		const wins = pnls.filter((p) => p > 0).length;
		const totalPnl = pnls.reduce((s, p) => s + p, 0);
		const rValues = window.filter((t) => t.realizedPnlR != null).map((t) => t.realizedPnlR!);
		const avgR = rValues.length > 0 ? rValues.reduce((s, r) => s + r, 0) / rValues.length : 0;

		points.push({
			tradeIndex: i + 1,
			closedAt: sorted[i]!.closedAt!,
			rollingPnl: r2(totalPnl),
			rollingWinRate: r2((wins / windowSize) * 100),
			rollingExpectancy: r2(totalPnl / windowSize),
			rollingAvgR: r2(avgR),
		});
	}

	return points;
}

// ─── Holding Period Analysis ───────────────────────────────────────────────

export interface HoldingBucket {
	label: string;
	/** Bucket order for sorting */
	order: number;
	trades: number;
	avgPnl: number;
	totalPnl: number;
	winPercent: number;
	avgHoldingHours: number;
}

const HOLDING_BUCKETS = [
	{ label: '< 1h', max: 1, order: 0 },
	{ label: '1–4h', max: 4, order: 1 },
	{ label: '4h–1d', max: 24, order: 2 },
	{ label: '1–3d', max: 72, order: 3 },
	{ label: '3–7d', max: 168, order: 4 },
	{ label: '1–2w', max: 336, order: 5 },
	{ label: '2w+', max: Infinity, order: 6 },
] as const;

/**
 * Bucket trades by how long they were held (openedAt → closedAt).
 */
export function holdingPeriodBuckets(trades: TimeTrade[]): HoldingBucket[] {
	const closed = filterClosed(trades);
	const bucketData = HOLDING_BUCKETS.map(() => ({
		pnls: [] as number[],
		hours: [] as number[],
	}));

	for (const t of closed) {
		const hours = (new Date(t.closedAt!).getTime() - new Date(t.openedAt).getTime()) / 3_600_000;
		let prevMax = 0;
		for (let i = 0; i < HOLDING_BUCKETS.length; i++) {
			const bucket = HOLDING_BUCKETS[i]!;
			if (hours >= prevMax && (hours < bucket.max || bucket.max === Infinity)) {
				bucketData[i]!.pnls.push(t.realizedPnlUsd ?? 0);
				bucketData[i]!.hours.push(hours);
				break;
			}
			prevMax = bucket.max;
		}
	}

	return HOLDING_BUCKETS.map((b, i) => {
		const d = bucketData[i]!;
		const wins = d.pnls.filter((p) => p > 0).length;
		const totalPnl = d.pnls.reduce((s, p) => s + p, 0);
		const avgH = d.hours.length > 0 ? d.hours.reduce((s, h) => s + h, 0) / d.hours.length : 0;
		return {
			label: b.label,
			order: b.order,
			trades: d.pnls.length,
			avgPnl: d.pnls.length > 0 ? r2(totalPnl / d.pnls.length) : 0,
			totalPnl: r2(totalPnl),
			winPercent: d.pnls.length > 0 ? r2((wins / d.pnls.length) * 100) : 0,
			avgHoldingHours: r2(avgH),
		};
	}).filter((b) => b.trades > 0);
}

// ─── Trade Frequency ───────────────────────────────────────────────────────

export interface FrequencyPoint {
	/** "YYYY-MM" or week start */
	period: string;
	label: string;
	count: number;
}

/**
 * Count trades opened per month.
 */
export function tradeFrequencyByMonth(trades: TimeTrade[]): FrequencyPoint[] {
	const groups = new Map<string, number>();
	for (const t of trades) {
		if (t.status === 'cancelled') continue;
		const key = t.openedAt.slice(0, 7);
		groups.set(key, (groups.get(key) ?? 0) + 1);
	}
	return Array.from(groups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([period, count]) => {
			const [y, m] = period.split('-');
			return { period, label: `${MONTH_NAMES[Number(m) - 1]} ${y}`, count };
		});
}

/**
 * Count trades opened per week.
 */
export function tradeFrequencyByWeek(trades: TimeTrade[]): FrequencyPoint[] {
	const groups = new Map<string, number>();
	for (const t of trades) {
		if (t.status === 'cancelled') continue;
		const monday = getMonday(new Date(t.openedAt));
		const key = isoDate(monday);
		groups.set(key, (groups.get(key) ?? 0) + 1);
	}
	return Array.from(groups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([period, count]) => ({ period, label: `Wk ${period.slice(5)}`, count }));
}

// ─── Hour × Day Heatmap ────────────────────────────────────────────────────

export interface HeatmapCell {
	day: number; // 0=Mon … 6=Sun
	dayLabel: string;
	hour: number; // 0–23
	hourLabel: string;
	trades: number;
	pnlUsd: number;
	winPercent: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Build a heatmap of P&L by day-of-week × hour-of-day.
 * Uses openedAt timestamp. Day 0 = Monday.
 */
export function hourDayHeatmap(trades: TimeTrade[]): HeatmapCell[] {
	const closed = filterClosed(trades);
	const grid = new Map<string, { pnls: number[] }>();

	for (const t of closed) {
		const d = new Date(t.openedAt);
		// Convert JS getUTCDay (0=Sun) to Mon-based (0=Mon)
		const jsDay = d.getUTCDay();
		const day = jsDay === 0 ? 6 : jsDay - 1;
		const hour = d.getUTCHours();
		const key = `${day}-${hour}`;
		const cell = grid.get(key) ?? { pnls: [] };
		cell.pnls.push(t.realizedPnlUsd ?? 0);
		grid.set(key, cell);
	}

	const cells: HeatmapCell[] = [];
	for (const [key, data] of grid) {
		const [d, h] = key.split('-').map(Number);
		const wins = data.pnls.filter((p) => p > 0).length;
		cells.push({
			day: d!,
			dayLabel: DAY_LABELS[d!]!,
			hour: h!,
			hourLabel: `${String(h).padStart(2, '0')}:00`,
			trades: data.pnls.length,
			pnlUsd: r2(data.pnls.reduce((s, p) => s + p, 0)),
			winPercent: r2((wins / data.pnls.length) * 100),
		});
	}

	return cells.sort((a, b) => a.day - b.day || a.hour - b.hour);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function filterClosed(trades: TimeTrade[]) {
	return trades.filter(
		(t) => t.status === 'closed' && t.realizedPnlUsd != null && t.closedAt != null,
	);
}

function getMonday(d: Date): Date {
	const day = d.getUTCDay();
	const diff = day === 0 ? -6 : 1 - day;
	const monday = new Date(d);
	monday.setUTCDate(monday.getUTCDate() + diff);
	return monday;
}

function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function r2(n: number): number {
	return Math.round(n * 100) / 100;
}
