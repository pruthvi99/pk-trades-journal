/**
 * Seed script — populates the database with realistic example trades.
 * Run with: pnpm db:seed
 *
 * Creates:
 * - 3 strategies (Bull put spread, Opening drive scalp, Iron condor)
 * - 8 tags across categories
 * - 6 trades: bull put (win), bull put (loss), bear call (win), iron condor (win),
 *   stock scalp long (win), stock scalp short (loss with pyramiding)
 * - Multiple executions with legs, partial exits, adjustments
 * - Settings: timezone, starting balance, commissions
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { v4 as uuid } from 'uuid';
import { createSqliteConnection } from '../lib/db/client';
import * as schema from '../lib/db/schema';
import type { PnlExecution, PnlLeg } from '../lib/pnl';
import { computeRealizedPnl, computeRMultiple } from '../lib/pnl';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';
const sqlite = createSqliteConnection(DATABASE_PATH);
const db = drizzle(sqlite, { schema });

function now(): string {
	return new Date().toISOString();
}

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString();
}

async function seed() {
	console.log('Seeding database...');

	// ─── Settings ──────────────────────────────────────────────
	const timestamp = now();
	const seedSettings = [
		{ key: 'timezone', value: 'America/Chicago', updatedAt: timestamp },
		{ key: 'starting_balance', value: '25000', updatedAt: timestamp },
		{ key: 'default_commission_per_contract', value: '0.65', updatedAt: timestamp },
		{ key: 'default_commission_per_share', value: '0', updatedAt: timestamp },
	];
	for (const s of seedSettings) {
		db.insert(schema.settings)
			.values(s)
			.onConflictDoUpdate({
				target: schema.settings.key,
				set: { value: s.value, updatedAt: s.updatedAt },
			})
			.run();
	}
	console.log('  Settings seeded');

	// ─── Strategies ────────────────────────────────────────────
	const strats = {
		bullPut: {
			id: uuid(),
			name: 'Bull put spread',
			description: 'Short put spread for credit. Bullish bias.',
			defaultInstrument: 'option' as const,
			archived: false,
			createdAt: timestamp,
			updatedAt: timestamp,
		},
		scalp: {
			id: uuid(),
			name: 'Opening drive scalp',
			description: 'Quick momentum trade in first 15 minutes.',
			defaultInstrument: 'stock' as const,
			archived: false,
			createdAt: timestamp,
			updatedAt: timestamp,
		},
		ironCondor: {
			id: uuid(),
			name: 'Iron condor',
			description: 'Neutral strategy — sell both sides.',
			defaultInstrument: 'option' as const,
			archived: false,
			createdAt: timestamp,
			updatedAt: timestamp,
		},
	};
	for (const s of Object.values(strats)) {
		db.insert(schema.strategies).values(s).onConflictDoNothing().run();
	}
	console.log('  Strategies seeded');

	// ─── Tags ──────────────────────────────────────────────────
	const seedTags = [
		{
			id: uuid(),
			label: 'Breakout',
			category: 'setup' as const,
			archived: false,
			createdAt: timestamp,
		},
		{
			id: uuid(),
			label: 'Earnings tomorrow',
			category: 'context' as const,
			archived: false,
			createdAt: timestamp,
		},
		{
			id: uuid(),
			label: 'Followed plan',
			category: 'psychology' as const,
			archived: false,
			createdAt: timestamp,
		},
		{
			id: uuid(),
			label: 'FOMO entry',
			category: 'mistake' as const,
			archived: false,
			createdAt: timestamp,
		},
		{
			id: uuid(),
			label: 'VWAP bounce',
			category: 'setup' as const,
			archived: false,
			createdAt: timestamp,
		},
		{
			id: uuid(),
			label: 'High IV',
			category: 'context' as const,
			archived: false,
			createdAt: timestamp,
		},
		{
			id: uuid(),
			label: 'Tilt',
			category: 'psychology' as const,
			archived: false,
			createdAt: timestamp,
		},
		{
			id: uuid(),
			label: 'Oversize',
			category: 'mistake' as const,
			archived: false,
			createdAt: timestamp,
		},
	];
	for (const t of seedTags) {
		db.insert(schema.tags).values(t).onConflictDoNothing().run();
	}
	console.log('  Tags seeded');

	// ─── Helper to create a full trade ─────────────────────────
	function createTrade(
		tradeData: Omit<
			schema.NewTrade,
			'id' | 'createdAt' | 'updatedAt' | 'realizedPnlUsd' | 'realizedPnlR' | 'feesUsd'
		>,
		executions: Array<{
			kind: 'entry' | 'exit' | 'adjustment';
			executedAt: string;
			notes?: string;
			feesUsd: number;
			legs: Array<{
				side: 'buy' | 'sell';
				shares?: number;
				optionType?: 'call' | 'put';
				strike?: number;
				expiration?: string;
				contracts?: number;
				price: number;
				multiplier: number;
			}>;
		}>,
		tagIds: string[] = [],
	) {
		const tradeId = uuid();

		// Convert to PnlExecution for computation
		const pnlExecs: PnlExecution[] = executions.map((e) => ({
			kind: e.kind,
			feesUsd: e.feesUsd,
			legs: e.legs.map(
				(l): PnlLeg => ({
					side: l.side,
					price: l.price,
					quantity: l.shares ?? l.contracts ?? 0,
					multiplier: l.multiplier,
				}),
			),
		}));

		const realizedPnl = computeRealizedPnl(pnlExecs);
		const rMultiple = computeRMultiple(realizedPnl, tradeData.plannedRiskUsd ?? null);
		const totalFees = pnlExecs.reduce((s, e) => s + e.feesUsd, 0);

		db.insert(schema.trades)
			.values({
				id: tradeId,
				...tradeData,
				realizedPnlUsd: realizedPnl,
				realizedPnlR: rMultiple,
				feesUsd: totalFees,
				createdAt: timestamp,
				updatedAt: timestamp,
			})
			.run();

		for (const exec of executions) {
			const execId = uuid();
			db.insert(schema.tradeExecutions)
				.values({
					id: execId,
					tradeId,
					kind: exec.kind,
					executedAt: exec.executedAt,
					notes: exec.notes ?? null,
					feesUsd: exec.feesUsd,
					createdAt: timestamp,
				})
				.run();

			for (const leg of exec.legs) {
				db.insert(schema.tradeExecutionLegs)
					.values({
						id: uuid(),
						executionId: execId,
						side: leg.side,
						shares: leg.shares ?? null,
						optionType: leg.optionType ?? null,
						strike: leg.strike ?? null,
						expiration: leg.expiration ?? null,
						contracts: leg.contracts ?? null,
						price: leg.price,
						multiplier: leg.multiplier,
					})
					.run();
			}
		}

		for (const tagId of tagIds) {
			db.insert(schema.tradeTags).values({ tradeId, tagId }).onConflictDoNothing().run();
		}

		return tradeId;
	}

	// ─── Trade 1: Bull put spread — WIN ────────────────────────
	createTrade(
		{
			symbol: 'SPY',
			instrument: 'option_spread',
			direction: 'short',
			strategyId: strats.bullPut.id,
			status: 'closed',
			plannedEntry: 1.5,
			plannedStop: 5.0,
			plannedTarget: 0.1,
			plannedSize: 5,
			plannedRiskUsd: 1750,
			openedAt: daysAgo(10),
			closedAt: daysAgo(7),
			preConfidence: 7,
			preConviction: 'SPY holding above 20-day MA, IV elevated. Selling premium into strength.',
			preMood: 'calm',
			preSleepHours: 7.5,
			preCaffeine: true,
			preFollowingPlan: true,
			postSatisfaction: 8,
			postLessons: 'Good entry timing. Held to target.',
			postMood: 'focused',
			postWouldRetake: true,
			notesMd: 'Clean setup. Entered on a pullback to VWAP.',
		},
		[
			{
				kind: 'entry',
				executedAt: daysAgo(10),
				feesUsd: 6.5,
				legs: [
					{
						side: 'sell',
						optionType: 'put',
						strike: 430,
						expiration: '2025-02-21',
						contracts: 5,
						price: 3.0,
						multiplier: 100,
					},
					{
						side: 'buy',
						optionType: 'put',
						strike: 425,
						expiration: '2025-02-21',
						contracts: 5,
						price: 1.5,
						multiplier: 100,
					},
				],
			},
			{
				kind: 'exit',
				executedAt: daysAgo(7),
				notes: 'Closed at 80% profit target.',
				feesUsd: 6.5,
				legs: [
					{
						side: 'buy',
						optionType: 'put',
						strike: 430,
						expiration: '2025-02-21',
						contracts: 5,
						price: 0.35,
						multiplier: 100,
					},
					{
						side: 'sell',
						optionType: 'put',
						strike: 425,
						expiration: '2025-02-21',
						contracts: 5,
						price: 0.05,
						multiplier: 100,
					},
				],
			},
		],
		[seedTags[2]!.id, seedTags[5]!.id],
	);
	console.log('  Trade 1: Bull put spread (win)');

	// ─── Trade 2: Bull put spread — LOSS ───────────────────────
	createTrade(
		{
			symbol: 'SPY',
			instrument: 'option_spread',
			direction: 'short',
			strategyId: strats.bullPut.id,
			status: 'closed',
			plannedEntry: 1.2,
			plannedStop: 5.0,
			plannedTarget: 0.1,
			plannedSize: 3,
			plannedRiskUsd: 1140,
			openedAt: daysAgo(8),
			closedAt: daysAgo(5),
			preConfidence: 5,
			preMood: 'anxious',
			preSleepHours: 5.0,
			preCaffeine: true,
			preFollowingPlan: false,
			duringStress: 8,
			duringDeviations: 'Held too long hoping for reversal.',
			postSatisfaction: 3,
			postMistakes: 'Entered despite being anxious. Ignored stop.',
			postLessons: 'Do not trade when sleep-deprived. Respect the stop.',
			postMood: 'tired',
			postWouldRetake: false,
			notesMd: 'Bad entry, bad management. Classic revenge trade after yesterday.',
		},
		[
			{
				kind: 'entry',
				executedAt: daysAgo(8),
				feesUsd: 3.9,
				legs: [
					{
						side: 'sell',
						optionType: 'put',
						strike: 435,
						expiration: '2025-02-21',
						contracts: 3,
						price: 2.8,
						multiplier: 100,
					},
					{
						side: 'buy',
						optionType: 'put',
						strike: 430,
						expiration: '2025-02-21',
						contracts: 3,
						price: 1.6,
						multiplier: 100,
					},
				],
			},
			{
				kind: 'exit',
				executedAt: daysAgo(5),
				feesUsd: 3.9,
				legs: [
					{
						side: 'buy',
						optionType: 'put',
						strike: 435,
						expiration: '2025-02-21',
						contracts: 3,
						price: 4.5,
						multiplier: 100,
					},
					{
						side: 'sell',
						optionType: 'put',
						strike: 430,
						expiration: '2025-02-21',
						contracts: 3,
						price: 1.8,
						multiplier: 100,
					},
				],
			},
		],
		[seedTags[6]!.id, seedTags[3]!.id],
	);
	console.log('  Trade 2: Bull put spread (loss)');

	// ─── Trade 3: Stock scalp — WIN with partial exits ─────────
	createTrade(
		{
			symbol: 'NVDA',
			instrument: 'stock',
			direction: 'long',
			strategyId: strats.scalp.id,
			status: 'closed',
			plannedEntry: 880.0,
			plannedStop: 876.0,
			plannedTarget: 890.0,
			plannedSize: 100,
			plannedRiskUsd: 400,
			openedAt: daysAgo(6),
			closedAt: daysAgo(6),
			preConfidence: 8,
			preConviction: 'Gap up on strong volume. VWAP reclaim.',
			preMood: 'focused',
			preSleepHours: 8,
			preCaffeine: false,
			preFollowingPlan: true,
			postSatisfaction: 9,
			postLessons: 'Patient scaling out worked well.',
			postMood: 'calm',
			postWouldRetake: true,
			notesMd: 'Opening drive long. Scaled out in 2 tranches.',
		},
		[
			{
				kind: 'entry',
				executedAt: daysAgo(6),
				feesUsd: 0,
				legs: [{ side: 'buy', shares: 100, price: 880.0, multiplier: 1 }],
			},
			{
				kind: 'exit',
				executedAt: daysAgo(6),
				notes: 'First scale — 50 shares at +$5',
				feesUsd: 0,
				legs: [{ side: 'sell', shares: 50, price: 885.0, multiplier: 1 }],
			},
			{
				kind: 'exit',
				executedAt: daysAgo(6),
				notes: 'Second scale — 50 shares at +$8',
				feesUsd: 0,
				legs: [{ side: 'sell', shares: 50, price: 888.0, multiplier: 1 }],
			},
		],
		[seedTags[0]!.id, seedTags[4]!.id],
	);
	console.log('  Trade 3: NVDA scalp (win, partial exits)');

	// ─── Trade 4: Iron condor — WIN ────────────────────────────
	createTrade(
		{
			symbol: 'SPY',
			instrument: 'option_spread',
			direction: 'neutral',
			strategyId: strats.ironCondor.id,
			status: 'closed',
			plannedEntry: 2.0,
			plannedStop: null,
			plannedTarget: 0.2,
			plannedSize: 2,
			plannedRiskUsd: 600,
			openedAt: daysAgo(15),
			closedAt: daysAgo(3),
			preConfidence: 6,
			preConviction: 'Low IV rank but range-bound price action.',
			preMood: 'neutral',
			preSleepHours: 7,
			preCaffeine: true,
			preFollowingPlan: true,
			postSatisfaction: 7,
			postLessons: 'Patience paid off. Let theta do the work.',
			postMood: 'calm',
			postWouldRetake: true,
			notesMd: 'Iron condor on SPY. Managed at 75% profit.',
		},
		[
			{
				kind: 'entry',
				executedAt: daysAgo(15),
				feesUsd: 5.2,
				legs: [
					{
						side: 'sell',
						optionType: 'put',
						strike: 420,
						expiration: '2025-03-07',
						contracts: 2,
						price: 1.5,
						multiplier: 100,
					},
					{
						side: 'buy',
						optionType: 'put',
						strike: 415,
						expiration: '2025-03-07',
						contracts: 2,
						price: 0.8,
						multiplier: 100,
					},
					{
						side: 'sell',
						optionType: 'call',
						strike: 445,
						expiration: '2025-03-07',
						contracts: 2,
						price: 1.3,
						multiplier: 100,
					},
					{
						side: 'buy',
						optionType: 'call',
						strike: 450,
						expiration: '2025-03-07',
						contracts: 2,
						price: 0.7,
						multiplier: 100,
					},
				],
			},
			{
				kind: 'exit',
				executedAt: daysAgo(3),
				feesUsd: 5.2,
				legs: [
					{
						side: 'buy',
						optionType: 'put',
						strike: 420,
						expiration: '2025-03-07',
						contracts: 2,
						price: 0.1,
						multiplier: 100,
					},
					{
						side: 'sell',
						optionType: 'put',
						strike: 415,
						expiration: '2025-03-07',
						contracts: 2,
						price: 0.02,
						multiplier: 100,
					},
					{
						side: 'buy',
						optionType: 'call',
						strike: 445,
						expiration: '2025-03-07',
						contracts: 2,
						price: 0.15,
						multiplier: 100,
					},
					{
						side: 'sell',
						optionType: 'call',
						strike: 450,
						expiration: '2025-03-07',
						contracts: 2,
						price: 0.03,
						multiplier: 100,
					},
				],
			},
		],
		[seedTags[2]!.id, seedTags[5]!.id],
	);
	console.log('  Trade 4: Iron condor (win)');

	// ─── Trade 5: Stock scalp — LOSS ───────────────────────────
	createTrade(
		{
			symbol: 'TSLA',
			instrument: 'stock',
			direction: 'long',
			strategyId: strats.scalp.id,
			status: 'closed',
			plannedEntry: 245.0,
			plannedStop: 243.0,
			plannedTarget: 250.0,
			plannedSize: 50,
			plannedRiskUsd: 100,
			openedAt: daysAgo(4),
			closedAt: daysAgo(4),
			preConfidence: 4,
			preMood: 'fomo',
			preSleepHours: 5.5,
			preCaffeine: true,
			preFollowingPlan: false,
			duringStress: 7,
			postSatisfaction: 2,
			postMistakes: 'Chased the move. FOMO entry without confirmation.',
			postLessons: 'Wait for the pullback. Never chase.',
			postMood: 'revenge',
			postWouldRetake: false,
			notesMd: 'FOMO entry. Stock reversed immediately.',
		},
		[
			{
				kind: 'entry',
				executedAt: daysAgo(4),
				feesUsd: 0,
				legs: [{ side: 'buy', shares: 50, price: 246.5, multiplier: 1 }],
			},
			{
				kind: 'exit',
				executedAt: daysAgo(4),
				feesUsd: 0,
				legs: [{ side: 'sell', shares: 50, price: 243.8, multiplier: 1 }],
			},
		],
		[seedTags[3]!.id, seedTags[6]!.id],
	);
	console.log('  Trade 5: TSLA scalp (loss)');

	// ─── Trade 6: Open trade (bull put) ────────────────────────
	createTrade(
		{
			symbol: 'QQQ',
			instrument: 'option_spread',
			direction: 'short',
			strategyId: strats.bullPut.id,
			status: 'open',
			plannedEntry: 1.3,
			plannedStop: 5.0,
			plannedTarget: 0.1,
			plannedSize: 4,
			plannedRiskUsd: 1480,
			openedAt: daysAgo(1),
			preConfidence: 7,
			preConviction: 'QQQ above all MAs. Selling into elevated IV.',
			preMood: 'focused',
			preSleepHours: 7,
			preCaffeine: false,
			preFollowingPlan: true,
			notesMd: 'Opened yesterday. Waiting for theta decay.',
		},
		[
			{
				kind: 'entry',
				executedAt: daysAgo(1),
				feesUsd: 5.2,
				legs: [
					{
						side: 'sell',
						optionType: 'put',
						strike: 370,
						expiration: '2025-03-14',
						contracts: 4,
						price: 2.1,
						multiplier: 100,
					},
					{
						side: 'buy',
						optionType: 'put',
						strike: 365,
						expiration: '2025-03-14',
						contracts: 4,
						price: 0.8,
						multiplier: 100,
					},
				],
			},
		],
		[seedTags[5]!.id],
	);
	console.log('  Trade 6: QQQ bull put (open)');

	sqlite.close();
	console.log('\nSeed complete!');
}

seed().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
