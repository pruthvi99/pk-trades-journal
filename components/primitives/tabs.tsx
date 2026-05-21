/**
 * Tabs primitive built on Radix UI Tabs.
 * Underline-style active indicator with purple accent.
 */

'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		className={cn('inline-flex items-center gap-1 border-b border-pk-border', className)}
		{...props}
	/>
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			'inline-flex items-center justify-center whitespace-nowrap px-3 pb-2 pt-1.5 text-[13px] font-medium text-pk-white-muted',
			'border-b-2 border-transparent -mb-px',
			'transition-colors duration-150 ease-out',
			'hover:text-pk-white',
			'focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.3),0_0_8px_rgba(124,92,252,0.15)]',
			'disabled:pointer-events-none disabled:opacity-40',
			'data-[state=active]:border-pk-purple data-[state=active]:text-pk-white',
			className,
		)}
		{...props}
	/>
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn('mt-4 focus-visible:outline-none', className)}
		{...props}
	/>
));
TabsContent.displayName = 'TabsContent';
