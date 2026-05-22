/**
 * RollingMetricsChart — multi-line chart showing rolling win rate,
 * expectancy, and avg R over a trailing window of trades.
 */

'use client';

import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface RollingPoint {
	tradeIndex: number;
	closedAt: string;
	rollingPnl: number;
	rollingWinRate: number;
	rollingExpectancy: number;
	rollingAvgR: number;
}

interface Props {
	data: RollingPoint[];
	windowSize: number;
	/** Which metric to show: 'winRate' | 'expectancy' | 'avgR' | 'pnl' */
	metric: 'winRate' | 'expectancy' | 'avgR' | 'pnl';
}

const METRIC_CONFIG = {
	winRate: {
		key: 'rollingWinRate' as const,
		label: 'Win Rate %',
		color: '#7c5cfc',
		formatter: (v: number) => `${v}%`,
	},
	expectancy: {
		key: 'rollingExpectancy' as const,
		label: 'Expectancy $',
		color: '#22c55e',
		formatter: (v: number) => `$${v.toLocaleString()}`,
	},
	avgR: {
		key: 'rollingAvgR' as const,
		label: 'Avg R',
		color: '#f59e0b',
		formatter: (v: number) => `${v.toFixed(2)}R`,
	},
	pnl: {
		key: 'rollingPnl' as const,
		label: 'Total P&L',
		color: '#22c55e',
		formatter: (v: number) => `$${v.toLocaleString()}`,
	},
};

export function RollingMetricsChart({ data, windowSize, metric }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[220px] text-[13px] text-pk-white-dim">
				Need at least {windowSize} closed trades for rolling metrics.
			</div>
		);
	}

	const config = METRIC_CONFIG[metric];

	return (
		<ResponsiveContainer width="100%" height={220}>
			<LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
					width={60}
					tickFormatter={config.formatter}
				/>
				<Tooltip
					contentStyle={{
						background: '#0a0a0c',
						border: '1px solid #1a1a1f',
						borderRadius: 6,
						fontSize: 12,
						color: '#ece8f2',
					}}
					formatter={(value) => [config.formatter(Number(value)), config.label]}
					labelFormatter={(label) => `Trade #${label}`}
				/>
				<Legend wrapperStyle={{ fontSize: 11, color: '#6e687a' }} />
				<Line
					type="monotone"
					dataKey={config.key}
					name={`${config.label} (${windowSize}-trade)`}
					stroke={config.color}
					strokeWidth={2}
					dot={false}
					activeDot={{ r: 3, fill: config.color, stroke: '#0a0a0c', strokeWidth: 2 }}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}
