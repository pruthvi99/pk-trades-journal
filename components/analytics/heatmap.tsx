/**
 * Heatmap — Day-of-week × Hour-of-day P&L grid.
 * Green for profitable cells, red for losing, intensity proportional to magnitude.
 */

'use client';

interface HeatmapCell {
	day: number;
	dayLabel: string;
	hour: number;
	hourLabel: string;
	trades: number;
	pnlUsd: number;
	winPercent: number;
}

interface Props {
	data: HeatmapCell[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HeatmapChart({ data }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[260px] text-[13px] text-pk-white-dim">
				No trading time data yet.
			</div>
		);
	}

	// Build lookup
	const lookup = new Map<string, HeatmapCell>();
	let maxAbs = 1;
	for (const cell of data) {
		lookup.set(`${cell.day}-${cell.hour}`, cell);
		maxAbs = Math.max(maxAbs, Math.abs(cell.pnlUsd));
	}

	// Only show hours that have at least one trade
	const activeHours = [...new Set(data.map((d) => d.hour))].sort((a, b) => a - b);
	// Expand to fill range
	const minH = Math.max(0, (activeHours[0] ?? 9) - 1);
	const maxH = Math.min(23, (activeHours[activeHours.length - 1] ?? 16) + 1);
	const displayHours = HOURS.filter((h) => h >= minH && h <= maxH);

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse">
				<thead>
					<tr>
						<th className="w-12 text-[11px] text-pk-white-dim font-normal text-left p-1" />
						{displayHours.map((h) => (
							<th
								key={h}
								className="text-[10px] text-pk-white-dim font-normal p-1 text-center min-w-[32px]"
							>
								{String(h).padStart(2, '0')}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{DAY_LABELS.map((dayLabel, dayIdx) => (
						<tr key={dayLabel}>
							<td className="text-[11px] text-pk-white-dim font-normal p-1 pr-2">{dayLabel}</td>
							{displayHours.map((hour) => {
								const cell = lookup.get(`${dayIdx}-${hour}`);
								if (!cell) {
									return (
										<td key={hour} className="p-0.5">
											<div className="w-full h-7 rounded-sm bg-[#111114]" />
										</td>
									);
								}
								const intensity = Math.min(1, Math.abs(cell.pnlUsd) / maxAbs);
								const isPositive = cell.pnlUsd >= 0;
								const bg = isPositive
									? `rgba(34, 197, 94, ${0.15 + intensity * 0.55})`
									: `rgba(239, 68, 68, ${0.15 + intensity * 0.55})`;
								return (
									<td key={hour} className="p-0.5">
										<div
											className="w-full h-7 rounded-sm flex items-center justify-center cursor-default group relative"
											style={{ backgroundColor: bg }}
										>
											<span className="text-[9px] text-white/80 font-mono">{cell.trades}</span>
											{/* Tooltip */}
											<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 pointer-events-none">
												<div className="bg-[#0a0a0c] border border-[#1a1a1f] rounded px-2 py-1 text-[11px] whitespace-nowrap">
													<div className="text-pk-white-dim">
														{dayLabel} {String(hour).padStart(2, '0')}:00
													</div>
													<div className={cell.pnlUsd >= 0 ? 'text-green-400' : 'text-red-400'}>
														${cell.pnlUsd.toLocaleString()} · {cell.trades} trades ·{' '}
														{cell.winPercent}% win
													</div>
												</div>
											</div>
										</div>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
