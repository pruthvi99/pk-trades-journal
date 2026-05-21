/**
 * Slider primitive built on Radix UI Slider.
 * Used for confidence/stress/satisfaction 1-10 inputs.
 */

'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Slider = forwardRef<
	HTMLSpanElement,
	ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SliderPrimitive.Root
		ref={ref}
		className={cn('relative flex w-full touch-none select-none items-center', className)}
		{...props}
	>
		<SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-pk-border">
			<SliderPrimitive.Range className="absolute h-full bg-pk-purple" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-pk-border-strong bg-pk-black-raised shadow transition-colors hover:bg-pk-purple-faint focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.3),0_0_8px_rgba(124,92,252,0.15)] disabled:pointer-events-none disabled:opacity-40" />
	</SliderPrimitive.Root>
));
Slider.displayName = 'Slider';
