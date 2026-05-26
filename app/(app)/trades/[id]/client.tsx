/**
 * Trade detail — client interactive sections.
 * Execution timeline, add execution, close trade, edit notes/tags, psychology panels.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/primitives/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { EditTradeDialog } from '@/components/trade/edit-trade-dialog';
import { LegBuilder, type LegData } from '@/components/trade/leg-builder';
import {
	type DuringPsychologyData,
	DuringPsychologyFields,
	type PostPsychologyData,
	PostPsychologyFields,
} from '@/components/trade/psychology-fields';
import type { TradeWithRelations } from '@/lib/db/queries';

interface TradeDetailClientProps {
	trade: TradeWithRelations;
}

/** Client-side interactive trade detail. */
export function TradeDetailClient({ trade: initialTrade }: TradeDetailClientProps) {
	const router = useRouter();
	const [trade, setTrade] = useState(initialTrade);
	const [addExecOpen, setAddExecOpen] = useState(false);
	const [closeTradeOpen, setCloseTradeOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Add execution form
	const [execKind, setExecKind] = useState<'entry' | 'exit' | 'adjustment'>('exit');
	const [execLegs, setExecLegs] = useState<LegData[]>([
		trade.instrument === 'stock'
			? { side: 'sell', price: 0, multiplier: 1 }
			: { side: 'buy', optionType: 'put', price: 0, multiplier: 100 },
	]);
	const [execSaving, setExecSaving] = useState(false);

	// Close trade form
	const [closeLegs, setCloseLegs] = useState<LegData[]>([
		trade.instrument === 'stock'
			? { side: 'sell', price: 0, multiplier: 1 }
			: { side: 'buy', optionType: 'put', price: 0, multiplier: 100 },
	]);
	const [postPsychology, setPostPsychology] = useState<PostPsychologyData>({});
	const [closeSaving, setCloseSaving] = useState(false);
	const [mistakeTagIds, setMistakeTagIds] = useState<string[]>([]);
	const [availableTags, setAvailableTags] = useState<
		Array<{ id: string; label: string; category: string }>
	>([]);
	const [tagsFetched, setTagsFetched] = useState(false);

	// Load tags when close dialog opens (fetch once, don't retry on error to avoid loop)
	useEffect(() => {
		if (closeTradeOpen && !tagsFetched) {
			setTagsFetched(true);
			fetch('/api/tags')
				.then((r) => r.json())
				.then((tags: Array<{ id: string; label: string; category: string }>) =>
					setAvailableTags(tags),
				)
				.catch(() => {
					// silently fail — mistake chips just won't appear
				});
		}
	}, [closeTradeOpen, tagsFetched]);

	const mistakeChipTags = availableTags.filter((t) => t.category === 'mistake');

	// During psychology
	const [duringPsychology, setDuringPsychology] = useState<DuringPsychologyData>({
		duringStress: trade.duringStress ?? undefined,
		duringDeviations: trade.duringDeviations ?? undefined,
	});

	const refreshTrade = async () => {
		const res = await fetch(`/api/trades/${trade.id}`);
		if (res.ok) {
			const data = (await res.json()) as TradeWithRelations;
			setTrade(data);
		}
	};

	const handleAddExecution = async () => {
		setExecSaving(true);
		try {
			const res = await fetch('/api/executions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tradeId: trade.id,
					kind: execKind,
					executedAt: new Date().toISOString(),
					legs: execLegs.map((leg) => ({
						side: leg.side,
						price: leg.price,
						...(trade.instrument === 'stock'
							? { shares: leg.shares, multiplier: 1 }
							: {
									optionType: leg.optionType,
									strike: leg.strike,
									expiration: leg.expiration,
									contracts: leg.contracts,
									multiplier: 100,
								}),
					})),
				}),
			});
			if (res.ok) {
				setAddExecOpen(false);
				await refreshTrade();
				router.refresh();
			}
		} finally {
			setExecSaving(false);
		}
	};

	const handleCloseTrade = async () => {
		setCloseSaving(true);
		try {
			// Add final exit execution
			await fetch('/api/executions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tradeId: trade.id,
					kind: 'exit',
					executedAt: new Date().toISOString(),
					legs: closeLegs.map((leg) => ({
						side: leg.side,
						price: leg.price,
						...(trade.instrument === 'stock'
							? { shares: leg.shares, multiplier: 1 }
							: {
									optionType: leg.optionType,
									strike: leg.strike,
									expiration: leg.expiration,
									contracts: leg.contracts,
									multiplier: 100,
								}),
					})),
				}),
			});

			// Merge existing trade tags with newly selected mistake tags
			const existingTagIds = trade.tagList.map((t) => t.id);
			const mergedTagIds = [...new Set([...existingTagIds, ...mistakeTagIds])];

			// Update trade status + post psychology + tags
			await fetch(`/api/trades/${trade.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'closed',
					closedAt: new Date().toISOString(),
					tagIds: mergedTagIds,
					...postPsychology,
				}),
			});

			setCloseTradeOpen(false);
			await refreshTrade();
			router.refresh();
		} finally {
			setCloseSaving(false);
		}
	};

	const handleSaveDuringPsychology = async () => {
		await fetch(`/api/trades/${trade.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(duringPsychology),
		});
		await refreshTrade();
	};

	const handleDeleteTrade = async () => {
		setDeleting(true);
		try {
			const res = await fetch(`/api/trades/${trade.id}`, { method: 'DELETE' });
			if (res.ok) {
				router.push('/journal');
			}
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="space-y-8">
			{/* Actions */}
			<div className="flex gap-2">
				<EditTradeDialog
					trade={trade}
					onSaved={async () => {
						await refreshTrade();
						router.refresh();
					}}
				/>
				{trade.status === 'open' && (
					<>
						<Dialog open={addExecOpen} onOpenChange={setAddExecOpen}>
							<DialogTrigger asChild>
								<Button variant="secondary">Add execution</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Add Execution</DialogTitle>
									<DialogDescription>Add a new entry, exit, or adjustment.</DialogDescription>
								</DialogHeader>
								<div className="space-y-4 py-4">
									<div className="flex gap-2">
										{(['entry', 'exit', 'adjustment'] as const).map((kind) => (
											<Button
												key={kind}
												variant={execKind === kind ? 'primary' : 'ghost'}
												size="small"
												type="button"
												onClick={() => setExecKind(kind)}
											>
												{kind.charAt(0).toUpperCase() + kind.slice(1)}
											</Button>
										))}
									</div>
									<LegBuilder
										instrument={trade.instrument}
										legs={execLegs}
										onChange={setExecLegs}
									/>
								</div>
								<DialogFooter>
									<DialogClose asChild>
										<Button variant="ghost">Cancel</Button>
									</DialogClose>
									<Button onClick={handleAddExecution} disabled={execSaving}>
										{execSaving ? 'Saving…' : 'Save'}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						<Dialog open={closeTradeOpen} onOpenChange={setCloseTradeOpen}>
							<DialogTrigger asChild>
								<Button variant="danger">Close trade</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Close Trade</DialogTitle>
									<DialogDescription>
										Record the final exit and your post-trade reflection.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
									<LegBuilder
										instrument={trade.instrument}
										legs={closeLegs}
										onChange={setCloseLegs}
									/>
									<PostPsychologyFields
										data={postPsychology}
										onChange={setPostPsychology}
										mistakeTags={mistakeChipTags}
										selectedMistakeTagIds={mistakeTagIds}
										onMistakeTagsChange={setMistakeTagIds}
									/>
								</div>
								<DialogFooter>
									<DialogClose asChild>
										<Button variant="ghost">Cancel</Button>
									</DialogClose>
									<Button variant="danger" onClick={handleCloseTrade} disabled={closeSaving}>
										{closeSaving ? 'Closing…' : 'Close trade'}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</>
				)}

				{/* Delete — always available */}
				<div className="ml-auto">
					<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
						<DialogTrigger asChild>
							<Button variant="ghost" size="small">
								Delete
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Delete Trade</DialogTitle>
								<DialogDescription>
									This will permanently delete this trade, all executions, and all associated data.
									This cannot be undone.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose asChild>
									<Button variant="ghost">Cancel</Button>
								</DialogClose>
								<Button variant="danger" onClick={handleDeleteTrade} disabled={deleting}>
									{deleting ? 'Deleting…' : 'Delete trade'}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="timeline">
				<TabsList>
					<TabsTrigger value="timeline">Timeline</TabsTrigger>
					<TabsTrigger value="details">Details</TabsTrigger>
					<TabsTrigger value="psychology">Psychology</TabsTrigger>
				</TabsList>

				{/* Timeline */}
				<TabsContent value="timeline">
					<div className="space-y-4">
						{trade.executions.length === 0 && (
							<p className="text-[13px] text-pk-white-dim">No executions recorded.</p>
						)}
						{trade.executions.map((exec) => (
							<div
								key={exec.id}
								className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4 space-y-2"
							>
								<div className="flex items-center gap-2">
									<Badge
										variant={
											exec.kind === 'entry' ? 'default' : exec.kind === 'exit' ? 'muted' : 'open'
										}
									>
										{exec.kind}
									</Badge>
									<span className="text-[12px] text-pk-white-dim">
										{new Date(exec.executedAt).toLocaleString()}
									</span>
									{exec.feesUsd > 0 && (
										<span className="text-[13px] sm:text-[11px] text-pk-white-dim ml-auto">
											Fees: ${exec.feesUsd.toFixed(2)}
										</span>
									)}
								</div>
								{exec.legs.map((leg) => (
									<div
										key={leg.id}
										className="flex items-center gap-3 text-[13px] font-mono tabular-nums"
									>
										<span className={leg.side === 'buy' ? 'text-pk-white' : 'text-pk-purple'}>
											{leg.side.toUpperCase()}
										</span>
										{leg.optionType && (
											<span className="text-pk-white-muted">
												{leg.strike} {leg.optionType.toUpperCase()} {leg.expiration}
											</span>
										)}
										{leg.shares && <span className="text-pk-white-muted">{leg.shares} shares</span>}
										{leg.contracts && (
											<span className="text-pk-white-muted">{leg.contracts} contracts</span>
										)}
										<span className="text-pk-white">@ ${leg.price.toFixed(2)}</span>
									</div>
								))}
								{exec.notes && <p className="text-[12px] text-pk-white-dim">{exec.notes}</p>}
							</div>
						))}
					</div>
				</TabsContent>

				{/* Details */}
				<TabsContent value="details">
					<div className="space-y-6">
						{/* Trade Classification */}
						{(trade.tradeQuality || trade.tradeBasis) && (
							<div>
								<p className="eyebrow mb-2">Classification</p>
								<div className="grid grid-cols-2 gap-4 text-[13px]">
									{trade.tradeQuality && (
										<div>
											<span className="text-pk-white-dim block text-[11px]">Quality</span>
											<span className="font-medium text-pk-white">{trade.tradeQuality}</span>
										</div>
									)}
									{trade.tradeBasis && (
										<div>
											<span className="text-pk-white-dim block text-[11px]">Basis</span>
											<span className="font-medium text-pk-white capitalize">
												{trade.tradeBasis === 'rules' ? 'Rules-based' : 'Intuition'}
											</span>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Plan */}
						{(trade.plannedEntry || trade.plannedStop || trade.plannedTarget) && (
							<div>
								<p className="eyebrow mb-2">Plan</p>
								<div className="grid grid-cols-3 gap-4 text-[13px]">
									{trade.plannedEntry && (
										<div>
											<span className="text-pk-white-dim block text-[11px]">Entry</span>
											<span className="font-mono tabular-nums text-pk-white">
												${trade.plannedEntry.toFixed(2)}
											</span>
										</div>
									)}
									{trade.plannedStop && (
										<div>
											<span className="text-pk-white-dim block text-[11px]">Stop</span>
											<span className="font-mono tabular-nums text-pk-white">
												${trade.plannedStop.toFixed(2)}
											</span>
										</div>
									)}
									{trade.plannedTarget && (
										<div>
											<span className="text-pk-white-dim block text-[11px]">Target</span>
											<span className="font-mono tabular-nums text-pk-white">
												${trade.plannedTarget.toFixed(2)}
											</span>
										</div>
									)}
									{trade.plannedRiskUsd && (
										<div>
											<span className="text-pk-white-dim block text-[11px]">Risk</span>
											<span className="font-mono tabular-nums text-pk-white">
												${trade.plannedRiskUsd.toFixed(2)}
											</span>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Screenshots */}
						{trade.screenshots.length > 0 && (
							<div>
								<p className="eyebrow mb-2">Screenshots</p>
								<div className="flex flex-wrap gap-2">
									{trade.screenshots.map((ss) => (
										<a
											key={ss.id}
											href={ss.url}
											target="_blank"
											rel="noopener noreferrer"
											className="rounded-[4px] border border-pk-border px-2 py-1 text-[12px] text-pk-purple-bright hover:bg-pk-purple-faint transition-colors"
										>
											{ss.timeframe} {ss.label ? `— ${ss.label}` : ''}
										</a>
									))}
								</div>
							</div>
						)}

						{/* Tags — grouped by category */}
						{trade.tagList.length > 0 &&
							(() => {
								const categoryOrder = [
									'setup',
									'context',
									'psychology',
									'mistake',
									'custom',
								] as const;
								const grouped = trade.tagList.reduce<Record<string, typeof trade.tagList>>(
									(acc, tag) => {
										const cat = tag.category ?? 'custom';
										if (!acc[cat]) acc[cat] = [];
										acc[cat].push(tag);
										return acc;
									},
									{},
								);
								return (
									<div className="space-y-3">
										<p className="eyebrow mb-0">Tags</p>
										{categoryOrder
											.filter((cat) => grouped[cat]?.length)
											.map((cat) => (
												<div key={cat} className="flex items-start gap-2">
													<span className="text-[11px] text-pk-white-dim uppercase tracking-wider min-w-[72px] pt-0.5 shrink-0">
														{cat}
													</span>
													<div className="flex flex-wrap gap-1">
														{grouped[cat]!.map((tag) => (
															<Badge
																key={tag.id}
																variant={cat === 'mistake' ? 'mistake' : 'default'}
															>
																{tag.label}
															</Badge>
														))}
													</div>
												</div>
											))}
									</div>
								);
							})()}

						{/* Notes */}
						{trade.notesMd && (
							<div>
								<p className="eyebrow mb-2">Notes</p>
								<p className="text-[13px] text-pk-white-muted whitespace-pre-wrap">
									{trade.notesMd}
								</p>
							</div>
						)}

						{/* Fees */}
						{(trade.feesUsd ?? 0) > 0 && (
							<div>
								<p className="eyebrow mb-2">Fees</p>
								<span className="font-mono tabular-nums text-[13px] text-pk-white-muted">
									${trade.feesUsd.toFixed(2)}
								</span>
							</div>
						)}
					</div>
				</TabsContent>

				{/* Psychology */}
				<TabsContent value="psychology">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Pre */}
						<div className="space-y-3">
							<p className="eyebrow">Pre-trade</p>
							<PsychField label="Confidence" value={trade.preConfidence} suffix="/10" />
							<PsychField label="Conviction" value={trade.preConviction} />
							<PsychField label="Mood" value={trade.preMood} />
							<PsychField
								label="Sleep"
								value={trade.preSleepHours != null ? `${trade.preSleepHours}h` : null}
							/>
							<PsychField
								label="Caffeine"
								value={trade.preCaffeine != null ? (trade.preCaffeine ? 'Yes' : 'No') : null}
							/>
							<PsychField
								label="Following plan"
								value={
									trade.preFollowingPlan != null ? (trade.preFollowingPlan ? 'Yes' : 'No') : null
								}
							/>
						</div>

						{/* During */}
						<div className="space-y-3">
							{trade.status === 'open' ? (
								<DuringPsychologyFields data={duringPsychology} onChange={setDuringPsychology} />
							) : (
								<>
									<p className="eyebrow">During trade</p>
									<PsychField label="Stress" value={trade.duringStress} suffix="/10" />
									<PsychField label="Deviations" value={trade.duringDeviations} />
								</>
							)}
							{trade.status === 'open' && (
								<Button variant="ghost" size="small" onClick={handleSaveDuringPsychology}>
									Save
								</Button>
							)}
						</div>

						{/* Post */}
						<div className="space-y-3">
							<p className="eyebrow">Post-trade</p>
							{trade.status === 'closed' ? (
								<>
									<PsychField label="Satisfaction" value={trade.postSatisfaction} suffix="/10" />
									<PsychField label="Mood" value={trade.postMood} />
									{/* Mistake tags as red chips */}
									{(() => {
										const mistakeTags = trade.tagList.filter((t) => t.category === 'mistake');
										const psychTags = trade.tagList.filter((t) => t.category === 'psychology');
										return (
											<>
												{psychTags.length > 0 && (
													<div>
														<span className="text-[13px] sm:text-[11px] text-pk-white-dim">
															Mindset
														</span>
														<div className="flex flex-wrap gap-1 mt-1">
															{psychTags.map((tag) => (
																<Badge key={tag.id} variant="default">
																	{tag.label}
																</Badge>
															))}
														</div>
													</div>
												)}
												{mistakeTags.length > 0 && (
													<div>
														<span className="text-[13px] sm:text-[11px] text-pk-white-dim">
															Mistakes
														</span>
														<div className="flex flex-wrap gap-1 mt-1">
															{mistakeTags.map((tag) => (
																<Badge key={tag.id} variant="mistake">
																	{tag.label}
																</Badge>
															))}
														</div>
													</div>
												)}
												{trade.postMistakes && (
													<PsychField label="Mistake notes" value={trade.postMistakes} />
												)}
												{!mistakeTags.length && !trade.postMistakes && (
													<PsychField label="Mistakes" value={null} />
												)}
											</>
										);
									})()}
									<PsychField label="Lessons" value={trade.postLessons} />
									<PsychField
										label="Would retake"
										value={
											trade.postWouldRetake != null ? (trade.postWouldRetake ? 'Yes' : 'No') : null
										}
									/>
								</>
							) : (
								<p className="text-[12px] text-pk-white-dim">Unlocks when the trade is closed.</p>
							)}
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function PsychField({
	label,
	value,
	suffix,
}: {
	label: string;
	value: string | number | boolean | null | undefined;
	suffix?: string;
}) {
	if (value == null) {
		return (
			<div>
				<span className="text-[13px] sm:text-[11px] text-pk-white-dim">{label}</span>
				<p className="text-[13px] text-pk-white-dim">—</p>
			</div>
		);
	}
	return (
		<div>
			<span className="text-[13px] sm:text-[11px] text-pk-white-dim">{label}</span>
			<p className="text-[13px] text-pk-white">
				{String(value)}
				{suffix}
			</p>
		</div>
	);
}
