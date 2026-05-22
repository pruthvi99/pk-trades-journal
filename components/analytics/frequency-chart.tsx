/**
 * FrequencyChart — bar chart showing trade count over time (weekly or monthly).
 */

'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface FrequencyPoint {
	period: string;
	label: string;
	count: number;
}

interface Props {
	data: FrequencyPoint[];
}

export function FrequencyChart({ data }: Props) {
	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[180px] text-[13px] text-pk-white-dim">
				No frequency data yet.
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={180}>
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
					allowDecimals={false}
					width={30}
				/>
				<Tooltip
					contentStyle={{
						background: '#0a0a0c',
						border: '1px solid #1a1a1f',
						borderRadius: 6,
						fontSize: 12,
						color: '#ece8f2',
					}}
					formatter={(value) => [value, 'Trades']}
				/>
				<Bar
					dataKey="count"
					fill="#7c5cfc"
					fillOpacity={0.6}
					radius={[3, 3, 0, 0]}
					maxBarSize={32}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
