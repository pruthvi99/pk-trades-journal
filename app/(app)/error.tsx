/**
 * Error boundary for the authenticated app route group.
 */

'use client';

import { Button } from '@/components/primitives/button';

export default function AppError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-16 space-y-4">
			<p className="text-[14px] text-pk-white-muted">Something went wrong.</p>
			<p className="text-[12px] text-pk-white-dim max-w-md text-center">{error.message}</p>
			<Button variant="ghost" size="small" onClick={reset}>
				Try again
			</Button>
		</div>
	);
}
