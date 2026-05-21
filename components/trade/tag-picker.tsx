/**
 * Tag picker with typeahead search and inline tag creation.
 * Tags grouped by category.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { cn } from '@/lib/utils';

interface TagOption {
	id: string;
	label: string;
	category: string;
}

interface TagPickerProps {
	tags: TagOption[];
	selected: string[];
	onChange: (ids: string[]) => void;
	onCreateTag?: (label: string) => Promise<TagOption | null>;
}

/** Tag picker with search, multi-select, and inline creation. */
export function TagPicker({ tags, selected, onChange, onCreateTag }: TagPickerProps) {
	const [search, setSearch] = useState('');
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const filtered = tags.filter(
		(t) => t.label.toLowerCase().includes(search.toLowerCase()) && !selected.includes(t.id),
	);

	const selectedTags = tags.filter((t) => selected.includes(t.id));
	const hasExactMatch = tags.some((t) => t.label.toLowerCase() === search.toLowerCase());

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, []);

	const toggle = (id: string) => {
		if (selected.includes(id)) {
			onChange(selected.filter((s) => s !== id));
		} else {
			onChange([...selected, id]);
		}
	};

	const handleCreate = async () => {
		if (!onCreateTag || !search.trim()) return;
		setCreating(true);
		try {
			const tag = await onCreateTag(search.trim());
			if (tag) {
				onChange([...selected, tag.id]);
				setSearch('');
			}
		} finally {
			setCreating(false);
		}
	};

	return (
		<div ref={wrapperRef} className="relative space-y-2">
			{/* Selected tags */}
			{selectedTags.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selectedTags.map((tag) => (
						<button
							key={tag.id}
							type="button"
							onClick={() => toggle(tag.id)}
							className="inline-flex items-center gap-1 rounded-[4px] bg-pk-purple-faint px-1.5 py-0.5 text-[11px] text-pk-white hover:bg-pk-purple-faint/70 transition-colors"
						>
							{tag.label}
							<span className="text-pk-white-dim">×</span>
						</button>
					))}
				</div>
			)}

			{/* Search */}
			<Input
				placeholder="Search or add tag…"
				value={search}
				onChange={(e) => {
					setSearch(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
			/>

			{/* Dropdown */}
			{open && (search || filtered.length > 0) && (
				<div
					className={cn(
						'absolute z-30 mt-1 w-full max-h-48 overflow-auto',
						'rounded-[6px] border border-pk-border bg-pk-black-raised shadow-lg',
					)}
				>
					{filtered.length > 0 ? (
						<div className="p-1">
							{filtered.map((tag) => (
								<button
									key={tag.id}
									type="button"
									onClick={() => {
										toggle(tag.id);
										setSearch('');
									}}
									className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-[13px] text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white"
								>
									<span>{tag.label}</span>
									<Badge variant="muted">{tag.category}</Badge>
								</button>
							))}
						</div>
					) : null}

					{/* Create new tag */}
					{search.trim() && !hasExactMatch && onCreateTag && (
						<div className="border-t border-pk-border p-1">
							<Button
								variant="ghost"
								size="small"
								type="button"
								className="w-full justify-start"
								onClick={handleCreate}
								disabled={creating}
							>
								{creating ? 'Creating…' : `+ Create "${search.trim()}"`}
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
