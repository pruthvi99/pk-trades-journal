/**
 * Custom DateTime picker — dark-themed, modern, matches app design.
 * Uses Radix Popover for the dropdown, custom calendar grid, scroll-snap time selectors.
 * Replaces native `<input type="datetime-local">` which is inconsistent across browsers.
 */

'use client';

import * as Popover from '@radix-ui/react-popover';
import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	getHours,
	getMinutes,
	isSameDay,
	isSameMonth,
	setHours,
	setMinutes,
	startOfMonth,
	startOfWeek,
	subMonths,
} from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
	/** Current value in `YYYY-MM-DDTHH:mm` format (same as datetime-local) */
	value: string;
	/** Callback with `YYYY-MM-DDTHH:mm` string */
	onChange: (value: string) => void;
	/** Optional placeholder */
	placeholder?: string;
	className?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Parse `YYYY-MM-DDTHH:mm` to Date, or return current date/time */
function parseValue(value: string): Date {
	if (!value) return new Date();
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Format Date back to `YYYY-MM-DDTHH:mm` */
function toLocalString(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	const hh = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function DateTimePicker({
	value,
	onChange,
	placeholder = 'Select date & time',
	className,
}: DateTimePickerProps) {
	const [open, setOpen] = useState(false);
	const selectedDate = useMemo(() => parseValue(value), [value]);
	const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

	// Sync viewMonth when value changes externally
	useEffect(() => {
		if (value) {
			setViewMonth(startOfMonth(parseValue(value)));
		}
	}, [value]);

	// Calendar grid for the current view month
	const calendarDays = useMemo(() => {
		const monthStart = startOfMonth(viewMonth);
		const monthEnd = endOfMonth(viewMonth);
		const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
		const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
		return eachDayOfInterval({ start: calStart, end: calEnd });
	}, [viewMonth]);

	const handleDayClick = useCallback(
		(day: Date) => {
			// Preserve current time
			const h = getHours(selectedDate);
			const m = getMinutes(selectedDate);
			const newDate = setMinutes(setHours(day, h), m);
			onChange(toLocalString(newDate));
		},
		[selectedDate, onChange],
	);

	const handleHourChange = useCallback(
		(hour: number) => {
			const newDate = setHours(selectedDate, hour);
			onChange(toLocalString(newDate));
		},
		[selectedDate, onChange],
	);

	const handleMinuteChange = useCallback(
		(minute: number) => {
			const newDate = setMinutes(selectedDate, minute);
			onChange(toLocalString(newDate));
		},
		[selectedDate, onChange],
	);

	const handleNow = useCallback(() => {
		const now = new Date();
		onChange(toLocalString(now));
		setViewMonth(startOfMonth(now));
	}, [onChange]);

	const displayText = value ? format(selectedDate, 'MMM d, yyyy  h:mm a') : placeholder;

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					className={cn(
						'flex h-11 sm:h-8 w-full items-center justify-between rounded-[6px] border border-pk-border bg-pk-black-sunken px-4 sm:px-3 text-[16px] sm:text-[13px] text-pk-white',
						'transition-colors duration-150 ease-out',
						'hover:border-pk-border-strong',
						'focus-visible:outline-none focus-visible:border-pk-purple focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.15),0_0_8px_rgba(124,92,252,0.1)]',
						!value && 'text-pk-white-dim',
						className,
					)}
				>
					<span className="truncate">{displayText}</span>
					{/* Calendar icon */}
					<svg
						aria-hidden="true"
						width="14"
						height="14"
						viewBox="0 0 16 16"
						fill="none"
						className="ml-2 shrink-0 opacity-50"
					>
						<rect
							x="2"
							y="3"
							width="12"
							height="11"
							rx="2"
							stroke="currentColor"
							strokeWidth="1.3"
						/>
						<path d="M2 7h12" stroke="currentColor" strokeWidth="1.3" />
						<path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
					</svg>
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={6}
					className={cn(
						'z-50 w-[304px] rounded-[8px] border border-pk-border bg-pk-black-raised shadow-xl',
						'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
						'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
						'focus:outline-none',
					)}
				>
					{/* Month navigation */}
					<div className="flex items-center justify-between px-3 pt-3 pb-2">
						<button
							type="button"
							aria-label="Previous month"
							onClick={() => setViewMonth((m) => subMonths(m, 1))}
							className="flex h-7 w-7 items-center justify-center rounded-[4px] text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white transition-colors"
						>
							<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
								<path
									d="M8 2L4 6l4 4"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
						<span className="text-[13px] font-medium text-pk-white">
							{format(viewMonth, 'MMMM yyyy')}
						</span>
						<button
							type="button"
							aria-label="Next month"
							onClick={() => setViewMonth((m) => addMonths(m, 1))}
							className="flex h-7 w-7 items-center justify-center rounded-[4px] text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white transition-colors"
						>
							<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
								<path
									d="M4 2l4 4-4 4"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
					</div>

					{/* Weekday headers */}
					<div className="grid grid-cols-7 px-2">
						{WEEKDAYS.map((d) => (
							<div
								key={d}
								className="flex h-8 items-center justify-center text-[11px] font-medium text-pk-white-dim"
							>
								{d}
							</div>
						))}
					</div>

					{/* Calendar grid */}
					<div className="grid grid-cols-7 px-2 pb-2">
						{calendarDays.map((day) => {
							const isSelected = isSameDay(day, selectedDate);
							const isCurrentMonth = isSameMonth(day, viewMonth);
							const isToday = isSameDay(day, new Date());

							return (
								<button
									key={day.toISOString()}
									type="button"
									onClick={() => handleDayClick(day)}
									className={cn(
										'flex h-8 w-full items-center justify-center rounded-[4px] text-[13px] transition-colors',
										!isCurrentMonth && 'text-pk-white-dim/40',
										isCurrentMonth &&
											!isSelected &&
											'text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white',
										isToday && !isSelected && 'text-pk-purple-bright font-medium',
										isSelected && 'bg-pk-purple text-white font-medium',
									)}
								>
									{format(day, 'd')}
								</button>
							);
						})}
					</div>

					{/* Divider */}
					<div className="h-px bg-pk-border mx-2" />

					{/* Time selector — 12-hour format with AM/PM toggle */}
					<div className="px-3 py-3 flex items-center gap-3">
						<div className="flex items-center gap-1.5 flex-1">
							{/* Clock icon */}
							<svg
								aria-hidden="true"
								width="13"
								height="13"
								viewBox="0 0 16 16"
								fill="none"
								className="text-pk-white-dim shrink-0"
							>
								<circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
								<path
									d="M8 4.5V8l2.5 1.5"
									stroke="currentColor"
									strokeWidth="1.3"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>

							{/* Hour (12-hour format: 1–12) */}
							<TimeScroller
								value={(() => {
									const h = getHours(selectedDate);
									const h12 = h % 12;
									return h12 === 0 ? 12 : h12;
								})()}
								max={12}
								min={1}
								onChange={(h12) => {
									const isPM = getHours(selectedDate) >= 12;
									let h24 = h12 % 12; // 12 → 0
									if (isPM) h24 += 12;
									handleHourChange(h24);
								}}
								pad={2}
							/>
							<span className="text-pk-white-dim text-[13px]">:</span>
							{/* Minute */}
							<TimeScroller
								value={getMinutes(selectedDate)}
								max={59}
								step={5}
								onChange={handleMinuteChange}
								pad={2}
							/>

							{/* AM/PM toggle button */}
							<button
								type="button"
								onClick={() => {
									const h = getHours(selectedDate);
									// Toggle: if AM (0-11) → add 12; if PM (12-23) → subtract 12
									handleHourChange(h < 12 ? h + 12 : h - 12);
								}}
								className={cn(
									'ml-1.5 h-7 min-w-[38px] px-2 rounded-[4px] text-[12px] font-bold uppercase tracking-wider cursor-pointer select-none transition-all duration-150',
									'border',
									'active:scale-95',
									'focus:outline-none focus:ring-1 focus:ring-pk-purple/40',
									getHours(selectedDate) >= 12
										? 'bg-pk-purple/15 border-pk-purple/40 text-pk-purple-bright hover:bg-pk-purple/25 hover:border-pk-purple/60'
										: 'bg-pk-purple/10 border-pk-purple/30 text-pk-purple hover:bg-pk-purple/20 hover:border-pk-purple/50',
								)}
							>
								{getHours(selectedDate) >= 12 ? 'PM' : 'AM'}
							</button>
						</div>

						{/* Now button */}
						<button
							type="button"
							onClick={handleNow}
							className="text-[12px] text-pk-purple hover:text-pk-purple-bright font-medium transition-colors"
						>
							Now
						</button>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

/* ---------- DatePicker — date-only variant (no time) ---------- */

interface DatePickerProps {
	/** Value in `YYYY-MM-DD` format */
	value: string;
	/** Callback with `YYYY-MM-DD` string */
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function DatePicker({
	value,
	onChange,
	placeholder = 'Select date',
	className,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);

	const selectedDate = useMemo(() => {
		if (!value) return null;
		const d = new Date(`${value}T00:00:00`);
		return Number.isNaN(d.getTime()) ? null : d;
	}, [value]);

	const [viewMonth, setViewMonth] = useState(() =>
		selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date()),
	);

	useEffect(() => {
		if (selectedDate) {
			setViewMonth(startOfMonth(selectedDate));
		}
	}, [selectedDate]);

	const calendarDays = useMemo(() => {
		const monthStart = startOfMonth(viewMonth);
		const monthEnd = endOfMonth(viewMonth);
		const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
		const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
		return eachDayOfInterval({ start: calStart, end: calEnd });
	}, [viewMonth]);

	const handleDayClick = useCallback(
		(day: Date) => {
			const yyyy = day.getFullYear();
			const mm = String(day.getMonth() + 1).padStart(2, '0');
			const dd = String(day.getDate()).padStart(2, '0');
			onChange(`${yyyy}-${mm}-${dd}`);
			setOpen(false);
		},
		[onChange],
	);

	const displayText = selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder;

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					className={cn(
						'flex h-11 sm:h-8 w-full items-center justify-between rounded-[6px] border border-pk-border bg-pk-black-sunken px-4 sm:px-3 text-[16px] sm:text-[13px] text-pk-white',
						'transition-colors duration-150 ease-out',
						'hover:border-pk-border-strong',
						'focus-visible:outline-none focus-visible:border-pk-purple focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.15),0_0_8px_rgba(124,92,252,0.1)]',
						!value && 'text-pk-white-dim',
						className,
					)}
				>
					<span className="truncate">{displayText}</span>
					<svg
						aria-hidden="true"
						width="14"
						height="14"
						viewBox="0 0 16 16"
						fill="none"
						className="ml-2 shrink-0 opacity-50"
					>
						<rect
							x="2"
							y="3"
							width="12"
							height="11"
							rx="2"
							stroke="currentColor"
							strokeWidth="1.3"
						/>
						<path d="M2 7h12" stroke="currentColor" strokeWidth="1.3" />
						<path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
					</svg>
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={6}
					className={cn(
						'z-50 w-[304px] rounded-[8px] border border-pk-border bg-pk-black-raised shadow-xl',
						'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
						'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
						'focus:outline-none',
					)}
				>
					{/* Month navigation */}
					<div className="flex items-center justify-between px-3 pt-3 pb-2">
						<button
							type="button"
							aria-label="Previous month"
							onClick={() => setViewMonth((m) => subMonths(m, 1))}
							className="flex h-7 w-7 items-center justify-center rounded-[4px] text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white transition-colors"
						>
							<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
								<path
									d="M8 2L4 6l4 4"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
						<span className="text-[13px] font-medium text-pk-white">
							{format(viewMonth, 'MMMM yyyy')}
						</span>
						<button
							type="button"
							aria-label="Next month"
							onClick={() => setViewMonth((m) => addMonths(m, 1))}
							className="flex h-7 w-7 items-center justify-center rounded-[4px] text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white transition-colors"
						>
							<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
								<path
									d="M4 2l4 4-4 4"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
					</div>

					{/* Weekday headers */}
					<div className="grid grid-cols-7 px-2">
						{WEEKDAYS.map((d) => (
							<div
								key={`dp-${d}`}
								className="flex h-8 items-center justify-center text-[11px] font-medium text-pk-white-dim"
							>
								{d}
							</div>
						))}
					</div>

					{/* Calendar grid */}
					<div className="grid grid-cols-7 px-2 pb-3">
						{calendarDays.map((day) => {
							const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
							const isCurrentMonth = isSameMonth(day, viewMonth);
							const isToday = isSameDay(day, new Date());

							return (
								<button
									key={day.toISOString()}
									type="button"
									onClick={() => handleDayClick(day)}
									className={cn(
										'flex h-8 w-full items-center justify-center rounded-[4px] text-[13px] transition-colors',
										!isCurrentMonth && 'text-pk-white-dim/40',
										isCurrentMonth &&
											!isSelected &&
											'text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white',
										isToday && !isSelected && 'text-pk-purple-bright font-medium',
										isSelected && 'bg-pk-purple text-white font-medium',
									)}
								>
									{format(day, 'd')}
								</button>
							);
						})}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

/* ---------- TimeScroller — a small scroll-to-pick number input ---------- */

interface TimeScrollerProps {
	value: number;
	max: number;
	min?: number;
	step?: number;
	onChange: (v: number) => void;
	pad?: number;
}

function TimeScroller({ value, max, min = 0, step = 1, onChange, pad = 2 }: TimeScrollerProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault();
			const delta = e.deltaY > 0 ? -step : step;
			let next = value + delta;
			if (next > max) next = min + (next - max - 1);
			if (next < min) next = max - (min - next - 1);
			onChange(next);
		},
		[value, max, min, step, onChange],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				let next = value + step;
				if (next > max) next = min;
				onChange(next);
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				let next = value - step;
				if (next < min) next = max;
				// Snap to nearest step
				next = Math.round((next - min) / step) * step + min;
				if (next < min) next = min;
				onChange(next);
			}
		},
		[value, max, min, step, onChange],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const raw = e.target.value.replace(/\D/g, '');
			const num = Number.parseInt(raw, 10);
			if (!Number.isNaN(num) && num >= min && num <= max) {
				// Snap to nearest step
				const snapped = Math.round((num - min) / step) * step + min;
				onChange(Math.min(snapped, max));
			}
		},
		[max, min, step, onChange],
	);

	return (
		<input
			ref={inputRef}
			type="text"
			inputMode="numeric"
			value={String(value).padStart(pad, '0')}
			onChange={handleChange}
			onWheel={handleWheel}
			onKeyDown={handleKeyDown}
			className={cn(
				'w-[36px] h-7 rounded-[4px] border border-pk-border bg-pk-black-sunken text-center text-[13px] font-mono tabular-nums text-pk-white',
				'transition-colors duration-150',
				'hover:border-pk-border-strong',
				'focus:outline-none focus:border-pk-purple focus:shadow-[0_0_0_1px_rgba(124,92,252,0.15)]',
			)}
		/>
	);
}
