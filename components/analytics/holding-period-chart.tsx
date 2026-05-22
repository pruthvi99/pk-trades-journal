/**
 * HoldingPeriodChart — bucketed bar chart showing P&L by how long trades were held.
 */

'use client';

import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface HoldingBucket {
	label: string;
	order: number;
	trades: number;
	avgPnl: number;
	totalPnl: number;
	winPercent: number;
	avgHoldingHours: number;
}

interface Props {
	data: HoldingBucket[];
}

export function HoldingPeriodChart({ data }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[220px] text-[13px] text-pk-white-dim">
				No holding period data yet.
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={220}>
			<BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<CartesianGrid stroke="#1a1a1f" strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="label"
					tick={{ fill: '#6e687a', fontSize: 10 }}
					tickLine={false}
					axisLine={{ stroke: '#1a1a1f' }}
				/>
				<YAxis
					tick={{ fill: '#6e687a', fontSize: 11 }}
					tickLine={false}
					axisLine={false}
					width={60}
					tickFormatter={(v: number) => `$${v.toLocaleString()}`}
				/>
				<Tooltip
					contentStyle={{
						background: '#0a0a0c',
						border: '1px solid #1a1a1f',
						borderRadius: 6,
						fontSize: 12,
						color: '#ece8f2',
					}}
					formatter={(_value, _name, entry) => {
						const d = (entry as { payload: HoldingBucket }).payload;
						const avgHrs = d.avgHoldingHours;
						const hrsLabel =
							avgHrs < 1
								? `${Math.round(avgHrs * 60)}m`
								: avgHrs < 24
									? `${avgHrs.toFixed(1)}h`
									: `${(avgHrs / 24).toFixed(1)}d`;
						return [
							`$${d.avgPnl} avg | ${d.trades} trades | ${d.winPercent}% win | ~${hrsLabel} avg hold`,
							d.label,
						];
					}}
				/>
				<Bar dataKey="avgPnl" radius={[3, 3, 0, 0]} maxBarSize={48}>
					{data.map((entry) => (
						<Cell
							key={entry.label}
							fill={entry.avgPnl >= 0 ? '#22c55e' : '#ef4444'}
							fillOpacity={0.85}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
