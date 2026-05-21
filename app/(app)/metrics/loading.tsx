/**
 * Loading skeleton for the metrics page.
 */

export default function MetricsLoading() {
	return (
		<div className="space-y-8 animate-pulse">
			<div>
				<div className="h-3 w-12 bg-pk-border rounded" />
				<div className="h-5 w-32 bg-pk-border rounded mt-2" />
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={`stat-${i}`} className="h-20 bg-pk-border rounded-[6px]" />
				))}
			</div>
			<div className="h-[280px] bg-pk-border rounded-[6px]" />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="h-[200px] bg-pk-border rounded-[6px]" />
				<div className="h-[200px] bg-pk-border rounded-[6px]" />
			</div>
		</div>
	);
}
