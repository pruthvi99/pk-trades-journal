/**
 * MonthlyGrid — year-at-a-glance P&L grid (GitHub contributions style).
 * Each cell is a month, colored by P&L magnitude.
 */

'use client';

interface MonthlyGridCell {
	year: number;
	month: number;
	label: string;
	pnlUsd: number;
	trades: number;
}

interface Props {
	data: MonthlyGridCell[];
}

const MONTH_ABBR = [
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

export function MonthlyGrid({ data }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[120px] text-[13px] text-pk-white-dim">
				No monthly data yet.
			</div>
		);
	}

	// Group by year
	const years = [...new Set(data.map((d) => d.year))].sort();
	const lookup = new Map(data.map((d) => [`${d.year}-${d.month}`, d]));
	let maxAbs = 1;
	for (const d of data) {
		maxAbs = Math.max(maxAbs, Math.abs(d.pnlUsd));
	}

	return (
		<div className="space-y-3">
			{years.map((year) => (
				<div key={year}>
					<div className="text-[11px] text-pk-white-dim mb-1.5 font-mono">{year}</div>
					<div className="grid grid-cols-12 gap-1">
						{MONTH_ABBR.map((abbr, idx) => {
							const cell = lookup.get(`${year}-${idx + 1}`);
							if (!cell) {
								return (
									<div key={abbr} className="flex flex-col items-center">
										<div className="w-full h-8 rounded bg-[#111114] flex items-center justify-center">
											<span className="text-[9px] text-[#333]">—</span>
										</div>
										<span className="text-[9px] text-[#444] mt-0.5">{abbr}</span>
									</div>
								);
							}
							const intensity = Math.min(1, Math.abs(cell.pnlUsd) / maxAbs);
							const isPositive = cell.pnlUsd >= 0;
							const bg = isPositive
								? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
								: `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
							return (
								<div key={abbr} className="flex flex-col items-center group relative">
									<div
										className="w-full h-8 rounded flex items-center justify-center cursor-default"
										style={{ backgroundColor: bg }}
									>
										<span className="text-[10px] text-white/90 font-mono">
											{cell.pnlUsd >= 0 ? '+' : ''}
											{Math.round(cell.pnlUsd)}
										</span>
									</div>
									<span className="text-[9px] text-[#666] mt-0.5">{abbr}</span>
									{/* Tooltip */}
									<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 pointer-events-none">
										<div className="bg-[#0a0a0c] border border-[#1a1a1f] rounded px-2 py-1 text-[11px] whitespace-nowrap">
											<div className="text-pk-white-dim">{cell.label}</div>
											<div className={cell.pnlUsd >= 0 ? 'text-green-400' : 'text-red-400'}>
												${cell.pnlUsd.toLocaleString()} · {cell.trades} trades
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
