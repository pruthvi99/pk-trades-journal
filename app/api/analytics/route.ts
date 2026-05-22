/**
 * GET /api/analytics — deep-dive analytics data for pattern identification.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { strategies, tags, trades, tradeTags } from '@/lib/db/schema';
import {
	calmarRatio,
	directionAnalysis,
	feeImpact,
	monthlyGrid,
	recoveryFactor,
	riskSizeBins,
	sharpeRatio,
	sortinoRatio,
	underwaterCurve,
} from '@/lib/metrics/advanced-risk';
import {
	confidenceCalibration,
	overtradingDetection,
	planDeviationImpact,
	revengeTradeDetection,
	stressAnalysis,
	tiltDetection,
} from '@/lib/metrics/behavioral';
import { maxDrawdown } from '@/lib/metrics/distribution';
import { sliceByBasis, sliceByHour, sliceByQuality, sliceByTag } from '@/lib/metrics/edge';
import { totalPnlUsd } from '@/lib/metrics/headline';
import {
	holdingPeriodBuckets,
	hourDayHeatmap,
	monthlyPnl,
	rollingMetrics,
	tradeFrequencyByMonth,
	tradeFrequencyByWeek,
	weeklyPnl,
} from '@/lib/metrics/time-analysis';

export async function GET(request: Request) {
	const db = getDb();
	const allTrades = db.select().from(trades).all();
	const allStrategies = db.select().from(strategies).all();
	const allTags = db.select().from(tags).all();
	const allTradeTags = db.select().from(tradeTags).all();

	const { searchParams } = new URL(request.url);
	const startingBalance = Number(searchParams.get('startingBalance') ?? '25000');

	// Build tag lookup maps
	const tagLabels = new Map(allTags.map((t) => [t.id, t.label]));
	const _strategyNames = new Map(allStrategies.map((s) => [s.id, s.name]));

	// Build tagIds per trade
	const tradeTagMap = new Map<string, string[]>();
	for (const tt of allTradeTags) {
		const existing = tradeTagMap.get(tt.tradeId);
		if (existing) existing.push(tt.tagId);
		else tradeTagMap.set(tt.tradeId, [tt.tagId]);
	}

	// Map to edge-compatible shape (with tagIds)
	const edgeTrades = allTrades.map((t) => ({
		...t,
		tagIds: tradeTagMap.get(t.id) ?? [],
	}));

	// Compute metrics
	const dd = maxDrawdown(allTrades, startingBalance);
	const totalPnl = totalPnlUsd(allTrades);

	const result = {
		// ─── Performance Over Time ──────────────────────────
		timeAnalysis: {
			monthlyPnl: monthlyPnl(allTrades),
			weeklyPnl: weeklyPnl(allTrades),
			rolling10: rollingMetrics(allTrades, 10),
			rolling20: rollingMetrics(allTrades, 20),
			holdingPeriods: holdingPeriodBuckets(allTrades),
			frequencyByMonth: tradeFrequencyByMonth(allTrades),
			frequencyByWeek: tradeFrequencyByWeek(allTrades),
			heatmap: hourDayHeatmap(allTrades),
		},

		// ─── Advanced Risk ──────────────────────────────────
		advancedRisk: {
			sharpeRatio: sharpeRatio(allTrades),
			sortinoRatio: sortinoRatio(allTrades),
			calmarRatio: calmarRatio(totalPnl, dd.maxDrawdownUsd),
			recoveryFactor: recoveryFactor(totalPnl, dd.maxDrawdownUsd),
			underwaterCurve: underwaterCurve(allTrades, startingBalance),
			feeImpact: feeImpact(allTrades),
			riskSizeBins: riskSizeBins(allTrades),
			monthlyGrid: monthlyGrid(allTrades),
			directionAnalysis: directionAnalysis(allTrades as Parameters<typeof directionAnalysis>[0]),
		},

		// ─── Edge (extended) ────────────────────────────────
		edgeExtended: {
			byTag: sliceByTag(edgeTrades, tagLabels),
			byHour: sliceByHour(edgeTrades),
			byQuality: sliceByQuality(edgeTrades),
			byBasis: sliceByBasis(edgeTrades),
		},

		// ─── Behavioral ─────────────────────────────────────
		behavioral: {
			tiltDetection: tiltDetection(allTrades),
			confidenceCalibration: confidenceCalibration(allTrades),
			revengeTradeDetection: revengeTradeDetection(allTrades),
			overtradingDetection: overtradingDetection(allTrades),
			planDeviationImpact: planDeviationImpact(allTrades),
			stressAnalysis: stressAnalysis(allTrades),
		},
	};

	return NextResponse.json(result);
}
