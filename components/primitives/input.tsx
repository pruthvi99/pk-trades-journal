/**
 * Input primitive.
 * Dark sunken background, hairline border, purple focus ring.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	/** Apply monospace tabular-nums for numeric inputs */
	numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, numeric, type, ...props }, ref) => {
		return (
			<input
				ref={ref}
				type={type}
				className={cn(
					'flex h-11 sm:h-8 w-full rounded-[6px] border border-pk-border bg-pk-black-sunken px-4 sm:px-3 text-[16px] sm:text-[13px] text-pk-white placeholder:text-pk-white-dim',
					'transition-colors duration-150 ease-out',
					'hover:border-pk-border-strong',
					'focus-visible:outline-none focus-visible:border-pk-purple focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.15),0_0_8px_rgba(124,92,252,0.1)]',
					'disabled:cursor-not-allowed disabled:opacity-40',
					numeric && 'font-mono tabular-nums text-right',
					className,
				)}
				{...props}
			/>
		);
	},
);

Input.displayName = 'Input';
