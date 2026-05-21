/**
 * Toggle (switch) primitive built on Radix UI Switch.
 * Used for boolean settings like dark mode, notifications, etc.
 */

'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Toggle = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitive.Root
		ref={ref}
		className={cn(
			'peer inline-flex h-7 w-12 sm:h-5 sm:w-9 shrink-0 cursor-pointer items-center rounded-full border border-pk-border bg-pk-black-sunken',
			'transition-colors duration-150 ease-out',
			'hover:border-pk-border-strong',
			'focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.3),0_0_8px_rgba(124,92,252,0.15)]',
			'disabled:cursor-not-allowed disabled:opacity-40',
			'data-[state=checked]:bg-pk-purple data-[state=checked]:border-pk-purple',
			className,
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				'pointer-events-none block h-5 w-5 sm:h-3.5 sm:w-3.5 rounded-full bg-pk-white-muted shadow-sm',
				'transition-transform duration-150 ease-out',
				'data-[state=checked]:translate-x-[22px] sm:data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-white',
				'data-[state=unchecked]:translate-x-[3px] sm:data-[state=unchecked]:translate-x-[2px]',
			)}
		/>
	</SwitchPrimitive.Root>
));
Toggle.displayName = 'Toggle';
