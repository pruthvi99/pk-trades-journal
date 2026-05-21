/**
 * RHistogram — R-multiple distribution bar chart.
 * Wins (positive R) are white, losses (negative R) are purple.
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

interface RHistogramProps {
	rValues: number[];
}

/** Bucket R values into histogram bins. */
function bucketize(values: number[]): Array<{ range: string; count: number; isPositive: boolean }> {
	if (values.length === 0) return [];

	// Create bins from floor(min) to ceil(max) in 0.5R increments
	const min = Math.floor(Math.min(...values) * 2) / 2;
	const max = Math.ceil(Math.max(...values) * 2) / 2;

	const bins: Array<{ range: string; count: number; isPositive: boolean }> = [];
	for (let lo = min; lo < max; lo += 0.5) {
		const hi = lo + 0.5;
		const count = values.filter((v) => v >= lo && v < hi).length;
		if (count > 0) {
			bins.push({
				range: `${lo >= 0 ? '+' : ''}${lo.toFixed(1)}R`,
				count,
				isPositive: lo >= 0,
			});
		}
	}

	return bins;
}

export function RHistogram({ rValues }: RHistogramProps) {
	if (rValues.length === 0) {
		return (
			<div className="flex items-center justify-center h-[200px] text-[13px] text-pk-white-dim">
				No R-multiples to display.
			</div>
		);
	}

	const data = bucketize(rValues);

	return (
		<ResponsiveContainer width="100%" height={200}>
			<BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<CartesianGrid stroke="#1a1a1f" strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="range"
					tick={{ fill: '#6e687a', fontSize: 10 }}
					tickLine={false}
					axisLine={{ stroke: '#1a1a1f' }}
				/>
				<YAxis
					tick={{ fill: '#6e687a', fontSize: 11 }}
					tickLine={false}
					axisLine={false}
					allowDecimals={false}
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
				<Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
					{data.map((entry) => (
						<Cell
							key={entry.range}
							fill={entry.isPositive ? '#ece8f2' : '#7c5cfc'}
							fillOpacity={0.85}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
