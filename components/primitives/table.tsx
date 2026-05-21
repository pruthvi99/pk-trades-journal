/**
 * Table primitives for dense data display.
 * Minimal styling: hairline borders, compact rows, monospace numbers.
 */

import {
	forwardRef,
	type HTMLAttributes,
	type TdHTMLAttributes,
	type ThHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

/** Scrollable table wrapper. */
export const TableWrapper = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn('w-full overflow-auto rounded-[6px] border border-pk-border', className)}
			{...props}
		/>
	),
);
TableWrapper.displayName = 'TableWrapper';

/** Root <table> element. */
export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
	({ className, ...props }, ref) => (
		<table ref={ref} className={cn('w-full caption-bottom text-[13px]', className)} {...props} />
	),
);
Table.displayName = 'Table';

/** <thead> element. */
export const TableHeader = forwardRef<
	HTMLTableSectionElement,
	HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

/** <tbody> element. */
export const TableBody = forwardRef<
	HTMLTableSectionElement,
	HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

/** <tfoot> element. */
export const TableFooter = forwardRef<
	HTMLTableSectionElement,
	HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tfoot
		ref={ref}
		className={cn('border-t border-pk-border bg-pk-black-sunken font-medium', className)}
		{...props}
	/>
));
TableFooter.displayName = 'TableFooter';

/** <tr> element. */
export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
	({ className, ...props }, ref) => (
		<tr
			ref={ref}
			className={cn(
				'border-b border-pk-border transition-colors',
				'hover:bg-pk-black-raised',
				'data-[state=selected]:bg-pk-purple-faint',
				className,
			)}
			{...props}
		/>
	),
);
TableRow.displayName = 'TableRow';

/** <th> header cell. */
export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<th
			ref={ref}
			className={cn(
				'h-8 px-3 text-left align-middle text-[11px] font-medium uppercase tracking-wider text-pk-white-dim',
				'[&:has([role=checkbox])]:pr-0',
				className,
			)}
			{...props}
		/>
	),
);
TableHead.displayName = 'TableHead';

/** <td> data cell. */
export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<td
			ref={ref}
			className={cn(
				'h-10 px-3 align-middle text-pk-white-muted',
				'[&:has([role=checkbox])]:pr-0',
				className,
			)}
			{...props}
		/>
	),
);
TableCell.displayName = 'TableCell';

/** Table caption. */
export const TableCaption = forwardRef<
	HTMLTableCaptionElement,
	HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
	<caption ref={ref} className={cn('mt-2 text-[12px] text-pk-white-dim', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';
