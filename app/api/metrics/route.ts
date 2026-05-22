/**
 * GET /api/metrics — compute and return all metrics for the dashboard.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { strategies, trades } from '@/lib/db/schema';
import { equityCurve, maxDrawdown, rDistribution, streaks } from '@/lib/metrics/distribution';
import {
	sliceByBasis,
	sliceByDayOfWeek,
	sliceByInstrument,
	sliceByQuality,
	sliceByStrategy,
	sliceBySymbol,
} from '@/lib/metrics/edge';
import {
	averageR,
	avgLossUsd,
	avgWinUsd,
	bestTradeUsd,
	breakEvenCount,
	closedTradeCount,
	expectancyR,
	expectancyUsd,
	grossLoss,
	grossProfit,
	kellyCriterion,
	lossCount,
	medianR,
	openTradeCount,
	payoffRatio,
	pnlStdDev,
	profitFactor,
	totalPnlPercent,
	totalPnlUsd,
	winCount,
	winRate,
	worstTradeUsd,
} from '@/lib/metrics/headline';
import {
	confidenceByOutcome,
	winRateByMood,
	winRateBySleep,
	wouldRetakeRate,
} from '@/lib/metrics/psychology';
import {
	avgRiskPercent,
	avgRiskUsd,
	largestLossUsd,
	planAdherenceRate,
	riskAdjustedReturn,
} from '@/lib/metrics/risk';

export async function GET(request: Request) {
	const db = getDb();
	const allTrades = db.select().from(trades).all();
	const allStrategies = db.select().from(strategies).all();
	const strategyNames = new Map(allStrategies.map((s) => [s.id, s.name]));

	// The metric functions handle filtering internally via the status field
	const { searchParams } = new URL(request.url);
	const startingBalance = Number(searchParams.get('startingBalance') ?? '25000');

	// Map to EdgeTrade shape (superset) — tagIds empty since edge tags not needed here
	const edgeTrades = allTrades.map((t) => ({
		...t,
		tagIds: [] as string[],
	}));

	const result = {
		summary: {
			totalTrades: allTrades.length,
			openTrades: openTradeCount(allTrades),
			closedTrades: closedTradeCount(allTrades),
		},
		headline: {
			totalPnlUsd: totalPnlUsd(allTrades),
			totalPnlPercent: totalPnlPercent(allTrades, startingBalance),
			winRate: winRate(allTrades),
			profitFactor: profitFactor(allTrades),
			expectancyUsd: expectancyUsd(allTrades),
			expectancyR: expectancyR(allTrades),
			averageR: averageR(allTrades),
			medianR: medianR(allTrades),
			avgWinUsd: avgWinUsd(allTrades),
			avgLossUsd: avgLossUsd(allTrades),
			payoffRatio: payoffRatio(allTrades),
			bestTradeUsd: bestTradeUsd(allTrades),
			worstTradeUsd: worstTradeUsd(allTrades),
			kellyCriterion: kellyCriterion(allTrades),
			winCount: winCount(allTrades),
			lossCount: lossCount(allTrades),
			breakEvenCount: breakEvenCount(allTrades),
			grossProfit: grossProfit(allTrades),
			grossLoss: grossLoss(allTrades),
			pnlStdDev: pnlStdDev(allTrades),
		},
		distribution: {
			equityCurve: equityCurve(allTrades, startingBalance),
			maxDrawdown: maxDrawdown(allTrades, startingBalance),
			streaks: streaks(allTrades),
			rDistribution: rDistribution(allTrades),
		},
		edge: {
			bySymbol: sliceBySymbol(edgeTrades),
			byStrategy: sliceByStrategy(edgeTrades, strategyNames),
			byDayOfWeek: sliceByDayOfWeek(edgeTrades),
			byInstrument: sliceByInstrument(edgeTrades),
			byQuality: sliceByQuality(edgeTrades),
			byBasis: sliceByBasis(edgeTrades),
		},
		risk: {
			avgRiskUsd: avgRiskUsd(allTrades),
			avgRiskPercent: avgRiskPercent(allTrades, startingBalance),
			largestLossUsd: largestLossUsd(allTrades),
			riskAdjustedReturn: riskAdjustedReturn(
				totalPnlUsd(allTrades),
				maxDrawdown(allTrades, startingBalance).maxDrawdownUsd,
			),
			planAdherenceRate: planAdherenceRate(allTrades),
		},
		psychology: {
			confidenceByOutcome: confidenceByOutcome(allTrades),
			winRateByMood: winRateByMood(allTrades),
			winRateBySleep: winRateBySleep(allTrades),
			wouldRetakeRate: wouldRetakeRate(allTrades),
		},
	};

	return NextResponse.json(result);
}
