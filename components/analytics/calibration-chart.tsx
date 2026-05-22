/**
 * CalibrationChart — confidence bins vs actual win rate.
 * Shows if trader is well-calibrated (high confidence = high win rate).
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

interface CalibrationBin {
	label: string;
	minConf: number;
	maxConf: number;
	trades: number;
	actualWinPercent: number;
	avgPnl: number;
	avgR: number;
}

interface Props {
	data: CalibrationBin[];
}

export function CalibrationChart({ data }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[220px] text-[13px] text-pk-white-dim">
				Log pre-trade confidence to see calibration data.
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={220}>
			<BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<CartesianGrid stroke="#1a1a1f" strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="label"
					tick={{ fill: '#6e687a', fontSize: 11 }}
					tickLine={false}
					axisLine={{ stroke: '#1a1a1f' }}
					label={{
						value: 'Confidence Level',
						position: 'insideBottom',
						offset: -2,
						fill: '#6e687a',
						fontSize: 10,
					}}
				/>
				<YAxis
					tick={{ fill: '#6e687a', fontSize: 11 }}
					tickLine={false}
					axisLine={false}
					width={50}
					tickFormatter={(v: number) => `${v}%`}
					domain={[0, 100]}
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
						const d = (entry as { payload: CalibrationBin }).payload;
						return [
							`${d.actualWinPercent}% win | ${d.trades} trades | $${d.avgPnl} avg P&L | ${d.avgR}R avg`,
							`Confidence ${d.label}`,
						];
					}}
				/>
				<Bar dataKey="actualWinPercent" radius={[3, 3, 0, 0]} maxBarSize={56}>
					{data.map((entry) => {
						// Gradient: low confidence = dimmer, high = brighter
						const opacity = 0.5 + (entry.maxConf / 10) * 0.5;
						return <Cell key={entry.label} fill="#7c5cfc" fillOpacity={opacity} />;
					})}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
