/**
 * ChipSelect — toggleable pill-button grid for quick tag selection.
 * Mobile-first 2-column layout. Follows pk design system colors.
 */

'use client';

import { cn } from '@/lib/utils';

export interface ChipOption {
	id: string;
	label: string;
}

export interface ChipSelectProps {
	options: ChipOption[];
	selected: string[];
	onChange: (ids: string[]) => void;
	/** Visual variant — affects selected-state colors. */
	variant?: 'default' | 'mistake';
	className?: string;
}

export function ChipSelect({
	options,
	selected,
	onChange,
	variant = 'default',
	className,
}: ChipSelectProps) {
	const toggle = (id: string) => {
		onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
	};

	return (
		<div className={cn('grid grid-cols-2 gap-2', className)}>
			{options.map((option) => {
				const isSelected = selected.includes(option.id);
				return (
					<button
						key={option.id}
						type="button"
						onClick={() => toggle(option.id)}
						className={cn(
							'rounded-full px-3 py-2 sm:py-1.5 text-[14px] sm:text-[12px] font-medium leading-tight',
							'border transition-colors duration-150 text-center',
							'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pk-purple',
							isSelected
								? variant === 'mistake'
									? 'bg-red-500/10 border-red-500/50 text-red-400'
									: 'bg-pk-purple-faint border-pk-purple text-pk-purple-bright'
								: 'border-pk-border text-pk-white-muted hover:border-pk-border-strong hover:text-pk-white',
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
