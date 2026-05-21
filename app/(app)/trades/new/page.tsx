/**
 * New trade form — progressively disclosed.
 * Identity → Plan → First execution → Reasoning → Screenshots → Psychology.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';
import { LegBuilder, type LegData } from '@/components/trade/leg-builder';
import { type PrePsychologyData, PrePsychologyFields } from '@/components/trade/psychology-fields';
import { TagPicker } from '@/components/trade/tag-picker';

interface Strategy {
	id: string;
	name: string;
	defaultInstrument?: string | null;
}

interface TagOption {
	id: string;
	label: string;
	category: string;
}

export default function NewTradePage() {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	// Reference data
	const [strategiesList, setStrategies] = useState<Strategy[]>([]);
	const [tagsList, setTags] = useState<TagOption[]>([]);
	const [symbols, setSymbols] = useState<string[]>([]);

	// Form state
	const [symbol, setSymbol] = useState('');
	const [instrument, setInstrument] = useState<'option_spread' | 'stock'>('option_spread');
	const [direction, setDirection] = useState<'long' | 'short' | 'neutral'>('long');
	const [strategyId, setStrategyId] = useState<string>('');
	const [openedAt, setOpenedAt] = useState(() => {
		const now = new Date();
		return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
	});

	// Plan
	const [plannedEntry, setPlannedEntry] = useState('');
	const [plannedStop, setPlannedStop] = useState('');
	const [plannedTarget, setPlannedTarget] = useState('');
	const [plannedSize, setPlannedSize] = useState('');
	const [plannedRiskUsd, setPlannedRiskUsd] = useState('');

	// Execution
	const [legs, setLegs] = useState<LegData[]>([
		{ side: 'sell', optionType: 'put', price: 0, multiplier: 100 },
	]);

	// Reasoning
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [notesMd, setNotesMd] = useState('');

	// Screenshots
	const [screenshots, setScreenshots] = useState<Array<{ timeframe: string; url: string }>>([]);

	// Psychology
	const [psychology, setPsychology] = useState<PrePsychologyData>({});

	// Live R:R calculation
	const riskReward = (() => {
		const entry = Number(plannedEntry);
		const stop = Number(plannedStop);
		const target = Number(plannedTarget);
		if (!entry || !stop || !target || entry === stop) return null;
		const risk = Math.abs(entry - stop);
		const reward = Math.abs(target - entry);
		return (reward / risk).toFixed(2);
	})();

	// Load reference data
	useEffect(() => {
		Promise.all([
			fetch('/api/strategies').then((r) => r.json()),
			fetch('/api/tags').then((r) => r.json()),
			fetch('/api/trades/symbols').then((r) => r.json()),
		]).then(([strats, tags, syms]) => {
			setStrategies(strats as Strategy[]);
			setTags(tags as TagOption[]);
			setSymbols(syms as string[]);
		});
	}, []);

	// Switch default legs when instrument changes
	useEffect(() => {
		if (instrument === 'stock') {
			setLegs([{ side: 'buy', price: 0, multiplier: 1 }]);
		} else {
			setLegs([{ side: 'sell', optionType: 'put', price: 0, multiplier: 100 }]);
		}
	}, [instrument]);

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

	const handleSubmit = async () => {
		setError('');
		setSaving(true);

		try {
			const payload = {
				symbol,
				instrument,
				direction,
				strategyId: strategyId || undefined,
				openedAt: new Date(openedAt).toISOString(),
				plannedEntry: plannedEntry ? Number(plannedEntry) : undefined,
				plannedStop: plannedStop ? Number(plannedStop) : undefined,
				plannedTarget: plannedTarget ? Number(plannedTarget) : undefined,
				plannedSize: plannedSize ? Number(plannedSize) : undefined,
				plannedRiskUsd: plannedRiskUsd ? Number(plannedRiskUsd) : undefined,
				notesMd: notesMd || undefined,
				tagIds: tagIds.length > 0 ? tagIds : undefined,
				screenshots: screenshots.length > 0 ? screenshots : undefined,
				...psychology,
				execution: {
					kind: 'entry' as const,
					executedAt: new Date(openedAt).toISOString(),
					legs: legs.map((leg) => ({
						side: leg.side,
						price: leg.price,
						...(instrument === 'stock'
							? { shares: leg.shares, multiplier: 1 }
							: {
									optionType: leg.optionType,
									strike: leg.strike,
									expiration: leg.expiration,
									contracts: leg.contracts,
									multiplier: 100,
								}),
					})),
				},
			};

			const res = await fetch('/api/trades', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const data = (await res.json()) as { error?: unknown };
				setError(typeof data.error === 'string' ? data.error : 'Validation failed');
				return;
			}

			const trade = (await res.json()) as { id: string };
			router.push(`/trades/${trade.id}`);
		} catch {
			setError('Failed to save trade');
		} finally {
			setSaving(false);
		}
	};

	// Symbol autocomplete filtered
	const filteredSymbols = symbol
		? symbols.filter((s) => s.startsWith(symbol.toUpperCase()) && s !== symbol.toUpperCase())
		: [];

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<div>
				<p className="eyebrow">new trade</p>
				<h1 className="text-[20px] font-medium text-pk-white mt-1">Log a trade</h1>
			</div>

			{/* Section 1: Identity */}
			<section className="space-y-4">
				<p className="eyebrow">Identity</p>
				<div className="grid grid-cols-2 gap-3">
					<div className="relative">
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Symbol
						</label>
						<Input
							placeholder="SPX"
							value={symbol}
							onChange={(e) => setSymbol(e.target.value.toUpperCase())}
							autoFocus
						/>
						{filteredSymbols.length > 0 && (
							<div className="absolute z-20 mt-1 w-full rounded-[6px] border border-pk-border bg-pk-black-raised shadow-lg">
								{filteredSymbols.slice(0, 5).map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => setSymbol(s)}
										className="block w-full px-4 sm:px-3 py-3 sm:py-1.5 text-left text-[16px] sm:text-[13px] text-pk-white-muted hover:bg-pk-purple-faint hover:text-pk-white"
									>
										{s}
									</button>
								))}
							</div>
						)}
					</div>
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
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
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
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
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Strategy
						</label>
						<Select value={strategyId} onValueChange={setStrategyId}>
							<SelectTrigger>
								<SelectValue placeholder="Select…" />
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
				<div>
					<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
						Opened at
					</label>
					<Input
						type="datetime-local"
						value={openedAt}
						onChange={(e) => setOpenedAt(e.target.value)}
					/>
				</div>
			</section>

			{/* Section 2: Plan */}
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<p className="eyebrow">Plan</p>
					{riskReward && (
						<span className="text-[13px] font-mono tabular-nums text-pk-purple-bright">
							R:R {riskReward}
						</span>
					)}
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Entry</label>
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
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Stop</label>
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
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
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
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Size</label>
						<Input
							numeric
							type="number"
							placeholder="1"
							value={plannedSize}
							onChange={(e) => setPlannedSize(e.target.value)}
						/>
					</div>
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
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
			</section>

			{/* Section 3: First execution */}
			<section className="space-y-4">
				<p className="eyebrow">First execution</p>
				<LegBuilder instrument={instrument} legs={legs} onChange={setLegs} />
			</section>

			{/* Section 4: Reasoning */}
			<section className="space-y-4">
				<p className="eyebrow">Reasoning</p>
				<div>
					<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Tags</label>
					<TagPicker
						tags={tagsList}
						selected={tagIds}
						onChange={setTagIds}
						onCreateTag={handleCreateTag}
					/>
				</div>
				<div>
					<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Notes</label>
					<textarea
						placeholder="Trade thesis, setup description…"
						value={notesMd}
						onChange={(e) => setNotesMd(e.target.value)}
						rows={4}
						className="flex w-full rounded-[6px] border border-pk-border bg-pk-black-sunken px-4 sm:px-3 py-3 sm:py-2 text-[16px] sm:text-[13px] text-pk-white placeholder:text-pk-white-dim transition-colors duration-150 hover:border-pk-border-strong focus-visible:outline-none focus-visible:border-pk-purple focus-visible:shadow-[0_0_0_1px_rgba(124,92,252,0.15),0_0_8px_rgba(124,92,252,0.1)] resize-y"
					/>
				</div>
			</section>

			{/* Section 5: Screenshots */}
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<p className="eyebrow">Screenshots</p>
					<Button
						variant="ghost"
						size="small"
						type="button"
						onClick={() => setScreenshots((prev) => [...prev, { timeframe: 'other', url: '' }])}
					>
						+ Add screenshot
					</Button>
				</div>
				{screenshots.length === 0 && (
					<p className="text-[14px] sm:text-[12px] text-pk-white-dim">
						No screenshots added. All optional.
					</p>
				)}
				{screenshots.map((ss, i) => (
					<div key={`ss-${i}`} className="flex gap-2 items-end">
						<div className="w-24">
							<Select
								value={ss.timeframe}
								onValueChange={(v) =>
									setScreenshots((prev) =>
										prev.map((s, j) => (j === i ? { ...s, timeframe: v } : s)),
									)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="4H">4H</SelectItem>
									<SelectItem value="1H">1H</SelectItem>
									<SelectItem value="15M">15M</SelectItem>
									<SelectItem value="5M">5M</SelectItem>
									<SelectItem value="other">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1">
							<Input
								placeholder="TradingView URL"
								value={ss.url}
								onChange={(e) =>
									setScreenshots((prev) =>
										prev.map((s, j) => (j === i ? { ...s, url: e.target.value } : s)),
									)
								}
							/>
						</div>
						<Button
							variant="ghost"
							size="small"
							type="button"
							onClick={() => setScreenshots((prev) => prev.filter((_, j) => j !== i))}
						>
							×
						</Button>
					</div>
				))}
			</section>

			{/* Section 6: Psychology */}
			<section>
				<PrePsychologyFields data={psychology} onChange={(data) => setPsychology(data)} />
			</section>

			{/* Error + Submit */}
			{error && (
				<p className="text-[14px] sm:text-[12px] text-red-400" role="alert">
					{error}
				</p>
			)}
			<div className="flex gap-3 pb-8">
				<Button variant="primary" onClick={handleSubmit} disabled={saving || !symbol}>
					{saving ? 'Saving…' : 'Save trade'}
				</Button>
				<Button variant="ghost" onClick={() => router.back()}>
					Cancel
				</Button>
			</div>
		</div>
	);
}
