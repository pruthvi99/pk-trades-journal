/**
 * EquityChart — full-width equity curve using Recharts.
 * Three-color palette only: black background, white line, purple for drawdown fill.
 */

'use client';

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface EquityPoint {
	tradeIndex: number;
	closedAt: string;
	cumulativePnl: number;
	equity: number;
}

interface EquityChartProps {
	data: EquityPoint[];
	startingBalance: number;
}

export function EquityChart({ data, startingBalance }: EquityChartProps) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[280px] text-[13px] text-pk-white-dim">
				Close some trades to see the equity curve.
			</div>
		);
	}

	// Prepend starting point
	const chartData = [
		{ tradeIndex: 0, closedAt: '', cumulativePnl: 0, equity: startingBalance },
		...data,
	];

	return (
		<ResponsiveContainer width="100%" height={280}>
			<AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<defs>
					<linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.2} />
						<stop offset="100%" stopColor="#7c5cfc" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke="#1a1a1f" strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="tradeIndex"
					tick={{ fill: '#6e687a', fontSize: 11 }}
					tickLine={false}
					axisLine={{ stroke: '#1a1a1f' }}
					label={{
						value: 'Trade #',
						position: 'insideBottomRight',
						offset: -4,
						fill: '#6e687a',
						fontSize: 11,
					}}
				/>
				<YAxis
					tick={{ fill: '#6e687a', fontSize: 11 }}
					tickLine={false}
					axisLine={false}
					tickFormatter={(v: number) => `$${v.toLocaleString()}`}
					width={80}
				/>
				<Tooltip
					contentStyle={{
						background: '#0a0a0c',
						border: '1px solid #1a1a1f',
						borderRadius: 6,
						fontSize: 12,
						color: '#ece8f2',
					}}
					formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Equity']}
					labelFormatter={(label) => (label === 0 || label === '0' ? 'Start' : `Trade #${label}`)}
				/>
				<Area
					type="monotone"
					dataKey="equity"
					stroke="#7c5cfc"
					strokeWidth={2}
					fill="url(#equityGradient)"
					dot={false}
					activeDot={{ r: 4, fill: '#9b82ff', stroke: '#0a0a0c', strokeWidth: 2 }}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
