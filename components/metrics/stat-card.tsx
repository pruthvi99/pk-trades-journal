/**
 * StatCard — compact metric card for headline stats.
 * Renders label + value + optional suffix.
 */

interface StatCardProps {
	label: string;
	value: string | number;
	suffix?: string;
	/** Color the value: 'win' for white, 'loss' for purple, 'neutral' for muted */
	variant?: 'win' | 'loss' | 'neutral';
}

export function StatCard({ label, value, suffix, variant = 'neutral' }: StatCardProps) {
	const valueColor =
		variant === 'win'
			? 'text-pk-white'
			: variant === 'loss'
				? 'text-pk-purple'
				: 'text-pk-white-muted';

	return (
		<div className="rounded-[6px] border border-pk-border bg-pk-black-raised px-4 py-3">
			<p className="text-[12px] sm:text-[11px] text-pk-white-dim font-medium uppercase tracking-wider">
				{label}
			</p>
			<p className={`text-[20px] font-medium font-mono tabular-nums mt-1 ${valueColor}`}>
				{value}
				{suffix && <span className="text-[13px] text-pk-white-dim ml-1">{suffix}</span>}
			</p>
		</div>
	);
}
