/**
 * Analytics deep-dive — tabbed interface with professional-grade
 * trading analytics for pattern identification and performance improvement.
 */

'use client';

import { useEffect, useState } from 'react';
import { CalibrationChart } from '@/components/analytics/calibration-chart';
import { ComparisonCard } from '@/components/analytics/comparison-card';
import { FrequencyChart } from '@/components/analytics/frequency-chart';
import { HeatmapChart } from '@/components/analytics/heatmap';
import { HoldingPeriodChart } from '@/components/analytics/holding-period-chart';
import { MonthlyGrid } from '@/components/analytics/monthly-grid';
import { MonthlyPnlChart } from '@/components/analytics/monthly-pnl-chart';
import { RollingMetricsChart } from '@/components/analytics/rolling-metrics-chart';
import { TiltChart } from '@/components/analytics/tilt-chart';
import { UnderwaterChart } from '@/components/analytics/underwater-chart';
import { EdgeTable } from '@/components/metrics/edge-table';
import { StatCard } from '@/components/metrics/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';

// ─── Types ─────────────────────────────────────────────────────────────────

interface EdgeRow {
	label: string;
	trades: number;
	winPercent: number;
	avgR: number;
	expectancyUsd: number;
	totalUsd: number;
}

interface AnalyticsData {
	timeAnalysis: {
		monthlyPnl: Array<{
			month: string;
			label: string;
			pnlUsd: number;
			trades: number;
			wins: number;
			losses: number;
			winPercent: number;
		}>;
		weeklyPnl: Array<{
			weekStart: string;
			label: string;
			pnlUsd: number;
			trades: number;
		}>;
		rolling10: Array<{
			tradeIndex: number;
			closedAt: string;
			rollingPnl: number;
			rollingWinRate: number;
			rollingExpectancy: number;
			rollingAvgR: number;
		}>;
		rolling20: Array<{
			tradeIndex: number;
			closedAt: string;
			rollingPnl: number;
			rollingWinRate: number;
			rollingExpectancy: number;
			rollingAvgR: number;
		}>;
		holdingPeriods: Array<{
			label: string;
			order: number;
			trades: number;
			avgPnl: number;
			totalPnl: number;
			winPercent: number;
			avgHoldingHours: number;
		}>;
		frequencyByMonth: Array<{ period: string; label: string; count: number }>;
		frequencyByWeek: Array<{ period: string; label: string; count: number }>;
		heatmap: Array<{
			day: number;
			dayLabel: string;
			hour: number;
			hourLabel: string;
			trades: number;
			pnlUsd: number;
			winPercent: number;
		}>;
	};
	advancedRisk: {
		sharpeRatio: number;
		sortinoRatio: number;
		calmarRatio: number;
		recoveryFactor: number;
		underwaterCurve: Array<{
			tradeIndex: number;
			closedAt: string;
			drawdownUsd: number;
			drawdownPercent: number;
		}>;
		feeImpact: {
			totalFeesUsd: number;
			feesAsPercentOfGrossProfit: number;
			avgFeePerTrade: number;
			monthlyFees: Array<{ month: string; label: string; fees: number; trades: number }>;
		};
		riskSizeBins: Array<{
			label: string;
			order: number;
			trades: number;
			avgPnl: number;
			totalPnl: number;
			winPercent: number;
			avgRiskUsd: number;
		}>;
		monthlyGrid: Array<{
			year: number;
			month: number;
			label: string;
			pnlUsd: number;
			trades: number;
		}>;
		directionAnalysis: Array<{
			direction: string;
			trades: number;
			wins: number;
			winPercent: number;
			avgPnl: number;
			totalPnl: number;
			avgR: number;
		}>;
	};
	edgeExtended: {
		byTag: EdgeRow[];
		byHour: EdgeRow[];
		byQuality: EdgeRow[];
		byBasis: EdgeRow[];
	};
	behavioral: {
		tiltDetection: Array<{
			label: string;
			streakType: 'win' | 'loss';
			streakLength: number;
			nextTrades: number;
			nextWinPercent: number;
			nextAvgPnl: number;
		}>;
		confidenceCalibration: Array<{
			label: string;
			minConf: number;
			maxConf: number;
			trades: number;
			actualWinPercent: number;
			avgPnl: number;
			avgR: number;
		}>;
		revengeTradeDetection: {
			revengeTradeCount: number;
			totalTrades: number;
			revengePercent: number;
			revengeWinPercent: number;
			normalWinPercent: number;
			revengeAvgPnl: number;
			normalAvgPnl: number;
		};
		overtradingDetection: {
			avgTradesPerDay: number;
			maxTradesInDay: number;
			overtradeDays: Array<{
				date: string;
				trades: number;
				pnlUsd: number;
				winPercent: number;
			}>;
			highVolumeWinPercent: number;
			lowVolumeWinPercent: number;
			highVolumeAvgPnl: number;
			lowVolumeAvgPnl: number;
		};
		planDeviationImpact: {
			followedPlanTrades: number;
			deviatedTrades: number;
			followedWinPercent: number;
			deviatedWinPercent: number;
			followedAvgPnl: number;
			deviatedAvgPnl: number;
			followedAvgR: number;
			deviatedAvgR: number;
		};
		stressAnalysis: Array<{
			label: string;
			trades: number;
			winPercent: number;
			avgPnl: number;
		}>;
	};
}

