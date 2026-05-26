/**
 * Calendar P&L — monthly grid view of daily trading results.
 * Win days: Robinhood green (#00C805). Loss days: Robinhood red (#FF5000).
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CalendarDay {
	date: string;
	pnlUsd: number;
	pnlR: number | null;
	tradeCount: number;
	wins: number;
	losses: number;
}

type ViewMode = 'pnl' | 'r';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

// Robinhood palette
const RH_GREEN = '#00C805';
const RH_GREEN_BG = 'rgba(0,200,5,0.09)';
const RH_GREEN_BORDER = 'rgba(0,200,5,0.22)';
const RH_GREEN_HOVER_BG = 'rgba(0,200,5,0.15)';
const RH_GREEN_HOVER_BORDER = 'rgba(0,200,5,0.35)';

const RH_RED = '#FF5000';
const RH_RED_BG = 'rgba(255,80,0,0.09)';
const RH_RED_BORDER = 'rgba(255,80,0,0.22)';
const RH_RED_HOVER_BG = 'rgba(255,80,0,0.15)';
const RH_RED_HOVER_BORDER = 'rgba(255,80,0,0.35)';

/** Format P&L for display in a calendar cell. */
function formatPnl(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1000) {
		return `${value >= 0 ? '+' : '-'}$${(abs / 1000).toFixed(1)}k`;
	}
	return `${value >= 0 ? '+' : '-'}$${abs.toFixed(0)}`;
}

/** Format R-multiple for display. */
function formatR(value: number): string {
	return `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`;
}

interface DayCellProps {
	dayNum: number;
	dateStr: string;
	dayData: CalendarDay | undefined;
	isToday: boolean;
	displayValue: string | null;
}

