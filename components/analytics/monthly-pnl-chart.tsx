/**
 * MonthlyPnlChart — bar chart showing P&L per month.
 * Green bars for profitable months, red for losing months.
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

interface MonthlyPnl {
	month: string;
	label: string;
	pnlUsd: number;
	trades: number;
	wins: number;
	losses: number;
	winPercent: number;
}

interface Props {
	data: MonthlyPnl[];
}

export function MonthlyPnlChart({ data }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[260px] text-[13px] text-pk-white-dim">
				No monthly data yet.
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={260}>
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
					tickFormatter={(v: number) => `$${v.toLocaleString()}`}
					width={70}
				/>
				<Tooltip
					contentStyle={{
						background: '#0a0a0c',
						border: '1px solid #1a1a1f',
						borderRadius: 6,
						fontSize: 12,
						color: '#ece8f2',
					}}
					formatter={(value, _name, entry) => {
						const d = (entry as { payload: MonthlyPnl }).payload;
						return [
							`$${Number(value).toLocaleString()} | ${d.trades} trades | ${d.winPercent}% win`,
							'P&L',
						];
					}}
				/>
				<Bar dataKey="pnlUsd" radius={[3, 3, 0, 0]} maxBarSize={48}>
					{data.map((entry) => (
						<Cell
							key={entry.month}
							fill={entry.pnlUsd >= 0 ? '#22c55e' : '#ef4444'}
							fillOpacity={0.85}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
