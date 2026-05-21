/**
 * Journal list view — trade table with filters, dense rows.
 * Default sort: newest first. Supports ?date=YYYY-MM-DD from calendar.
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableWrapper,
} from '@/components/primitives/table';

interface Trade {
	id: string;
	symbol: string;
	instrument: string;
	direction: string;
	status: string;
	strategyId: string | null;
	realizedPnlUsd: number | null;
	realizedPnlR: number | null;
	openedAt: string;
	closedAt: string | null;
	notesMd: string | null;
}

interface Strategy {
	id: string;
	name: string;
}

function JournalContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [trades, setTrades] = useState<Trade[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [strategies, setStrategies] = useState<Strategy[]>([]);

	// Filters
	const [symbolFilter, setSymbolFilter] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [instrumentFilter, setInstrumentFilter] = useState('');
	const [strategyFilter, setStrategyFilter] = useState('');
	const [dateFilter, setDateFilter] = useState(() => searchParams.get('date') ?? '');
	const [dense, setDense] = useState(true);

	const fetchTrades = useCallback(async () => {
		setLoading(true);
		const params = new URLSearchParams();
		if (symbolFilter) params.set('symbol', symbolFilter);
		if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
		if (instrumentFilter && instrumentFilter !== 'all') params.set('instrument', instrumentFilter);
		if (strategyFilter && strategyFilter !== 'all') params.set('strategyId', strategyFilter);
		if (dateFilter) params.set('date', dateFilter);

		const res = await fetch(`/api/trades?${params.toString()}`);
		if (res.ok) {
			const data = (await res.json()) as { trades: Trade[]; total: number };
			setTrades(data.trades);
			setTotal(data.total);
		}
		setLoading(false);
	}, [symbolFilter, statusFilter, instrumentFilter, strategyFilter, dateFilter]);

	useEffect(() => {
		fetch('/api/strategies')
			.then((r) => r.json())
			.then((data) => setStrategies(data as Strategy[]));
	}, []);

	useEffect(() => {
		fetchTrades();
	}, [fetchTrades]);

	const getStrategyName = (id: string | null) => {
		if (!id) return '—';
		return strategies.find((s) => s.id === id)?.name ?? '—';
	};

	const clearDateFilter = () => {
		setDateFilter('');
		// Remove from URL too
		router.replace('/journal');
	};

	const exportCsv = () => {
		const headers = [
			'Date',
			'Symbol',
			'Strategy',
			'Direction',
			'Instrument',
			'Status',
			'P&L',
			'R',
			'Notes',
		];
		const rows = trades.map((t) => [
			new Date(t.openedAt).toLocaleDateString(),
			t.symbol,
			getStrategyName(t.strategyId),
			t.direction,
			t.instrument,
			t.status,
			t.realizedPnlUsd?.toFixed(2) ?? '',
			t.realizedPnlR?.toFixed(2) ?? '',
			(t.notesMd ?? '').replace(/\n/g, ' ').slice(0, 100),
		]);
		const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `pk_trades_export_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<p className="eyebrow">journal</p>
					<h1 className="text-[20px] font-medium text-pk-white mt-1">Trade journal</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="small" onClick={exportCsv} title="Export CSV (Cmd+E)">
						Export
					</Button>
					<Link href="/trades/new">
						<Button variant="primary" size="small">
							+ New trade
						</Button>
					</Link>
				</div>
			</div>

			{/* Active date filter chip */}
			{dateFilter && (
				<div className="flex items-center gap-2">
					<span className="text-[12px] text-pk-white-dim">Filtered by date:</span>
					<span className="inline-flex items-center gap-1.5 rounded-[4px] bg-pk-purple-faint px-2 py-0.5 text-[12px] text-pk-purple-bright border border-pk-purple/20">
						{new Date(`${dateFilter}T12:00:00`).toLocaleDateString(undefined, {
							weekday: 'short',
							year: 'numeric',
							month: 'short',
							day: 'numeric',
						})}
						<button
							type="button"
							onClick={clearDateFilter}
							className="text-pk-white-dim hover:text-pk-white ml-0.5"
							aria-label="Clear date filter"
						>
							×
						</button>
					</span>
					<Link
						href="/calendar"
						className="text-[13px] sm:text-[11px] text-pk-white-dim hover:text-pk-purple-bright transition-colors"
					>
						← Back to calendar
					</Link>
				</div>
			)}

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<Input
					placeholder="Symbol…"
					value={symbolFilter}
					onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
					className="w-24"
				/>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-28">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All</SelectItem>
						<SelectItem value="open">Open</SelectItem>
						<SelectItem value="closed">Closed</SelectItem>
					</SelectContent>
				</Select>
				<Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
					<SelectTrigger className="w-32">
						<SelectValue placeholder="Instrument" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All</SelectItem>
						<SelectItem value="option_spread">Spread</SelectItem>
						<SelectItem value="stock">Stock</SelectItem>
					</SelectContent>
				</Select>
				{strategies.length > 0 && (
					<Select value={strategyFilter} onValueChange={setStrategyFilter}>
						<SelectTrigger className="w-36">
							<SelectValue placeholder="Strategy" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							{strategies.map((s) => (
								<SelectItem key={s.id} value={s.id}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<button
					type="button"
					onClick={() => setDense(!dense)}
					className="text-[13px] sm:text-[11px] text-pk-white-dim hover:text-pk-white transition-colors px-2"
				>
					{dense ? 'Comfortable' : 'Dense'}
				</button>
				<span className="text-[13px] sm:text-[11px] text-pk-white-dim ml-auto">{total} trades</span>
			</div>

			{/* Table */}
			{loading ? (
				<p className="text-[13px] text-pk-white-dim">Loading…</p>
			) : trades.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-[14px] text-pk-white-muted">
						{dateFilter ? `No trades on ${dateFilter}.` : 'No trades found.'}
					</p>
					<p className="text-[12px] text-pk-white-dim mt-1">
						{dateFilter ? (
							<button
								type="button"
								onClick={clearDateFilter}
								className="hover:text-pk-purple-bright transition-colors underline"
							>
								Clear date filter
							</button>
						) : (
							'Log your first trade to get started.'
						)}
					</p>
				</div>
			) : (
				<TableWrapper>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Symbol</TableHead>
								<TableHead className="hidden sm:table-cell">Strategy</TableHead>
								<TableHead className="hidden sm:table-cell">Dir</TableHead>
								<TableHead className="text-right">R</TableHead>
								<TableHead className="text-right">P&amp;L</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{trades.map((trade) => {
								const isWin = (trade.realizedPnlUsd ?? 0) > 0;
								const statusVariant =
									trade.status === 'open'
										? 'open'
										: isWin
											? 'win'
											: trade.status === 'closed'
												? 'loss'
												: 'muted';

								return (
									<TableRow key={trade.id}>
										<TableCell
											className={`font-mono tabular-nums text-pk-white ${dense ? 'py-1' : ''}`}
										>
											<Link
												href={`/trades/${trade.id}`}
												className="hover:text-pk-purple-bright transition-colors"
											>
												{new Date(trade.openedAt).toLocaleDateString()}
											</Link>
										</TableCell>
										<TableCell className={`text-pk-white font-medium ${dense ? 'py-1' : ''}`}>
											<Link
												href={`/trades/${trade.id}`}
												className="hover:text-pk-purple-bright transition-colors"
											>
												{trade.symbol}
											</Link>
										</TableCell>
										<TableCell className={`hidden sm:table-cell ${dense ? 'py-1' : ''}`}>
											{getStrategyName(trade.strategyId)}
										</TableCell>
										<TableCell className={`hidden sm:table-cell ${dense ? 'py-1' : ''}`}>
											{trade.direction}
										</TableCell>
										<TableCell
											className={`text-right font-mono tabular-nums ${dense ? 'py-1' : ''} ${
												isWin ? 'text-pk-white' : 'text-pk-purple'
											}`}
										>
											{trade.realizedPnlR != null
												? `${trade.realizedPnlR >= 0 ? '+' : ''}${trade.realizedPnlR.toFixed(2)}R`
												: '—'}
										</TableCell>
										<TableCell
											className={`text-right font-mono tabular-nums ${dense ? 'py-1' : ''} ${
												isWin ? 'text-pk-white' : 'text-pk-purple'
											}`}
										>
											{trade.realizedPnlUsd != null
												? `${trade.realizedPnlUsd >= 0 ? '+' : ''}$${trade.realizedPnlUsd.toFixed(2)}`
												: '—'}
										</TableCell>
										<TableCell className={dense ? 'py-1' : ''}>
											<Badge variant={statusVariant}>
												{trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
											</Badge>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableWrapper>
			)}
		</div>
	);
}

export default function JournalPage() {
	return (
		<Suspense fallback={<p className="text-[13px] text-pk-white-dim">Loading…</p>}>
			<JournalContent />
		</Suspense>
	);
}
