/**
 * Edit trade dialog — editable fields for an existing trade.
 * Identity, plan, reasoning, and pre-trade psychology.
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/primitives/dialog';
import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';
import { Slider } from '@/components/primitives/slider';
import { Toggle } from '@/components/primitives/toggle';
import { TagPicker } from '@/components/trade/tag-picker';
import type { TradeWithRelations } from '@/lib/db/queries';

interface Strategy {
	id: string;
	name: string;
}

interface TagOption {
	id: string;
	label: string;
	category: string;
}

const MOODS = ['calm', 'focused', 'neutral', 'anxious', 'fomo', 'revenge', 'tired'] as const;

interface EditTradeDialogProps {
	trade: TradeWithRelations;
	onSaved: () => void;
}

/** Dialog for editing trade identity, plan, notes, tags, and pre-trade psychology. */
export function EditTradeDialog({ trade, onSaved }: EditTradeDialogProps) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	// Reference data
	const [strategiesList, setStrategies] = useState<Strategy[]>([]);
	const [tagsList, setTags] = useState<TagOption[]>([]);

	// Form state — identity
	const [symbol, setSymbol] = useState(trade.symbol);
	const [instrument, setInstrument] = useState(trade.instrument);
	const [direction, setDirection] = useState(trade.direction);
	const [strategyId, setStrategyId] = useState(trade.strategyId ?? '');

	// Plan
	const [plannedEntry, setPlannedEntry] = useState(trade.plannedEntry?.toString() ?? '');
	const [plannedStop, setPlannedStop] = useState(trade.plannedStop?.toString() ?? '');
	const [plannedTarget, setPlannedTarget] = useState(trade.plannedTarget?.toString() ?? '');
	const [plannedSize, setPlannedSize] = useState(trade.plannedSize?.toString() ?? '');
	const [plannedRiskUsd, setPlannedRiskUsd] = useState(trade.plannedRiskUsd?.toString() ?? '');

	// Reasoning
	const [notesMd, setNotesMd] = useState(trade.notesMd ?? '');
	const [tagIds, setTagIds] = useState<string[]>(trade.tagList.map((t) => t.id));

	// Pre-trade psychology
	const [preConfidence, setPreConfidence] = useState(trade.preConfidence ?? 5);
	const [preConviction, setPreConviction] = useState(trade.preConviction ?? '');
	const [preMood, setPreMood] = useState(trade.preMood ?? '');
	const [preSleepHours, setPreSleepHours] = useState(trade.preSleepHours?.toString() ?? '');
	const [preCaffeine, setPreCaffeine] = useState(trade.preCaffeine ?? false);
	const [preFollowingPlan, setPreFollowingPlan] = useState(trade.preFollowingPlan ?? false);

	// Live R:R
	const riskReward = (() => {
		const entry = Number(plannedEntry);
		const stop = Number(plannedStop);
		const target = Number(plannedTarget);
		if (!entry || !stop || !target || entry === stop) return null;
		const risk = Math.abs(entry - stop);
		const reward = Math.abs(target - entry);
		return (reward / risk).toFixed(2);
	})();

	// Load reference data when dialog opens
	useEffect(() => {
		if (!open) return;
		Promise.all([
			fetch('/api/strategies').then((r) => r.json()),
			fetch('/api/tags').then((r) => r.json()),
		]).then(([strats, tags]) => {
			setStrategies(strats as Strategy[]);
			setTags(tags as TagOption[]);
		});
	}, [open]);

	// Reset form when dialog opens with fresh trade data
	useEffect(() => {
		if (!open) return;
		setSymbol(trade.symbol);
		setInstrument(trade.instrument);
		setDirection(trade.direction);
		setStrategyId(trade.strategyId ?? '');
		setPlannedEntry(trade.plannedEntry?.toString() ?? '');
		setPlannedStop(trade.plannedStop?.toString() ?? '');
		setPlannedTarget(trade.plannedTarget?.toString() ?? '');
		setPlannedSize(trade.plannedSize?.toString() ?? '');
		setPlannedRiskUsd(trade.plannedRiskUsd?.toString() ?? '');
		setNotesMd(trade.notesMd ?? '');
		setTagIds(trade.tagList.map((t) => t.id));
		setPreConfidence(trade.preConfidence ?? 5);
		setPreConviction(trade.preConviction ?? '');
		setPreMood(trade.preMood ?? '');
		setPreSleepHours(trade.preSleepHours?.toString() ?? '');
		setPreCaffeine(trade.preCaffeine ?? false);
		setPreFollowingPlan(trade.preFollowingPlan ?? false);
		setError('');
	}, [open, trade]);

	const handleCreateTag = async (label: string): Promise<TagOption | null> => {
		const res = await fetch('/api/tags', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ label, category: 'custom' }),
		});
		if (!res.ok) return null;
		const tag = (await res.json()) as TagOption;
		setTags((prev) => [...prev, tag]);
		return tag;
	};

	const handleSave = async () => {
		setError('');
		setSaving(true);
		try {
			const payload: Record<string, unknown> = {
				symbol,
				instrument,
				direction,
				strategyId: strategyId || undefined,
				plannedEntry: plannedEntry ? Number(plannedEntry) : undefined,
				plannedStop: plannedStop ? Number(plannedStop) : undefined,
				plannedTarget: plannedTarget ? Number(plannedTarget) : undefined,
				plannedSize: plannedSize ? Number(plannedSize) : undefined,
				plannedRiskUsd: plannedRiskUsd ? Number(plannedRiskUsd) : undefined,
				notesMd: notesMd || undefined,
				tagIds,
				preConfidence,
				preConviction: preConviction || undefined,
				preMood: preMood || undefined,
				preSleepHours: preSleepHours ? Number(preSleepHours) : undefined,
				preCaffeine,
				preFollowingPlan,
			};

			const res = await fetch(`/api/trades/${trade.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const data = (await res.json()) as { error?: unknown };
				setError(typeof data.error === 'string' ? data.error : 'Save failed');
				return;
			}

			setOpen(false);
			onSaved();
		} catch {
			setError('Failed to save changes');
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary">Edit</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Trade</DialogTitle>
					<DialogDescription>Update trade details, plan, notes, and psychology.</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-1">
					{/* Identity */}
					<div className="space-y-3">
						<p className="eyebrow">Identity</p>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Symbol
								</label>
								<Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Instrument
								</label>
								<Select
									value={instrument}
									onValueChange={(v) => setInstrument(v as 'option_spread' | 'stock')}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="option_spread">Option Spread</SelectItem>
										<SelectItem value="stock">Stock</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Direction
								</label>
								<Select
									value={direction}
									onValueChange={(v) => setDirection(v as 'long' | 'short' | 'neutral')}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="long">Long</SelectItem>
										<SelectItem value="short">Short</SelectItem>
										<SelectItem value="neutral">Neutral</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Strategy
								</label>
								<Select value={strategyId} onValueChange={setStrategyId}>
									<SelectTrigger>
										<SelectValue placeholder="Select..." />
									</SelectTrigger>
									<SelectContent>
										{strategiesList.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Plan */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<p className="eyebrow">Plan</p>
							{riskReward && (
								<span className="text-[13px] font-mono tabular-nums text-pk-purple-bright">
									R:R {riskReward}
								</span>
							)}
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Entry
								</label>
								<Input
									numeric
									type="number"
									step="0.01"
									placeholder="0.00"
									value={plannedEntry}
									onChange={(e) => setPlannedEntry(e.target.value)}
								/>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Stop
								</label>
								<Input
									numeric
									type="number"
									step="0.01"
									placeholder="0.00"
									value={plannedStop}
									onChange={(e) => setPlannedStop(e.target.value)}
								/>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Target
								</label>
								<Input
									numeric
									type="number"
									step="0.01"
									placeholder="0.00"
									value={plannedTarget}
									onChange={(e) => setPlannedTarget(e.target.value)}
								/>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Size
								</label>
								<Input
									numeric
									type="number"
									placeholder="1"
									value={plannedSize}
									onChange={(e) => setPlannedSize(e.target.value)}
								/>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Risk ($)
								</label>
								<Input
									numeric
									type="number"
									step="0.01"
									placeholder="0.00"
									value={plannedRiskUsd}
									onChange={(e) => setPlannedRiskUsd(e.target.value)}
								/>
							</div>
						</div>
					</div>

					{/* Notes & Tags */}
					<div className="space-y-3">
						<p className="eyebrow">Reasoning</p>
						<div>
							<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Tags
							</label>
							<TagPicker
								tags={tagsList}
								selected={tagIds}
								onChange={setTagIds}
								onCreateTag={handleCreateTag}
							/>
						</div>
						<div>
							<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Notes
							</label>
							<textarea
								value={notesMd}
								onChange={(e) => setNotesMd(e.target.value)}
								rows={3}
								className="flex w-full rounded-[6px] border border-pk-border bg-pk-black-sunken px-3 py-2 text-[13px] text-pk-white placeholder:text-pk-white-dim transition-colors duration-150 hover:border-pk-border-strong focus-visible:outline-none focus-visible:border-pk-purple focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.15),0_0_8px_rgba(124,92,252,0.1)] resize-y"
								placeholder="Trade thesis, setup description..."
							/>
						</div>
					</div>

					{/* Pre-trade psychology */}
					<div className="space-y-3">
						<p className="eyebrow">Pre-trade psychology</p>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<label className="text-[13px] text-pk-white-muted">Confidence</label>
								<span className="font-mono tabular-nums text-[13px] text-pk-white">
									{preConfidence}
								</span>
							</div>
							<Slider
								min={1}
								max={10}
								step={1}
								value={[preConfidence]}
								onValueChange={([v]) => {
									if (v !== undefined) setPreConfidence(v);
								}}
							/>
						</div>
						<div>
							<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Conviction / thesis
							</label>
							<Input
								placeholder="Why this trade?"
								value={preConviction}
								onChange={(e) => setPreConviction(e.target.value)}
							/>
						</div>
						<div>
							<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Mood
							</label>
							<Select value={preMood} onValueChange={setPreMood}>
								<SelectTrigger>
									<SelectValue placeholder="Select mood..." />
								</SelectTrigger>
								<SelectContent>
									{MOODS.map((mood) => (
										<SelectItem key={mood} value={mood}>
											{mood.charAt(0).toUpperCase() + mood.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Sleep (hours)
								</label>
								<Input
									numeric
									type="number"
									step="0.5"
									min="0"
									max="24"
									value={preSleepHours}
									onChange={(e) => setPreSleepHours(e.target.value)}
								/>
							</div>
							<div className="flex flex-col">
								<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1">
									Caffeine
								</label>
								<div className="flex items-center gap-2 h-8">
									<Toggle checked={preCaffeine} onCheckedChange={setPreCaffeine} />
									<span className="text-[12px] text-pk-white-dim">
										{preCaffeine ? 'Yes' : 'No'}
									</span>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Toggle checked={preFollowingPlan} onCheckedChange={setPreFollowingPlan} />
							<label className="text-[13px] text-pk-white-muted">Following the plan</label>
						</div>
					</div>
				</div>

				{/* Error */}
				{error && (
					<p className="text-[12px] text-red-400" role="alert">
						{error}
					</p>
				)}

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Cancel</Button>
					</DialogClose>
					<Button onClick={handleSave} disabled={saving || !symbol}>
						{saving ? 'Saving...' : 'Save changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
