/**
 * Loading skeleton for the journal page.
 */

export default function JournalLoading() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="flex items-center justify-between">
				<div>
					<div className="h-3 w-12 bg-pk-border rounded" />
					<div className="h-5 w-32 bg-pk-border rounded mt-2" />
				</div>
				<div className="flex gap-2">
					<div className="h-8 w-16 bg-pk-border rounded" />
					<div className="h-8 w-24 bg-pk-border rounded" />
				</div>
			</div>
			<div className="flex gap-2">
				<div className="h-8 w-24 bg-pk-border rounded" />
				<div className="h-8 w-28 bg-pk-border rounded" />
				<div className="h-8 w-32 bg-pk-border rounded" />
			</div>
			<div className="space-y-1">
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={`skel-${i}`} className="h-8 bg-pk-border rounded" />
				))}
			</div>
		</div>
	);
}
