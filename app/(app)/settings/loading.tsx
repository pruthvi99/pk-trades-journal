/**
 * Loading skeleton for the settings page.
 */

export default function SettingsLoading() {
	return (
		<div className="mx-auto max-w-2xl space-y-10 animate-pulse">
			<div>
				<div className="h-3 w-12 bg-pk-border rounded" />
				<div className="h-5 w-24 bg-pk-border rounded mt-2" />
			</div>
			<div className="space-y-4">
				<div className="h-3 w-16 bg-pk-border rounded" />
				<div className="grid grid-cols-2 gap-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={`input-${i}`} className="h-14 bg-pk-border rounded-[6px]" />
					))}
				</div>
			</div>
			<div className="space-y-4">
				<div className="h-3 w-20 bg-pk-border rounded" />
				<div className="h-32 bg-pk-border rounded-[6px]" />
			</div>
		</div>
	);
}
