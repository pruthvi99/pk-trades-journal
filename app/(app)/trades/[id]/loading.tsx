/**
 * Loading skeleton for the trade detail page.
 */

export default function TradeDetailLoading() {
	return (
		<div className="mx-auto max-w-3xl space-y-6 animate-pulse">
			<div className="flex items-start justify-between">
				<div>
					<div className="h-4 w-20 bg-pk-border rounded" />
					<div className="h-7 w-48 bg-pk-border rounded mt-2" />
				</div>
				<div className="h-10 w-32 bg-pk-border rounded" />
			</div>
			<div className="h-px bg-pk-border" />
			<div className="h-10 w-64 bg-pk-border rounded" />
			<div className="space-y-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={`row-${i}`} className="h-16 bg-pk-border rounded-[6px]" />
				))}
			</div>
		</div>
	);
}