// ─── Section Header ────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
	return <h3 className="eyebrow mt-6 mb-3 first:mt-0">{title}</h3>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
	const [data, setData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [rollingMetric, setRollingMetric] = useState<'winRate' | 'expectancy' | 'avgR' | 'pnl'>(
		'winRate',
	);
	const startingBalance = 25000;

	useEffect(() => {
		fetch(`/api/analytics?startingBalance=${startingBalance}`)
			.then((r) => r.json())
			.then((d) => {
				setData(d as AnalyticsData);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<p className="eyebrow">analytics</p>
					<h1 className="text-[20px] font-medium text-pk-white mt-1">Deep Dive</h1>
				</div>
				<p className="text-[13px] text-pk-white-dim">Loading analytics…</p>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="space-y-6">
				<div>
					<p className="eyebrow">analytics</p>
					<h1 className="text-[20px] font-medium text-pk-white mt-1">Deep Dive</h1>
				</div>
				<div className="text-center py-12">
					<p className="text-[14px] text-pk-white-muted">No trades yet.</p>
					<p className="text-[12px] text-pk-white-dim mt-1">
						Log and close some trades to see analytics.
					</p>
				</div>
			</div>
		);
	}

	const { timeAnalysis, advancedRisk, edgeExtended, behavioral } = data;

	// Compute overall win rate for tilt reference line
	const totalClosedForWinRate =
		behavioral.tiltDetection.length > 0
			? (() => {
					// Estimate from calibration data
					const calTrades = behavioral.confidenceCalibration.reduce((s, b) => s + b.trades, 0);
					const calWins = behavioral.confidenceCalibration.reduce(
						(s, b) => s + Math.round((b.trades * b.actualWinPercent) / 100),
						0,
					);
					return calTrades > 0 ? Math.round((calWins / calTrades) * 100) : 50;
				})()
			: 50;

	return (
		<div className="space-y-4">
			{/* Header */}
			<div>
				<p className="eyebrow">analytics</p>
				<h1 className="text-[20px] font-medium text-pk-white mt-1">Deep Dive</h1>
				<p className="text-[13px] text-pk-white-dim mt-0.5">
					Pattern identification &amp; performance improvement
				</p>
			</div>

			{/* Tabbed Interface */}
			<Tabs defaultValue="performance">
				<TabsList className="w-full overflow-x-auto">
					<TabsTrigger value="performance">Performance</TabsTrigger>
					<TabsTrigger value="risk">Risk</TabsTrigger>
					<TabsTrigger value="patterns">Patterns</TabsTrigger>
					<TabsTrigger value="behavioral">Behavioral</TabsTrigger>
				</TabsList>

				{/* ═══ Tab 1: Performance Over Time ═══ */}
				<TabsContent value="performance">
					<div className="space-y-2">
						{/* Monthly P&L */}
						<SectionHeader title="Monthly P&L" />
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<MonthlyPnlChart data={timeAnalysis.monthlyPnl} />
						</div>

						{/* Monthly P&L Table */}
						{timeAnalysis.monthlyPnl.length > 0 && (
							<div className="rounded-[6px] border border-pk-border bg-pk-black-raised overflow-hidden">
								<table className="w-full text-[12px]">
									<thead>
										<tr className="border-b border-pk-border text-pk-white-dim text-left">
											<th className="px-3 py-2 font-medium">Month</th>
											<th className="px-3 py-2 font-medium text-right">Trades</th>
											<th className="px-3 py-2 font-medium text-right">Win%</th>
											<th className="px-3 py-2 font-medium text-right">P&L</th>
										</tr>
									</thead>
									<tbody>
										{timeAnalysis.monthlyPnl.map((m) => (
											<tr key={m.month} className="border-b border-pk-border/50 last:border-0">
												<td className="px-3 py-2 text-pk-white">{m.label}</td>
												<td className="px-3 py-2 text-right text-pk-white-muted">{m.trades}</td>
												<td className="px-3 py-2 text-right text-pk-white-muted">
													{m.winPercent}%
												</td>
												<td
													className={`px-3 py-2 text-right font-mono ${m.pnlUsd >= 0 ? 'text-green-400' : 'text-red-400'}`}
												>
													{m.pnlUsd >= 0 ? '+' : ''}${m.pnlUsd.toLocaleString()}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{/* Year at a Glance */}
						<SectionHeader title="Year at a Glance" />
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4">
							<MonthlyGrid data={advancedRisk.monthlyGrid} />
						</div>

						{/* Rolling Metrics */}
						<SectionHeader title="Rolling Metrics" />
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<div className="flex gap-1 mb-3 flex-wrap">
								{(['winRate', 'expectancy', 'avgR', 'pnl'] as const).map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setRollingMetric(m)}
										className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
											rollingMetric === m
												? 'bg-pk-purple text-white'
												: 'bg-pk-black-raised border border-pk-border text-pk-white-dim hover:text-pk-white'
										}`}
									>
										{m === 'winRate'
											? 'Win Rate'
											: m === 'expectancy'
												? 'Expectancy'
												: m === 'avgR'
													? 'Avg R'
													: 'P&L'}
									</button>
								))}
							</div>
							<RollingMetricsChart
								data={timeAnalysis.rolling10}
								windowSize={10}
								metric={rollingMetric}
							/>
						</div>

						{/* Trade Frequency */}
						<SectionHeader title="Trade Frequency" />
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<FrequencyChart data={timeAnalysis.frequencyByMonth} />
						</div>
					</div>
				</TabsContent>

				{/* ═══ Tab 2: Risk Deep Dive ═══ */}
				<TabsContent value="risk">
					<div className="space-y-2">
						{/* Advanced Risk Ratios */}
						<SectionHeader title="Risk-Adjusted Returns" />
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							<StatCard label="Sharpe Ratio" value={fmtRatio(advancedRisk.sharpeRatio)} />
							<StatCard label="Sortino Ratio" value={fmtRatio(advancedRisk.sortinoRatio)} />
							<StatCard label="Calmar Ratio" value={fmtRatio(advancedRisk.calmarRatio)} />
							<StatCard label="Recovery Factor" value={fmtRatio(advancedRisk.recoveryFactor)} />
						</div>

						{/* Underwater Curve */}
						<SectionHeader title="Drawdown (Underwater) Curve" />
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<UnderwaterChart data={advancedRisk.underwaterCurve} />
						</div>

						{/* Direction Analysis */}
						{advancedRisk.directionAnalysis.length > 0 && (
							<>
								<SectionHeader title="Direction Analysis" />
								<div className="rounded-[6px] border border-pk-border bg-pk-black-raised overflow-hidden">
									<table className="w-full text-[12px]">
										<thead>
											<tr className="border-b border-pk-border text-pk-white-dim text-left">
												<th className="px-3 py-2 font-medium">Direction</th>
												<th className="px-3 py-2 font-medium text-right">Trades</th>
												<th className="px-3 py-2 font-medium text-right">Win%</th>
												<th className="px-3 py-2 font-medium text-right">Avg R</th>
												<th className="px-3 py-2 font-medium text-right">Avg P&L</th>
												<th className="px-3 py-2 font-medium text-right">Total P&L</th>
											</tr>
										</thead>
										<tbody>
											{advancedRisk.directionAnalysis.map((d) => (
												<tr
													key={d.direction}
													className="border-b border-pk-border/50 last:border-0"
												>
													<td className="px-3 py-2 text-pk-white font-medium">{d.direction}</td>
													<td className="px-3 py-2 text-right text-pk-white-muted">{d.trades}</td>
													<td className="px-3 py-2 text-right text-pk-white-muted">
														{d.winPercent}%
													</td>
													<td className="px-3 py-2 text-right font-mono text-pk-white-muted">
														{d.avgR > 0 ? '+' : ''}
														{d.avgR}R
													</td>
													<td
														className={`px-3 py-2 text-right font-mono ${d.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
													>
														${d.avgPnl.toLocaleString()}
													</td>
													<td
														className={`px-3 py-2 text-right font-mono ${d.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
													>
														{d.totalPnl >= 0 ? '+' : ''}${d.totalPnl.toLocaleString()}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}

						{/* Risk Size Bins */}
						{advancedRisk.riskSizeBins.length > 0 && (
							<>
								<SectionHeader title="Position Size vs Performance" />
								<div className="rounded-[6px] border border-pk-border bg-pk-black-raised overflow-hidden">
									<table className="w-full text-[12px]">
										<thead>
											<tr className="border-b border-pk-border text-pk-white-dim text-left">
												<th className="px-3 py-2 font-medium">Risk Size</th>
												<th className="px-3 py-2 font-medium text-right">Trades</th>
												<th className="px-3 py-2 font-medium text-right">Win%</th>
												<th className="px-3 py-2 font-medium text-right">Avg P&L</th>
												<th className="px-3 py-2 font-medium text-right">Total P&L</th>
											</tr>
										</thead>
										<tbody>
											{advancedRisk.riskSizeBins.map((b) => (
												<tr key={b.label} className="border-b border-pk-border/50 last:border-0">
													<td className="px-3 py-2 text-pk-white">{b.label}</td>
													<td className="px-3 py-2 text-right text-pk-white-muted">{b.trades}</td>
													<td className="px-3 py-2 text-right text-pk-white-muted">
														{b.winPercent}%
													</td>
													<td
														className={`px-3 py-2 text-right font-mono ${b.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
													>
														${b.avgPnl.toLocaleString()}
													</td>
													<td
														className={`px-3 py-2 text-right font-mono ${b.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
													>
														{b.totalPnl >= 0 ? '+' : ''}${b.totalPnl.toLocaleString()}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}

						{/* Fee Impact */}
						<SectionHeader title="Fee Impact" />
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							<StatCard
								label="Total Fees"
								value={`$${advancedRisk.feeImpact.totalFeesUsd.toLocaleString()}`}
							/>
							<StatCard
								label="Fees / Gross Profit"
								value={`${advancedRisk.feeImpact.feesAsPercentOfGrossProfit}%`}
							/>
							<StatCard
								label="Avg Fee / Trade"
								value={`$${advancedRisk.feeImpact.avgFeePerTrade.toLocaleString()}`}
							/>
						</div>
					</div>
				</TabsContent>

				{/* ═══ Tab 3: Pattern Analysis ═══ */}
				<TabsContent value="patterns">
					<div className="space-y-2">
						{/* Time Heatmap */}
						<SectionHeader title="P&L by Day & Hour (UTC)" />
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<HeatmapChart data={timeAnalysis.heatmap} />
						</div>

						{/* Holding Period */}
						<SectionHeader title="Holding Period vs Performance" />
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<HoldingPeriodChart data={timeAnalysis.holdingPeriods} />
						</div>

						{/* Holding Period Table */}
						{timeAnalysis.holdingPeriods.length > 0 && (
							<div className="rounded-[6px] border border-pk-border bg-pk-black-raised overflow-hidden">
								<table className="w-full text-[12px]">
									<thead>
										<tr className="border-b border-pk-border text-pk-white-dim text-left">
											<th className="px-3 py-2 font-medium">Duration</th>
											<th className="px-3 py-2 font-medium text-right">Trades</th>
											<th className="px-3 py-2 font-medium text-right">Win%</th>
											<th className="px-3 py-2 font-medium text-right">Avg P&L</th>
											<th className="px-3 py-2 font-medium text-right">Total P&L</th>
										</tr>
									</thead>
									<tbody>
										{timeAnalysis.holdingPeriods.map((h) => (
											<tr key={h.label} className="border-b border-pk-border/50 last:border-0">
												<td className="px-3 py-2 text-pk-white">{h.label}</td>
												<td className="px-3 py-2 text-right text-pk-white-muted">{h.trades}</td>
												<td className="px-3 py-2 text-right text-pk-white-muted">
													{h.winPercent}%
												</td>
												<td
													className={`px-3 py-2 text-right font-mono ${h.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
												>
													${h.avgPnl.toLocaleString()}
												</td>
												<td
													className={`px-3 py-2 text-right font-mono ${h.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
												>
													{h.totalPnl >= 0 ? '+' : ''}${h.totalPnl.toLocaleString()}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{/* Edge by Trade Quality */}
						{edgeExtended.byQuality.length > 0 && (
							<>
								<SectionHeader title="Edge by Trade Quality" />
								<EdgeTable rows={edgeExtended.byQuality} title="By Quality" />
							</>
						)}

						{/* Edge by Trade Basis */}
						{edgeExtended.byBasis.length > 0 && (
							<>
								<SectionHeader title="Rules vs Intuition" />
								<EdgeTable rows={edgeExtended.byBasis} title="By Basis" />
							</>
						)}

						{/* Edge by Tag */}
						{edgeExtended.byTag.length > 0 && (
							<>
								<SectionHeader title="Edge by Tag" />
								<EdgeTable rows={edgeExtended.byTag} title="By Tag" />
							</>
						)}

						{/* Edge by Hour */}
						{edgeExtended.byHour.length > 0 && (
							<>
								<SectionHeader title="Edge by Hour" />
								<EdgeTable rows={edgeExtended.byHour} title="By Hour" />
							</>
						)}
					</div>
				</TabsContent>

				{/* ═══ Tab 4: Behavioral ═══ */}
				<TabsContent value="behavioral">
					<div className="space-y-2">
						{/* Tilt Detection */}
						<SectionHeader title="Tilt Detection" />
						<p className="text-[11px] text-pk-white-dim -mt-1 mb-2">
							Win rate of your next trade after consecutive wins or losses. Bars below the dashed
							line suggest tilt.
						</p>
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<TiltChart data={behavioral.tiltDetection} overallWinRate={totalClosedForWinRate} />
						</div>

						{/* Confidence Calibration */}
						<SectionHeader title="Confidence Calibration" />
						<p className="text-[11px] text-pk-white-dim -mt-1 mb-2">
							Are your high-confidence trades actually winning more? Higher bars at right = well
							calibrated.
						</p>
						<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-3">
							<CalibrationChart data={behavioral.confidenceCalibration} />
						</div>

						{/* Revenge Trading */}
						<SectionHeader title="Revenge Trading" />
						<ComparisonCard
							title="Trades within 30 min of a loss vs normal trades"
							left={{
								label: 'Revenge Trades',
								value: `${behavioral.revengeTradeDetection.revengeWinPercent}%`,
								subtext: `$${behavioral.revengeTradeDetection.revengeAvgPnl} avg P&L`,
								trades: behavioral.revengeTradeDetection.revengeTradeCount,
							}}
							right={{
								label: 'Normal Trades',
								value: `${behavioral.revengeTradeDetection.normalWinPercent}%`,
								subtext: `$${behavioral.revengeTradeDetection.normalAvgPnl} avg P&L`,
								trades:
									behavioral.revengeTradeDetection.totalTrades -
									behavioral.revengeTradeDetection.revengeTradeCount,
							}}
							betterSide={
								behavioral.revengeTradeDetection.normalWinPercent >
								behavioral.revengeTradeDetection.revengeWinPercent
									? 'right'
									: behavioral.revengeTradeDetection.revengeWinPercent >
											behavioral.revengeTradeDetection.normalWinPercent
										? 'left'
										: 'none'
							}
						/>

						{/* Plan Deviation */}
						{(behavioral.planDeviationImpact.followedPlanTrades > 0 ||
							behavioral.planDeviationImpact.deviatedTrades > 0) && (
							<>
								<SectionHeader title="Plan Adherence Impact" />
								<ComparisonCard
									title="Following plan vs deviating from plan"
									left={{
										label: 'Followed Plan',
										value: `${behavioral.planDeviationImpact.followedWinPercent}%`,
										subtext: `$${behavioral.planDeviationImpact.followedAvgPnl} avg · ${behavioral.planDeviationImpact.followedAvgR}R`,
										trades: behavioral.planDeviationImpact.followedPlanTrades,
									}}
									right={{
										label: 'Deviated',
										value: `${behavioral.planDeviationImpact.deviatedWinPercent}%`,
										subtext: `$${behavioral.planDeviationImpact.deviatedAvgPnl} avg · ${behavioral.planDeviationImpact.deviatedAvgR}R`,
										trades: behavioral.planDeviationImpact.deviatedTrades,
									}}
									betterSide={
										behavioral.planDeviationImpact.followedAvgPnl >
										behavioral.planDeviationImpact.deviatedAvgPnl
											? 'left'
											: behavioral.planDeviationImpact.deviatedAvgPnl >
													behavioral.planDeviationImpact.followedAvgPnl
												? 'right'
												: 'none'
									}
								/>
							</>
						)}

						{/* Overtrading */}
						<SectionHeader title="Overtrading Detection" />
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							<StatCard
								label="Avg Trades/Day"
								value={behavioral.overtradingDetection.avgTradesPerDay}
							/>
							<StatCard
								label="Max in One Day"
								value={behavioral.overtradingDetection.maxTradesInDay}
							/>
							<StatCard
								label="Overtrade Days"
								value={behavioral.overtradingDetection.overtradeDays.length}
							/>
						</div>
						{behavioral.overtradingDetection.overtradeDays.length > 0 && (
							<ComparisonCard
								title="High-volume days vs normal days"
								left={{
									label: 'High Volume',
									value: `${behavioral.overtradingDetection.highVolumeWinPercent}%`,
									subtext: `$${behavioral.overtradingDetection.highVolumeAvgPnl} avg P&L`,
								}}
								right={{
									label: 'Normal Volume',
									value: `${behavioral.overtradingDetection.lowVolumeWinPercent}%`,
									subtext: `$${behavioral.overtradingDetection.lowVolumeAvgPnl} avg P&L`,
								}}
								betterSide={
									behavioral.overtradingDetection.lowVolumeAvgPnl >
									behavioral.overtradingDetection.highVolumeAvgPnl
										? 'right'
										: behavioral.overtradingDetection.highVolumeAvgPnl >
												behavioral.overtradingDetection.lowVolumeAvgPnl
											? 'left'
											: 'none'
								}
							/>
						)}

						{/* Stress Analysis */}
						{behavioral.stressAnalysis.length > 0 && (
							<>
								<SectionHeader title="Stress vs Performance" />
								<div className="rounded-[6px] border border-pk-border bg-pk-black-raised overflow-hidden">
									<table className="w-full text-[12px]">
										<thead>
											<tr className="border-b border-pk-border text-pk-white-dim text-left">
												<th className="px-3 py-2 font-medium">Stress Level</th>
												<th className="px-3 py-2 font-medium text-right">Trades</th>
												<th className="px-3 py-2 font-medium text-right">Win%</th>
												<th className="px-3 py-2 font-medium text-right">Avg P&L</th>
											</tr>
										</thead>
										<tbody>
											{behavioral.stressAnalysis.map((s) => (
												<tr key={s.label} className="border-b border-pk-border/50 last:border-0">
													<td className="px-3 py-2 text-pk-white">{s.label}</td>
													<td className="px-3 py-2 text-right text-pk-white-muted">{s.trades}</td>
													<td className="px-3 py-2 text-right text-pk-white-muted">
														{s.winPercent}%
													</td>
													<td
														className={`px-3 py-2 text-right font-mono ${s.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
													>
														${s.avgPnl.toLocaleString()}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtRatio(r: number): string {
	if (r === Infinity) return '∞';
	if (r === -Infinity) return '-∞';
	return r.toFixed(2);
}
