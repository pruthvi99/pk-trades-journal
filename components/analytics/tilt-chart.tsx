/**
 * TiltChart — shows win rate after N consecutive wins or losses.
 * Detects if performance degrades after streaks (tilt/overconfidence).
 */

'use client';

import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface TiltPoint {
	label: string;
	streakType: 'win' | 'loss';
	streakLength: number;
	nextTrades: number;
	nextWinPercent: number;
	nextAvgPnl: number;
}

interface Props {
	data: TiltPoint[];
	overallWinRate: number;
}

export function TiltChart({ data, overallWinRate }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[220px] text-[13px] text-pk-white-dim">
				Need more trades to detect tilt patterns.
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={240}>
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
					width={50}
					tickFormatter={(v: number) => `${v}%`}
					domain={[0, 100]}
				/>
				{/* Overall win rate reference line */}
				<ReferenceLine
					y={overallWinRate}
					stroke="#6e687a"
					strokeDasharray="4 4"
					strokeWidth={1}
					label={{
						value: `Avg ${overallWinRate}%`,
						position: 'right',
						fill: '#6e687a',
						fontSize: 10,
					}}
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
						const d = (entry as { payload: TiltPoint }).payload;
						const diff = d.nextWinPercent - overallWinRate;
						const diffLabel = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
						return [
							`${d.nextWinPercent}% win (${diffLabel} vs avg) | ${d.nextTrades} trades | $${d.nextAvgPnl} avg`,
							d.label,
						];
					}}
				/>
				<Bar dataKey="nextWinPercent" radius={[3, 3, 0, 0]} maxBarSize={40}>
					{data.map((entry) => (
						<Cell
							key={entry.label}
							fill={entry.streakType === 'win' ? '#22c55e' : '#ef4444'}
							fillOpacity={0.75}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
