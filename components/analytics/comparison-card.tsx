/**
 * ComparisonCard — side-by-side metric comparison.
 * Used for comparing "followed plan" vs "deviated", "revenge" vs "normal", etc.
 */

interface Props {
	title: string;
	left: {
		label: string;
		value: string;
		subtext?: string;
		trades?: number;
	};
	right: {
		label: string;
		value: string;
		subtext?: string;
		trades?: number;
	};
	/** Highlight left if better, right if better, or none */
	betterSide?: 'left' | 'right' | 'none';
}

export function ComparisonCard({ title, left, right, betterSide = 'none' }: Props) {
	const leftColor =
		betterSide === 'left'
			? 'text-green-400'
			: betterSide === 'right'
				? 'text-red-400'
				: 'text-pk-white';
	const rightColor =
		betterSide === 'right'
			? 'text-green-400'
			: betterSide === 'left'
				? 'text-red-400'
				: 'text-pk-white';

	return (
		<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4">
			<p className="text-[12px] sm:text-[11px] text-pk-white-dim font-medium uppercase tracking-wider mb-3">
				{title}
			</p>
			<div className="grid grid-cols-2 gap-4">
				<div>
					<p className="text-[11px] text-pk-white-dim mb-1">{left.label}</p>
					<p className={`text-[20px] font-mono font-medium tabular-nums ${leftColor}`}>
						{left.value}
					</p>
					{left.subtext && <p className="text-[11px] text-pk-white-dim mt-0.5">{left.subtext}</p>}
					{left.trades != null && (
						<p className="text-[10px] text-[#555] mt-0.5">{left.trades} trades</p>
					)}
				</div>
				<div>
					<p className="text-[11px] text-pk-white-dim mb-1">{right.label}</p>
					<p className={`text-[20px] font-mono font-medium tabular-nums ${rightColor}`}>
						{right.value}
					</p>
					{right.subtext && <p className="text-[11px] text-pk-white-dim mt-0.5">{right.subtext}</p>}
					{right.trades != null && (
						<p className="text-[10px] text-[#555] mt-0.5">{right.trades} trades</p>
					)}
				</div>
			</div>
		</div>
	);
}
