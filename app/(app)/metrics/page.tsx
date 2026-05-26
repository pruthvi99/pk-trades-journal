/**
 * Metrics dashboard — headline stats, charts, edge slicing, risk, psychology.
 * Fetches all metrics from GET /api/metrics and renders visualizations.
 */

'use client';

import { useEffect, useState } from 'react';
import { EdgeTable } from '@/components/metrics/edge-table';
import { EquityChart } from '@/components/metrics/equity-chart';
import { RHistogram } from '@/components/metrics/r-histogram';
import { StatCard } from '@/components/metrics/stat-card';

interface EdgeRow {
	label: string;
	trades: number;
	winPercent: number;
	avgR: number;
	expectancyUsd: number;
	totalUsd: number;
}

interface MetricsData {
	summary: {
		totalTrades: number;
		openTrades: number;
		closedTrades: number;
	};
	headline: {
		totalPnlUsd: number | null;
		totalPnlPercent: number | null;
		winRate: number | null;
		profitFactor: number | null;
		expectancyUsd: number | null;
		expectancyR: number | null;
		averageR: number | null;
		medianR: number | null;
		avgWinUsd: number | null;
		avgLossUsd: number | null;
		payoffRatio: number | null;
		bestTradeUsd: number | null;
		worstTradeUsd: number | null;
		kellyCriterion: number | null;
		winCount: number;
		lossCount: number;
		breakEvenCount: number;
		grossProfit: number | null;
		grossLoss: number | null;
		pnlStdDev: number | null;
	};
	distribution: {
		equityCurve: Array<{
			tradeIndex: number;
			closedAt: string;
			cumulativePnl: number;
			equity: number;
		}>;
		maxDrawdown: {
			maxDrawdownUsd: number | null;
			maxDrawdownPercent: number | null;
			longestDrawdownDays: number | null;
		};
		streaks: {
			currentStreak: number;
			currentStreakType: 'win' | 'loss' | 'none';
			maxWinStreak: number;
			maxLossStreak: number;
		};
		rDistribution: number[];
	};
	edge: {
		bySymbol: EdgeRow[];
		byStrategy: EdgeRow[];
		byDayOfWeek: EdgeRow[];
		byInstrument: EdgeRow[];
		byQuality: EdgeRow[];
		byBasis: EdgeRow[];
	};
	risk: {
		avgRiskUsd: number | null;
		avgRiskPercent: number | null;
		largestLossUsd: number | null;
		riskAdjustedReturn: number | null;
		planAdherenceRate: number | null;
	};
	psychology: {
		confidenceByOutcome: { winnersAvg: number | null; losersAvg: number | null };
		winRateByMood: Array<{ mood: string; trades: number; winPercent: number }>;
		winRateBySleep: {
			underSixHours: { trades: number; winPercent: number };
			sixPlusHours: { trades: number; winPercent: number };
		};
		wouldRetakeRate: number | null;
	};
}

/** Null-safe number formatter. Returns fallback for null/undefined/NaN/Infinity. */
function fmt(value: number | null | undefined, decimals = 2, fallback = '—'): string {
	if (value == null || !Number.isFinite(value)) return fallback;
	return value.toFixed(decimals);
}

/** Safe >= comparison: treat null as 0. */
function gte(value: number | null | undefined, threshold: number): boolean {
	return (value ?? 0) >= threshold;
}

