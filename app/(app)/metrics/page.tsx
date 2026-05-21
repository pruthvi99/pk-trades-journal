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
		totalPnlUsd: number;
		totalPnlPercent: number;
		winRate: number;
		profitFactor: number;
		expectancyUsd: number;
		expectancyR: number;
		averageR: number;
		medianR: number;
	};
	distribution: {
		equityCurve: Array<{
			tradeIndex: number;
			closedAt: string;
			cumulativePnl: number;
			equity: number;
		}>;
		maxDrawdown: {
			maxDrawdownUsd: number;
			maxDrawdownPercent: number;
			longestDrawdownDays: number;
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
	};
	risk: {
		avgRiskUsd: number;
		avgRiskPercent: number;
		largestLossUsd: number;
		riskAdjustedReturn: number;
		planAdherenceRate: number;
	};
	psychology: {
		confidenceByOutcome: { winnersAvg: number; losersAvg: number };
		winRateByMood: Array<{ mood: string; trades: number; winPercent: number }>;
		winRateBySleep: {
			underSixHours: { trades: number; winPercent: number };
			sixPlusHours: { trades: number; winPercent: number };
		};
		wouldRetakeRate: number;
	};
}

export default function MetricsPage() {
	const [data, setData] = useState<MetricsData | null>(null);
	const [loading, setLoading] = useState(true);
	const startingBalance = 25000; // TODO: read from settings

	useEffect(() => {
		fetch(`/api/metrics?startingBalance=${startingBalance}`)
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
	const pnlVariant = headline.totalPnlUsd >= 0 ? 'win' : 'loss';

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
						value={`${headline.totalPnlUsd >= 0 ? '+' : ''}$${headline.totalPnlUsd.toFixed(2)}`}
						suffix={`(${headline.totalPnlPercent >= 0 ? '+' : ''}${headline.totalPnlPercent.toFixed(1)}%)`}
						variant={pnlVariant}
					/>
					<StatCard
						label="Win Rate"
						value={`${headline.winRate.toFixed(1)}%`}
						variant={headline.winRate >= 50 ? 'win' : 'loss'}
					/>
					<StatCard
						label="Profit Factor"
						value={
							headline.profitFactor === Number.POSITIVE_INFINITY
								? '∞'
								: headline.profitFactor.toFixed(2)
						}
						variant={headline.profitFactor >= 1 ? 'win' : 'loss'}
					/>
					<StatCard
						label="Expectancy"
						value={`${headline.expectancyUsd >= 0 ? '+' : ''}$${headline.expectancyUsd.toFixed(2)}`}
						suffix={`(${headline.expectancyR >= 0 ? '+' : ''}${headline.expectancyR.toFixed(2)}R)`}
						variant={headline.expectancyUsd >= 0 ? 'win' : 'loss'}
					/>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
					<StatCard
						label="Avg R"
						value={`${headline.averageR >= 0 ? '+' : ''}${headline.averageR.toFixed(2)}R`}
						variant={headline.averageR >= 0 ? 'win' : 'loss'}
					/>
					<StatCard
						label="Median R"
						value={`${headline.medianR >= 0 ? '+' : ''}${headline.medianR.toFixed(2)}R`}
						variant={headline.medianR >= 0 ? 'win' : 'loss'}
					/>
					<StatCard
						label="Max Drawdown"
						value={`-$${distribution.maxDrawdown.maxDrawdownUsd.toFixed(2)}`}
						suffix={`(-${distribution.maxDrawdown.maxDrawdownPercent.toFixed(1)}%)`}
						variant="loss"
					/>
					<StatCard
						label="DD Duration"
						value={`${distribution.maxDrawdown.longestDrawdownDays}`}
						suffix="days"
						variant="neutral"
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
				</div>
			</section>

			{/* Risk */}
			<section>
				<p className="eyebrow mb-3">Risk</p>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<StatCard
						label="Avg Risk"
						value={`$${risk.avgRiskUsd.toFixed(2)}`}
						suffix={`(${risk.avgRiskPercent.toFixed(1)}%)`}
						variant="neutral"
					/>
					<StatCard
						label="Largest Loss"
						value={`${risk.largestLossUsd < 0 ? '-' : ''}$${Math.abs(risk.largestLossUsd).toFixed(2)}`}
						variant="loss"
					/>
					<StatCard
						label="Risk-Adj Return"
						value={
							risk.riskAdjustedReturn === Number.POSITIVE_INFINITY
								? '∞'
								: risk.riskAdjustedReturn.toFixed(2)
						}
						variant={risk.riskAdjustedReturn >= 1 ? 'win' : 'loss'}
					/>
					<StatCard
						label="Plan Adherence"
						value={`${risk.planAdherenceRate.toFixed(0)}%`}
						variant={risk.planAdherenceRate >= 80 ? 'win' : 'neutral'}
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
						value={psychology.confidenceByOutcome.winnersAvg.toFixed(1)}
						suffix="/ 10"
						variant="win"
					/>
					<StatCard
						label="Confidence → Losses"
						value={psychology.confidenceByOutcome.losersAvg.toFixed(1)}
						suffix="/ 10"
						variant="loss"
					/>
					<StatCard
						label="Would Retake"
						value={`${psychology.wouldRetakeRate.toFixed(0)}%`}
						variant={psychology.wouldRetakeRate >= 70 ? 'win' : 'neutral'}
					/>
					<div className="rounded-[6px] border border-pk-border bg-pk-black-raised px-4 py-3">
						<p className="text-[11px] text-pk-white-dim font-medium uppercase tracking-wider">
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
						<p className="text-[11px] text-pk-white-dim font-medium uppercase tracking-wider mb-3">
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
									<span className="text-[11px] text-pk-white-dim">({m.trades})</span>
								</div>
							))}
						</div>
					</div>
				)}
			</section>
		</div>
	);
}
