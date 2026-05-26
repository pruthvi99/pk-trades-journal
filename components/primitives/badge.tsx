/**
 * Badge primitive.
 * Used for status indicators, tags, and labels.
 */

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	variant?: 'default' | 'win' | 'loss' | 'open' | 'muted' | 'mistake';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-[4px] px-2 sm:px-1.5 py-1 sm:py-0.5 text-[13px] sm:text-[11px] font-medium leading-none',
				variant === 'default' && 'bg-pk-purple-faint text-pk-purple-bright',
				variant === 'win' && 'bg-pk-purple-faint text-pk-white',
				variant === 'loss' && 'bg-pk-purple-faint text-pk-purple',
				variant === 'open' && 'border border-pk-border text-pk-white-muted',
				variant === 'muted' && 'bg-pk-black-sunken text-pk-white-dim',
				variant === 'mistake' && 'bg-red-500/10 text-red-400',
				className,
			)}
			{...props}
		/>
	);
}
