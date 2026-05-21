/**
 * Button primitive.
 * Three variants: primary (purple), secondary (border), ghost (no border).
 * Two sizes: default (32px), small (28px).
 * No rounded-2xl. Radius is 6px.
 */

import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
	size?: 'default' | 'small';
	asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'primary', size = 'default', asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';

		return (
			<Comp
				ref={ref}
				className={cn(
					// Base
					'inline-flex items-center justify-center gap-2 font-medium transition-colors',
					'focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.3),0_0_8px_rgba(124,92,252,0.15)]',
					'disabled:pointer-events-none disabled:opacity-40',
					// Size
					size === 'default' && 'h-11 sm:h-8 px-4 sm:px-3 text-[15px] sm:text-[13px] rounded-[6px]',
					size === 'small' && 'h-9 sm:h-7 px-3 sm:px-2.5 text-[14px] sm:text-[12px] rounded-[5px]',
					// Variant
					variant === 'primary' &&
						'bg-pk-purple text-white hover:bg-pk-purple-bright active:bg-pk-purple-deep',
					variant === 'secondary' &&
						'border border-pk-border bg-transparent text-pk-white hover:border-pk-border-strong hover:text-pk-white active:bg-pk-purple-faint',
					variant === 'ghost' &&
						'bg-transparent text-pk-white-muted hover:text-pk-white hover:bg-pk-purple-faint active:bg-pk-purple-faint',
					variant === 'danger' &&
						'bg-transparent border border-red-900/40 text-red-400 hover:bg-red-950/30 hover:border-red-800/50',
					className,
				)}
				{...props}
			/>
		);
	},
);

Button.displayName = 'Button';
