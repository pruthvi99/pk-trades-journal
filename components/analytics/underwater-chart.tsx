/**
 * UnderwaterChart — area chart showing drawdown depth over time.
 * Red fill below zero line indicates periods underwater.
 */

'use client';

import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface UnderwaterPoint {
	tradeIndex: number;
	closedAt: string;
	drawdownUsd: number;
	drawdownPercent: number;
}

interface Props {
	data: UnderwaterPoint[];
}

export function UnderwaterChart({ data }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[220px] text-[13px] text-pk-white-dim">
				No drawdown data yet.
			</div>
		);
	}

	// Prepend zero point
	const chartData = [{ tradeIndex: 0, closedAt: '', drawdownUsd: 0, drawdownPercent: 0 }, ...data];

	return (
		<ResponsiveContainer width="100%" height={220}>
			<AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<defs>
					<linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#ef4444" stopOpacity={0.05} />
						<stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke="#1a1a1f" strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="tradeIndex"
					tick={{ fill: '#6e687a', fontSize: 10 }}
					tickLine={false}
					axisLine={{ stroke: '#1a1a1f' }}
					label={{
						value: 'Trade #',
						position: 'insideBottomRight',
						offset: -4,
						fill: '#6e687a',
						fontSize: 10,
					}}
				/>
				<YAxis
					tick={{ fill: '#6e687a', fontSize: 11 }}
					tickLine={false}
					axisLine={false}
					width={70}
					tickFormatter={(v: number) => `$${v.toLocaleString()}`}
				/>
				<ReferenceLine y={0} stroke="#2a2a2f" strokeWidth={1} />
				<Tooltip
					contentStyle={{
						background: '#0a0a0c',
						border: '1px solid #1a1a1f',
						borderRadius: 6,
						fontSize: 12,
						color: '#ece8f2',
					}}
					formatter={(value, _name, entry) => {
						const pct = (entry as { payload: UnderwaterPoint }).payload.drawdownPercent;
						return [`$${Number(value).toLocaleString()} (${pct}%)`, 'Drawdown'];
					}}
					labelFormatter={(label) => (label === 0 ? 'Start' : `Trade #${label}`)}
				/>
				<Area
					type="monotone"
					dataKey="drawdownUsd"
					stroke="#ef4444"
					strokeWidth={1.5}
					fill="url(#ddGradient)"
					dot={false}
					activeDot={{ r: 3, fill: '#ef4444', stroke: '#0a0a0c', strokeWidth: 2 }}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