/** Safe sign prefix for display. */
function signed(value: number | null | undefined, decimals = 2): string {
	if (value == null || !Number.isFinite(value)) return '—';
	return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}`;
}

export default function MetricsPage() {
	const [data, setData] = useState<MetricsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [startingBalance, setStartingBalance] = useState(25000);

	useEffect(() => {
		// Load settings first to get the user's starting balance, then fetch metrics
		fetch('/api/settings')
			.then((r) => r.json())
			.then((settings: Record<string, string>) => {
				const balance = Number(settings.startingBalance ?? 25000);
				setStartingBalance(balance);
				return fetch(`/api/metrics?startingBalance=${balance}`);
			})
			.then((r) => r.json())
			.then((d) => {
				setData(d as MetricsData);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<p className="eyebrow">metrics</p>
					<h1 className="text-[20px] font-medium text-pk-white mt-1">Performance</h1>
				</div>
				<p className="text-[13px] text-pk-white-dim">Loading metrics…</p>
			</div>
		);
	}

	if (!data || data.summary.totalTrades === 0) {
		return (
			<div className="space-y-6">
				<div>
					<p className="eyebrow">metrics</p>
					<h1 className="text-[20px] font-medium text-pk-white mt-1">Performance</h1>
				</div>
				<div className="text-center py-12">
					<p className="text-[14px] text-pk-white-muted">No trades yet.</p>
					<p className="text-[12px] text-pk-white-dim mt-1">
						Log and close some trades to see your metrics.
					</p>
				</div>
			</div>
		);
	}

	const { summary, headline, distribution, edge, risk, psychology } = data;
	const pnlVariant = gte(headline.totalPnlUsd, 0) ? 'win' : 'loss';

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<p className="eyebrow">metrics</p>
				<h1 className="text-[20px] font-medium text-pk-white mt-1">Performance</h1>
				<p className="text-[12px] text-pk-white-dim mt-1">
					{summary.closedTrades} closed · {summary.openTrades} open · {summary.totalTrades} total
				</p>
			</div>

			{/* Headline Stats */}
			<section>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<StatCard
						label="Total P&L"
						value={`${signed(headline.totalPnlUsd)}$${fmt(headline.totalPnlUsd != null ? Math.abs(headline.totalPnlUsd) : null)}`}
						suffix={`(${signed(headline.totalPnlPercent, 1)}%)`}
						variant={pnlVariant}
					/>
					<StatCard
						label="Win Rate"
						value={`${fmt(headline.winRate, 1)}%`}
						variant={gte(headline.winRate, 50) ? 'win' : 'loss'}
					/>
					<StatCard
						label="Profit Factor"
						value={headline.profitFactor == null ? '∞' : fmt(headline.profitFactor)}
						variant={gte(headline.profitFactor, 1) ? 'win' : 'loss'}
					/>
					<StatCard
						label="Expectancy"
						value={`${signed(headline.expectancyUsd)}$${fmt(headline.expectancyUsd != null ? Math.abs(headline.expectancyUsd) : null)}`}
						suffix={headline.expectancyR != null ? `(${signed(headline.expectancyR)}R)` : undefined}
						variant={gte(headline.expectancyUsd, 0) ? 'win' : 'loss'}
					/>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
					<StatCard
						label="Avg R"
						value={headline.averageR != null ? `${signed(headline.averageR)}R` : '—'}
						variant={gte(headline.averageR, 0) ? 'win' : 'loss'}
					/>
					<StatCard
						label="Median R"
						value={headline.medianR != null ? `${signed(headline.medianR)}R` : '—'}
						variant={gte(headline.medianR, 0) ? 'win' : 'loss'}
					/>
					<StatCard
						label="Max Drawdown"
						value={
							distribution.maxDrawdown.maxDrawdownUsd != null
								? `-$${fmt(distribution.maxDrawdown.maxDrawdownUsd)}`
								: '—'
						}
						suffix={
							distribution.maxDrawdown.maxDrawdownPercent != null
								? `(-${fmt(distribution.maxDrawdown.maxDrawdownPercent, 1)}%)`
								: undefined
						}
						variant="loss"
					/>
					<StatCard
						label="DD Duration"
						value={`${distribution.maxDrawdown.longestDrawdownDays ?? '—'}`}
						suffix="days"
						variant="neutral"
					/>
				</div>

				{/* Win/Loss Breakdown */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
					<StatCard
						label="Avg Win"
						value={headline.avgWinUsd != null ? `+$${fmt(headline.avgWinUsd)}` : '—'}
						variant="win"
					/>
					<StatCard
						label="Avg Loss"
						value={headline.avgLossUsd != null ? `-$${fmt(Math.abs(headline.avgLossUsd))}` : '—'}
						variant="loss"
					/>
					<StatCard
						label="Payoff Ratio"
						value={headline.payoffRatio == null ? '∞' : fmt(headline.payoffRatio)}
						suffix="(W/L ratio)"
						variant={gte(headline.payoffRatio, 1) ? 'win' : 'loss'}
					/>
					<StatCard
						label="Kelly %"
						value={headline.kellyCriterion != null ? `${fmt(headline.kellyCriterion, 1)}%` : '—'}
						suffix="optimal size"
						variant={gte(headline.kellyCriterion, 0) ? 'win' : 'loss'}
					/>
				</div>

				{/* Best/Worst & Distribution */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
					<StatCard
						label="Best Trade"
						value={headline.bestTradeUsd != null ? `+$${fmt(headline.bestTradeUsd)}` : '—'}
						variant="win"
					/>
					<StatCard
						label="Worst Trade"
						value={
							headline.worstTradeUsd != null ? `-$${fmt(Math.abs(headline.worstTradeUsd))}` : '—'
						}
						variant="loss"
					/>
					<StatCard
						label="P&L Std Dev"
						value={headline.pnlStdDev != null ? `$${fmt(headline.pnlStdDev)}` : '—'}
						variant="neutral"
					/>
					<div className="rounded-[6px] border border-pk-border bg-pk-black-raised px-4 py-3">
						<p className="text-[12px] sm:text-[11px] text-pk-white-dim font-medium uppercase tracking-wider">
							Win / Loss / BE
						</p>
						<p className="mt-1.5 font-mono tabular-nums text-[16px]">
							<span className="text-green-400">{headline.winCount}W</span>{' '}
							<span className="text-red-400">{headline.lossCount}L</span>{' '}
							<span className="text-pk-white-dim">{headline.breakEvenCount}BE</span>
						</p>
					</div>
				</div>

				{/* Gross P&L Breakdown */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
					<StatCard
						label="Gross Profit"
						value={headline.grossProfit != null ? `+$${fmt(headline.grossProfit)}` : '—'}
						variant="win"
					/>
					<StatCard
						label="Gross Loss"
						value={headline.grossLoss != null ? `-$${fmt(headline.grossLoss)}` : '—'}
						variant="loss"
					/>
					<StatCard
						label="Net P&L"
						value={`${signed(headline.totalPnlUsd)}$${fmt(headline.totalPnlUsd != null ? Math.abs(headline.totalPnlUsd) : null)}`}
						variant={pnlVariant}
					/>
					<StatCard
						label="Profit Factor"
						value={headline.profitFactor == null ? '∞' : fmt(headline.profitFactor)}
						suffix="(gross W / L)"
						variant={gte(headline.profitFactor, 1) ? 'win' : 'loss'}
					/>
				</div>
			</section>

			{/* Equity Curve */}
			<section>
				<p className="eyebrow mb-3">Equity curve</p>
				<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4">
					<EquityChart data={distribution.equityCurve} startingBalance={startingBalance} />
				</div>
			</section>

			{/* R-Multiple Distribution + Streaks */}
			<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div>
					<p className="eyebrow mb-3">R-multiple distribution</p>
					<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4">
						<RHistogram rValues={distribution.rDistribution} />
					</div>
				</div>
				<div>
					<p className="eyebrow mb-3">Streaks</p>
					<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4 space-y-4">
						<div className="flex justify-between items-center">
							<span className="text-[13px] text-pk-white-dim">Current streak</span>
							<span
								className={`font-mono tabular-nums text-[16px] font-medium ${
									distribution.streaks.currentStreakType === 'win'
										? 'text-pk-white'
										: distribution.streaks.currentStreakType === 'loss'
											? 'text-pk-purple'
											: 'text-pk-white-dim'
								}`}
							>
								{distribution.streaks.currentStreak}
								{distribution.streaks.currentStreakType !== 'none'
									? distribution.streaks.currentStreakType === 'win'
										? 'W'
										: 'L'
									: ''}
							</span>
						</div>
						<div className="h-px bg-pk-border" />
						<div className="flex justify-between items-center">
							<span className="text-[13px] text-pk-white-dim">Max win streak</span>
							<span className="font-mono tabular-nums text-[16px] font-medium text-pk-white">
								{distribution.streaks.maxWinStreak}W
							</span>
						</div>
						<div className="h-px bg-pk-border" />
						<div className="flex justify-between items-center">
							<span className="text-[13px] text-pk-white-dim">Max loss streak</span>
							<span className="font-mono tabular-nums text-[16px] font-medium text-pk-purple">
								{distribution.streaks.maxLossStreak}L
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* Edge Slicing */}
			<section className="space-y-6">
				<p className="eyebrow">Edge analysis</p>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<EdgeTable rows={edge.byStrategy} title="By strategy" />
					<EdgeTable rows={edge.bySymbol} title="By symbol" />
					<EdgeTable rows={edge.byDayOfWeek} title="By day of week" />
					<EdgeTable rows={edge.byInstrument} title="By instrument" />
					<EdgeTable rows={edge.byQuality} title="By trade quality" />
					<EdgeTable rows={edge.byBasis} title="By trade basis" />
				</div>
			</section>

			{/* Risk */}
			<section>
				<p className="eyebrow mb-3">Risk</p>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<StatCard
						label="Avg Risk"
						value={risk.avgRiskUsd != null ? `$${fmt(risk.avgRiskUsd)}` : '—'}
						suffix={risk.avgRiskPercent != null ? `(${fmt(risk.avgRiskPercent, 1)}%)` : undefined}
						variant="neutral"
					/>
					<StatCard
						label="Largest Loss"
						value={
							risk.largestLossUsd != null
								? `${(risk.largestLossUsd ?? 0) < 0 ? '-' : ''}$${fmt(Math.abs(risk.largestLossUsd ?? 0))}`
								: '—'
						}
						variant="loss"
					/>
					<StatCard
						label="Risk-Adj Return"
						value={risk.riskAdjustedReturn == null ? '∞' : fmt(risk.riskAdjustedReturn)}
						variant={gte(risk.riskAdjustedReturn, 1) ? 'win' : 'loss'}
					/>
					<StatCard
						label="Plan Adherence"
						value={risk.planAdherenceRate != null ? `${fmt(risk.planAdherenceRate, 0)}%` : '—'}
						variant={gte(risk.planAdherenceRate, 80) ? 'win' : 'neutral'}
					/>
				</div>
			</section>

			{/* Psychology */}
			<section className="space-y-4 pb-8">
				<p className="eyebrow">Psychology vs outcome</p>

				{/* Confidence on winners vs losers */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<StatCard
						label="Confidence → Wins"
						value={
							psychology.confidenceByOutcome.winnersAvg != null
								? fmt(psychology.confidenceByOutcome.winnersAvg, 1)
								: '—'
						}
						suffix="/ 10"
						variant="win"
					/>
					<StatCard
						label="Confidence → Losses"
						value={
							psychology.confidenceByOutcome.losersAvg != null
								? fmt(psychology.confidenceByOutcome.losersAvg, 1)
								: '—'
						}
						suffix="/ 10"
						variant="loss"
					/>
					<StatCard
						label="Would Retake"
						value={
							psychology.wouldRetakeRate != null ? `${fmt(psychology.wouldRetakeRate, 0)}%` : '—'
						}
						variant={gte(psychology.wouldRetakeRate, 70) ? 'win' : 'neutral'}
					/>
					<div className="rounded-[6px] border border-pk-border bg-pk-black-raised px-4 py-3">
						<p className="text-[12px] sm:text-[11px] text-pk-white-dim font-medium uppercase tracking-wider">
							Sleep &amp; Win Rate
						</p>
						<div className="mt-2 space-y-1">
							<div className="flex justify-between text-[12px]">
								<span className="text-pk-white-dim">&lt;6h sleep</span>
								<span className="font-mono tabular-nums text-pk-purple">
									{psychology.winRateBySleep.underSixHours.winPercent.toFixed(0)}% (
									{psychology.winRateBySleep.underSixHours.trades})
								</span>
							</div>
							<div className="flex justify-between text-[12px]">
								<span className="text-pk-white-dim">≥6h sleep</span>
								<span className="font-mono tabular-nums text-pk-white">
									{psychology.winRateBySleep.sixPlusHours.winPercent.toFixed(0)}% (
									{psychology.winRateBySleep.sixPlusHours.trades})
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Win rate by mood */}
				{psychology.winRateByMood.length > 0 && (
					<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4">
						<p className="text-[12px] sm:text-[11px] text-pk-white-dim font-medium uppercase tracking-wider mb-3">
							Win rate by mood
						</p>
						<div className="flex flex-wrap gap-3">
							{psychology.winRateByMood.map((m) => (
								<div
									key={m.mood}
									className="flex items-center gap-2 rounded-[6px] bg-pk-black-sunken px-3 py-2"
								>
									<span className="text-[13px] text-pk-white-muted capitalize">{m.mood}</span>
									<span
										className={`font-mono tabular-nums text-[13px] font-medium ${
											m.winPercent >= 50 ? 'text-pk-white' : 'text-pk-purple'
										}`}
									>
										{m.winPercent.toFixed(0)}%
									</span>
									<span className="text-[13px] sm:text-[11px] text-pk-white-dim">({m.trades})</span>
								</div>
							))}
						</div>
					</div>
				)}
			</section>
		</div>
	);
}
