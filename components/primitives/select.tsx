/**
 * Select primitive built on Radix UI Select.
 * Styled to match the input primitive.
 */

'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(
			'flex h-8 w-full items-center justify-between rounded-[6px] border border-pk-border bg-pk-black-sunken px-3 text-[13px] text-pk-white',
			'transition-colors duration-150 ease-out',
			'hover:border-pk-border-strong',
			'focus-visible:outline-none focus-visible:border-pk-purple focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.15),0_0_8px_rgba(124,92,252,0.1)]',
			'disabled:cursor-not-allowed disabled:opacity-40',
			'[&>span]:line-clamp-1',
			className,
		)}
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			<svg
				aria-hidden="true"
				width="12"
				height="12"
				viewBox="0 0 12 12"
				fill="none"
				className="ml-2 shrink-0 opacity-50"
			>
				<path
					d="M3 4.5L6 7.5L9 4.5"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			ref={ref}
			position={position}
			className={cn(
				'relative z-50 max-h-[300px] min-w-[8rem] overflow-hidden rounded-[6px] border border-pk-border bg-pk-black-raised shadow-lg',
				'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
				position === 'popper' && 'translate-y-1',
				className,
			)}
			{...props}
		>
			<SelectPrimitive.Viewport
				className={cn(
					'p-1',
					position === 'popper' &&
						'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex w-full cursor-pointer select-none items-center rounded-[4px] py-1.5 px-2 text-[13px] text-pk-white-muted outline-none',
			'hover:bg-pk-purple-faint hover:text-pk-white',
			'focus:bg-pk-purple-faint focus:text-pk-white',
			'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
			className,
		)}
		{...props}
	>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

export const SelectLabel = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		className={cn(
			'px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-pk-white-dim',
			className,
		)}
		{...props}
	/>
));
SelectLabel.displayName = 'SelectLabel';

export const SelectSeparator = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Separator
		ref={ref}
		className={cn('-mx-1 my-1 h-px bg-pk-border', className)}
		{...props}
	/>
));
SelectSeparator.displayName = 'SelectSeparator';
