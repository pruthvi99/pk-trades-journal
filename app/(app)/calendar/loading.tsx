/** Loading skeleton for calendar page. */
export default function CalendarLoading() {
	return (
		<div className="space-y-6">
			<div className="h-8 w-48 rounded-[6px] bg-pk-black-raised animate-pulse" />
			<div className="rounded-[8px] border border-pk-border bg-pk-black-raised p-4 space-y-4">
				<div className="flex items-center justify-between">
					<div className="h-6 w-6 rounded bg-pk-black-sunken animate-pulse" />
					<div className="h-6 w-36 rounded bg-pk-black-sunken animate-pulse" />
					<div className="h-6 w-6 rounded bg-pk-black-sunken animate-pulse" />
				</div>
				<div className="grid grid-cols-7 gap-px">
					{Array.from({ length: 35 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-[88px] rounded-[4px] bg-pk-black-sunken animate-pulse"
						/>
					))}
				</div>
			</div>
		</div>
	);
}
