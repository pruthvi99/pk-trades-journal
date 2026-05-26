/**
 * New trade form — progressively disclosed.
 * Identity → Plan → First execution → Reasoning → Screenshots → Psychology.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { DateTimePicker } from '@/components/primitives/datetime-picker';
import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';
import { LegBuilder, type LegData } from '@/components/trade/leg-builder';
import {
	type PostPsychologyData,
	PostPsychologyFields,
	type PrePsychologyData,
	PrePsychologyFields,
} from '@/components/trade/psychology-fields';
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

	// Stop loss (for risk / R-multiple calculation)
	const [stopLoss, setStopLoss] = useState('');

	// Status
	const [status, setStatus] = useState<'open' | 'closed'>('closed');
	const [closedAt, setClosedAt] = useState(() => {
		const now = new Date();
		return now.toISOString().slice(0, 16);
	});

	// Execution
	const [legs, setLegs] = useState<LegData[]>([
		{ side: 'sell', optionType: 'put', price: 0, multiplier: 100 },
	]);

	// Exit execution (when status = closed)
	const [exitLegs, setExitLegs] = useState<LegData[]>([
		{ side: 'buy', optionType: 'put', price: 0, multiplier: 100 },
	]);

	// Trade classification
	const [tradeQuality, setTradeQuality] = useState<string>('');
	const [tradeBasis, setTradeBasis] = useState<string>('');

	// Reasoning
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [notesMd, setNotesMd] = useState('');

	// Screenshots
	const [screenshots, setScreenshots] = useState<Array<{ timeframe: string; url: string }>>([]);

	// Psychology
	const [psychology, setPsychology] = useState<PrePsychologyData>({});
	const [postPsychology, setPostPsychology] = useState<PostPsychologyData>({});
	const [psychologyTagIds, setPsychologyTagIds] = useState<string[]>([]);
	const [mistakeTagIds, setMistakeTagIds] = useState<string[]>([]);

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
			setExitLegs([{ side: 'sell', price: 0, multiplier: 1 }]);
		} else {
			setLegs([{ side: 'sell', optionType: 'put', price: 0, multiplier: 100 }]);
			setExitLegs([{ side: 'buy', optionType: 'put', price: 0, multiplier: 100 }]);
		}
	}, [instrument]);

	// Derived chip tag lists from loaded tags
	const psychologyChipTags = tagsList.filter((t) => t.category === 'psychology');
	const mistakeChipTags = tagsList.filter((t) => t.category === 'mistake');

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

	const buildLeg = (leg: LegData) => ({
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
	});

	// Auto-calculate risk from entry legs + stop loss
	const computedRisk = (() => {
		const stop = Number(stopLoss);
		if (!stop) return null;

		if (instrument === 'stock') {
			let totalShares = 0;
			let weightedCost = 0;
			for (const leg of legs) {
				const qty = leg.shares || 0;
				totalShares += qty;
				weightedCost += leg.price * qty;
			}
			if (totalShares === 0 || weightedCost === 0) return null;
			const avgPrice = weightedCost / totalShares;
			return Math.abs(avgPrice - stop) * totalShares;
		}

		// Options: risk per contract = |entry premium - stop| × multiplier
		let totalContracts = 0;
		let weightedPremium = 0;
		for (const leg of legs) {
			const qty = leg.contracts || 0;
			totalContracts += qty;
			weightedPremium += leg.price * qty;
		}
		if (totalContracts === 0 || weightedPremium === 0) return null;
		const avgPremium = weightedPremium / totalContracts;
		return Math.abs(avgPremium - stop) * totalContracts * 100;
	})();

	const handleSubmit = async () => {
		setError('');
		setSaving(true);

		try {
			// Step 1: Create trade (always starts as open with entry execution)
			// Merge all tag selections: reasoning tags + psychology chips + mistake chips
			const allTagIds = [...new Set([...tagIds, ...psychologyTagIds, ...mistakeTagIds])];

			const payload = {
				symbol,
				instrument,
				direction,
				strategyId: strategyId || undefined,
				openedAt: new Date(openedAt).toISOString(),
				plannedStop: stopLoss ? Number(stopLoss) : undefined,
				plannedRiskUsd: computedRisk ?? undefined,
				notesMd: notesMd || undefined,
				tradeQuality: tradeQuality || undefined,
				tradeBasis: tradeBasis || undefined,
				tagIds: allTagIds.length > 0 ? allTagIds : undefined,
				screenshots: screenshots.length > 0 ? screenshots : undefined,
				...psychology,
				execution: {
					kind: 'entry' as const,
					executedAt: new Date(openedAt).toISOString(),
					legs: legs.map(buildLeg),
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

			// Step 2: If closing, add exit execution then patch status
			if (status === 'closed') {
				const closedAtIso = new Date(closedAt).toISOString();

				await fetch('/api/executions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						tradeId: trade.id,
						kind: 'exit',
						executedAt: closedAtIso,
						legs: exitLegs.map(buildLeg),
					}),
				});

				await fetch(`/api/trades/${trade.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'closed',
						closedAt: closedAtIso,
						...postPsychology,
					}),
				});
			}

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
					<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Status</label>
					<Select value={status} onValueChange={(v) => setStatus(v as 'open' | 'closed')}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="closed">Closed</SelectItem>
							<SelectItem value="open">Open</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div>
					<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
						Opened at
					</label>
					<DateTimePicker value={openedAt} onChange={setOpenedAt} />
				</div>
				{status === 'closed' && (
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Closed at
						</label>
						<DateTimePicker value={closedAt} onChange={setClosedAt} />
					</div>
				)}
			</section>

			{/* Section 2: Trade Classification */}
			<section className="space-y-4">
				<p className="eyebrow">Trade classification</p>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Quality grade
						</label>
						<Select value={tradeQuality} onValueChange={setTradeQuality}>
							<SelectTrigger>
								<SelectValue placeholder="Select…" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="A++">A++ (Perfect)</SelectItem>
								<SelectItem value="A+">A+ (Excellent)</SelectItem>
								<SelectItem value="A">A (Good)</SelectItem>
								<SelectItem value="B+">B+ (Average)</SelectItem>
								<SelectItem value="B">B (Below avg)</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Trade basis
						</label>
						<Select value={tradeBasis} onValueChange={setTradeBasis}>
							<SelectTrigger>
								<SelectValue placeholder="Select…" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="rules">Rules-based</SelectItem>
								<SelectItem value="intuition">Intuition</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>

			{/* Section 3: Entry execution */}
			<section className="space-y-4">
				<p className="eyebrow">Entry execution</p>
				<LegBuilder instrument={instrument} legs={legs} onChange={setLegs} />

				{/* Stop loss + computed risk */}
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Stop loss
						</label>
						<Input
							numeric
							type="number"
							step="0.01"
							placeholder="0.00"
							value={stopLoss}
							onChange={(e) => setStopLoss(e.target.value)}
						/>
					</div>
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Risk ($)
						</label>
						<div className="flex h-11 sm:h-8 items-center rounded-[6px] border border-pk-border bg-pk-black-sunken px-4 sm:px-3">
							<span className="text-[16px] sm:text-[13px] font-mono tabular-nums text-pk-white-muted">
								{computedRisk !== null ? `$${computedRisk.toFixed(2)}` : '—'}
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* Section 4: Exit execution — only when closing */}
			{status === 'closed' && (
				<section className="space-y-4">
					<p className="eyebrow">Exit execution</p>
					<LegBuilder instrument={instrument} legs={exitLegs} onChange={setExitLegs} />
				</section>
			)}

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
				<PrePsychologyFields
					data={psychology}
					onChange={(data) => setPsychology(data)}
					psychologyTags={psychologyChipTags}
					selectedPsychologyTagIds={psychologyTagIds}
					onPsychologyTagsChange={setPsychologyTagIds}
				/>
			</section>

			{/* Section 7: Post-trade psychology — only when closing */}
			{status === 'closed' && (
				<section>
					<PostPsychologyFields
						data={postPsychology}
						onChange={(data) => setPostPsychology(data)}
						mistakeTags={mistakeChipTags}
						selectedMistakeTagIds={mistakeTagIds}
						onMistakeTagsChange={setMistakeTagIds}
					/>
				</section>
			)}

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