function DayCell({ dayNum, dateStr, dayData, isToday, displayValue }: DayCellProps) {
	const isWin = dayData && dayData.pnlUsd >= 0;
	const isLoss = dayData && dayData.pnlUsd < 0;

	const cellStyle: React.CSSProperties = {
		backgroundColor: isWin ? RH_GREEN_BG : isLoss ? RH_RED_BG : undefined,
		borderColor: isToday
			? 'rgba(124,92,252,0.6)'
			: isWin
				? RH_GREEN_BORDER
				: isLoss
					? RH_RED_BORDER
					: 'transparent',
	};

	const numColor = isToday
		? 'var(--pk-purple)'
		: isWin
			? RH_GREEN
			: isLoss
				? RH_RED
				: 'var(--pk-white-dim)';

	return (
		<Link
			href={`/journal?date=${dateStr}`}
			className="relative h-[72px] sm:h-[88px] rounded-[4px] p-1.5 sm:p-2 flex flex-col border transition-all duration-150 group"
			style={cellStyle}
			onMouseEnter={(e) => {
				if (isWin) {
					(e.currentTarget as HTMLElement).style.backgroundColor = RH_GREEN_HOVER_BG;
					(e.currentTarget as HTMLElement).style.borderColor = RH_GREEN_HOVER_BORDER;
				} else if (isLoss) {
					(e.currentTarget as HTMLElement).style.backgroundColor = RH_RED_HOVER_BG;
					(e.currentTarget as HTMLElement).style.borderColor = RH_RED_HOVER_BORDER;
				} else {
					(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
					(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
				}
			}}
			onMouseLeave={(e) => {
				(e.currentTarget as HTMLElement).style.backgroundColor = isWin
					? RH_GREEN_BG
					: isLoss
						? RH_RED_BG
						: '';
				(e.currentTarget as HTMLElement).style.borderColor = isToday
					? 'rgba(124,92,252,0.6)'
					: isWin
						? RH_GREEN_BORDER
						: isLoss
							? RH_RED_BORDER
							: 'transparent';
			}}
		>
			<span
				className="text-[13px] sm:text-[12px] font-medium leading-none"
				style={{ color: numColor }}
			>
				{dayNum}
			</span>

			{dayData && (
				<div className="mt-auto space-y-0.5">
					<p
						className="text-[12px] sm:text-[13px] font-semibold font-mono tabular-nums leading-none"
						style={{ color: isWin ? RH_GREEN : RH_RED }}
					>
						{displayValue}
					</p>
					{dayData.tradeCount > 1 && (
						<p className="text-[10px] text-pk-white-dim leading-none">
							{dayData.tradeCount} trades
						</p>
					)}
				</div>
			)}
		</Link>
	);
}

export default function CalendarPage() {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
	const [viewMode, setViewMode] = useState<ViewMode>('pnl');
	const [days, setDays] = useState<CalendarDay[]>([]);
	const [loading, setLoading] = useState(true);

	// Map date string → day data for fast lookup
	const dayMap = new Map(days.map((d) => [d.date, d]));

	// Fetch data for current year/month
	useEffect(() => {
		setLoading(true);
		fetch(`/api/calendar?year=${year}&month=${month}`)
			.then((r) => {
				if (!r.ok) return [];
				return r.json();
			})
			.then((data) => {
				setDays(Array.isArray(data) ? (data as CalendarDay[]) : []);
			})
			.catch(() => setDays([]))
			.finally(() => setLoading(false));
	}, [year, month]);

	// Calendar math
	const firstDay = new Date(year, month - 1, 1);
	const lastDay = new Date(year, month, 0);
	const startOffset = firstDay.getDay(); // 0=Sun
	const totalDays = lastDay.getDate();

	// Build cells array: null = empty leading/trailing cell
	const cells: (number | null)[] = [
		...Array(startOffset).fill(null),
		...Array.from({ length: totalDays }, (_, i) => i + 1),
	];
	while (cells.length % 7 !== 0) cells.push(null);

	// Month navigation
	const prevMonth = () => {
		if (month === 1) {
			setMonth(12);
			setYear((y) => y - 1);
		} else {
			setMonth((m) => m - 1);
		}
	};
	const nextMonth = () => {
		if (month === 12) {
			setMonth(1);
			setYear((y) => y + 1);
		} else {
			setMonth((m) => m + 1);
		}
	};
	const goToToday = () => {
		setYear(now.getFullYear());
		setMonth(now.getMonth() + 1);
	};

	// Month totals
	const totalPnl = days.reduce((s, d) => s + d.pnlUsd, 0);
	const totalR = days.reduce((s, d) => s + (d.pnlR ?? 0), 0);
	const totalTrades = days.reduce((s, d) => s + d.tradeCount, 0);
	const totalWins = days.reduce((s, d) => s + d.wins, 0);
	const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : null;
	const tradingDays = days.length;
	const greenDays = days.filter((d) => d.pnlUsd >= 0).length;

	// Today string for highlighting
	const todayStr = now.toISOString().slice(0, 10);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="eyebrow">calendar</p>
					<h1 className="text-[20px] font-medium text-pk-white mt-1">P&amp;L Calendar</h1>
				</div>

				{/* View mode toggle */}
				<div className="flex items-center gap-1 rounded-[6px] border border-pk-border bg-pk-black-raised p-0.5">
					<button
						type="button"
						onClick={() => setViewMode('pnl')}
						className={cn(
							'px-3 py-1 rounded-[4px] text-[12px] font-medium transition-colors duration-150',
							viewMode === 'pnl'
								? 'bg-pk-purple text-white'
								: 'text-pk-white-dim hover:text-pk-white',
						)}
					>
						P&amp;L $
					</button>
					<button
						type="button"
						onClick={() => setViewMode('r')}
						className={cn(
							'px-3 py-1 rounded-[4px] text-[12px] font-medium transition-colors duration-150',
							viewMode === 'r'
								? 'bg-pk-purple text-white'
								: 'text-pk-white-dim hover:text-pk-white',
						)}
					>
						R
					</button>
				</div>
			</div>

			{/* Month navigation + summary strip */}
			<div className="rounded-[8px] border border-pk-border bg-pk-black-raised p-4">
				<div className="flex items-center justify-between mb-4">
					<button
						type="button"
						onClick={prevMonth}
						className="flex items-center justify-center w-7 h-7 rounded-[6px] text-pk-white-dim hover:text-pk-white hover:bg-pk-black-sunken transition-colors"
						aria-label="Previous month"
					>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
							<path
								d="M9 2L4 7l5 5"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>

					<div className="flex items-center gap-3">
						<h2 className="text-[16px] font-semibold text-pk-white">
							{MONTH_NAMES[month - 1]} {year}
						</h2>
						{(year !== now.getFullYear() || month !== now.getMonth() + 1) && (
							<button
								type="button"
								onClick={goToToday}
								className="text-[13px] sm:text-[11px] text-pk-purple hover:text-pk-purple-bright transition-colors"
							>
								Today
							</button>
						)}
					</div>

					<button
						type="button"
						onClick={nextMonth}
						className="flex items-center justify-center w-7 h-7 rounded-[6px] text-pk-white-dim hover:text-pk-white hover:bg-pk-black-sunken transition-colors"
						aria-label="Next month"
					>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
							<path
								d="M5 2l5 5-5 5"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>

				{/* Summary stats bar */}
				{totalTrades > 0 && (
					<div className="flex flex-wrap gap-4 pb-4 border-b border-pk-border mb-4 text-[12px]">
						<div>
							<span className="text-pk-white-dim">Month P&amp;L </span>
							<span
								className="font-mono font-semibold tabular-nums"
								style={{ color: totalPnl >= 0 ? RH_GREEN : RH_RED }}
							>
								{totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
							</span>
						</div>
						<div>
							<span className="text-pk-white-dim">R Total </span>
							<span
								className="font-mono font-semibold tabular-nums"
								style={{ color: totalR >= 0 ? RH_GREEN : RH_RED }}
							>
								{totalR >= 0 ? '+' : ''}
								{totalR.toFixed(2)}R
							</span>
						</div>
						<div>
							<span className="text-pk-white-dim">Trades </span>
							<span className="text-pk-white font-semibold">{totalTrades}</span>
						</div>
						{winRate !== null && (
							<div>
								<span className="text-pk-white-dim">Win Rate </span>
								<span className="text-pk-white font-semibold">{winRate}%</span>
							</div>
						)}
						<div>
							<span className="text-pk-white-dim">Green Days </span>
							<span className="text-pk-white font-semibold">
								{greenDays}/{tradingDays}
							</span>
						</div>
					</div>
				)}

				{/* Calendar grid */}
				<div className="grid grid-cols-7 gap-px">
					{/* Day headers */}
					{WEEKDAYS.map((day) => (
						<div
							key={day}
							className="py-2 text-center text-[12px] sm:text-[11px] font-medium text-pk-white-dim tracking-wider"
						>
							{day}
						</div>
					))}

					{/* Day cells */}
					{loading
						? Array.from({ length: 35 }).map((_, i) => (
								<div
									key={`skel-${i}`}
									className="h-[72px] sm:h-[88px] rounded-[4px] bg-pk-black-sunken animate-pulse"
								/>
							))
						: cells.map((dayNum, i) => {
								if (dayNum === null) {
									return <div key={`empty-${i}`} className="h-[72px] sm:h-[88px]" />;
								}

								const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
								const dayData = dayMap.get(dateStr);
								const isToday = dateStr === todayStr;
								const displayValue =
									viewMode === 'pnl'
										? dayData
											? formatPnl(dayData.pnlUsd)
											: null
										: dayData?.pnlR != null
											? formatR(dayData.pnlR)
											: null;

								return (
									<DayCell
										key={dateStr}
										dayNum={dayNum}
										dateStr={dateStr}
										dayData={dayData}
										isToday={isToday}
										displayValue={displayValue}
									/>
								);
							})}
				</div>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-6 text-[12px] text-pk-white-dim">
				<div className="flex items-center gap-1.5">
					<div
						className="w-3 h-3 rounded-[2px] border"
						style={{ backgroundColor: RH_GREEN_BG, borderColor: RH_GREEN_BORDER }}
					/>
					<span>Winning day</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div
						className="w-3 h-3 rounded-[2px] border"
						style={{ backgroundColor: RH_RED_BG, borderColor: RH_RED_BORDER }}
					/>
					<span>Losing day</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="w-3 h-3 rounded-[2px] border border-pk-purple/60" />
					<span>Today</span>
				</div>
				<span className="ml-auto text-[13px] sm:text-[11px]">Click any day to view trades</span>
			</div>
		</div>
	);
}
