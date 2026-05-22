/**
 * Database query functions for all CRUD operations.
 * Keeps route handlers thin — all DB logic lives here.
 */

import { and, desc, eq, inArray, like } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import {
	computeRealizedPnl,
	computeRMultiple,
	computeTotalFees,
	type PnlExecution,
	type PnlLeg,
} from '../pnl';
import { nowUtc } from '../time';
import { getDb } from './client';
import {
	auditLog,
	type NewStrategy,
	type NewTag,
	type NewTrade,
	type NewTradeExecution,
	type NewTradeExecutionLeg,
	type Strategy,
	strategies,
	type Tag,
	type Trade,
	tags,
	tradeExecutionLegs,
	tradeExecutions,
	tradeScreenshots,
	trades,
	tradeTags,
} from './schema';

// ─── Strategies ─────────────────────────────────────────────────────────────

/** List all strategies, optionally including archived. */
export function listStrategies(includeArchived = false): Strategy[] {
	const db = getDb();
	if (includeArchived) {
		return db.select().from(strategies).orderBy(strategies.name).all();
	}
	return db
		.select()
		.from(strategies)
		.where(eq(strategies.archived, false))
		.orderBy(strategies.name)
		.all();
}

/** Get a single strategy by ID. */
export function getStrategy(id: string): Strategy | undefined {
	const db = getDb();
	return db.select().from(strategies).where(eq(strategies.id, id)).get();
}

/** Create a new strategy. */
export function createStrategy(input: {
	name: string;
	description?: string;
	defaultInstrument?: 'option' | 'stock';
}): Strategy {
	const db = getDb();
	const now = nowUtc();
	const row: NewStrategy = {
		id: uuid(),
		name: input.name,
		description: input.description ?? null,
		defaultInstrument: input.defaultInstrument ?? null,
		archived: false,
		createdAt: now,
		updatedAt: now,
	};
	db.insert(strategies).values(row).run();
	return db.select().from(strategies).where(eq(strategies.id, row.id)).get()!;
}

/** Update an existing strategy. */
export function updateStrategy(
	id: string,
	input: Partial<{
		name: string;
		description: string;
		defaultInstrument: 'option' | 'stock';
		archived: boolean;
	}>,
): Strategy | undefined {
	const db = getDb();
	const existing = getStrategy(id);
	if (!existing) return undefined;
	db.update(strategies)
		.set({ ...input, updatedAt: nowUtc() })
		.where(eq(strategies.id, id))
		.run();
	return getStrategy(id);
}

// ─── Tags ───────────────────────────────────────────────────────────────────

/** List all tags, optionally including archived. */
export function listTags(includeArchived = false): Tag[] {
	const db = getDb();
	if (includeArchived) {
		return db.select().from(tags).orderBy(tags.category, tags.label).all();
	}
	return db
		.select()
		.from(tags)
		.where(eq(tags.archived, false))
		.orderBy(tags.category, tags.label)
		.all();
}

/** Get a single tag by ID. */
export function getTag(id: string): Tag | undefined {
	const db = getDb();
	return db.select().from(tags).where(eq(tags.id, id)).get();
}

/** Create a new tag. */
export function createTag(input: {
	label: string;
	category: 'setup' | 'context' | 'psychology' | 'mistake' | 'custom';
}): Tag {
	const db = getDb();
	const row: NewTag = {
		id: uuid(),
		label: input.label,
		category: input.category,
		archived: false,
		createdAt: nowUtc(),
	};
	db.insert(tags).values(row).run();
	return db.select().from(tags).where(eq(tags.id, row.id)).get()!;
}

/** Update an existing tag. */
export function updateTag(
	id: string,
	input: Partial<{
		label: string;
		category: 'setup' | 'context' | 'psychology' | 'mistake' | 'custom';
		archived: boolean;
	}>,
): Tag | undefined {
	const db = getDb();
	const existing = getTag(id);
	if (!existing) return undefined;
	db.update(tags).set(input).where(eq(tags.id, id)).run();
	return getTag(id);
}

// ─── Trades ─────────────────────────────────────────────────────────────────

/** Expanded trade with relations. */
export interface TradeWithRelations extends Trade {
	strategy: Strategy | null;
	executions: Array<{
		id: string;
		kind: string;
		executedAt: string;
		notes: string | null;
		feesUsd: number;
		legs: Array<{
			id: string;
			side: string;
			shares: number | null;
			optionType: string | null;
			strike: number | null;
			expiration: string | null;
			contracts: number | null;
			price: number;
			multiplier: number;
		}>;
	}>;
	screenshots: Array<{
		id: string;
		timeframe: string;
		url: string;
		label: string | null;
	}>;
	tagList: Tag[];
}

/** List trades with filters. */
export function listTrades(filters?: {
	status?: string;
	symbol?: string;
	strategyId?: string;
	instrument?: string;
	tagIds?: string[];
	/** Filter trades opened or closed on this date (YYYY-MM-DD). */
	date?: string;
	limit?: number;
	offset?: number;
}): { trades: Trade[]; total: number } {
	const db = getDb();
	const conditions = [];

	if (filters?.status) {
		conditions.push(eq(trades.status, filters.status as 'open' | 'closed' | 'cancelled'));
	}
	if (filters?.symbol) {
		conditions.push(like(trades.symbol, `%${filters.symbol}%`));
	}
	if (filters?.strategyId) {
		conditions.push(eq(trades.strategyId, filters.strategyId));
	}
	if (filters?.instrument) {
		conditions.push(eq(trades.instrument, filters.instrument as 'option_spread' | 'stock'));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	let query = db.select().from(trades);
	if (where) {
		query = query.where(where) as typeof query;
	}

	let allResults = query.orderBy(desc(trades.openedAt)).all();

	// Date filtering (post-query: match openedAt or closedAt starting with YYYY-MM-DD)
	if (filters?.date) {
		const prefix = filters.date; // "YYYY-MM-DD"
		allResults = allResults.filter(
			(t) => t.openedAt.startsWith(prefix) || (t.closedAt?.startsWith(prefix) ?? false),
		);
	}

	// Tag filtering (post-query since it's a join table)
	let filtered = allResults;
	if (filters?.tagIds && filters.tagIds.length > 0) {
		const tradeIdsWithTags = db
			.select({ tradeId: tradeTags.tradeId })
			.from(tradeTags)
			.where(inArray(tradeTags.tagId, filters.tagIds))
			.all()
			.map((r) => r.tradeId);
		const tagSet = new Set(tradeIdsWithTags);
		filtered = allResults.filter((t) => tagSet.has(t.id));
	}

	const total = filtered.length;
	const limit = filters?.limit ?? 50;
	const offset = filters?.offset ?? 0;
	const paged = filtered.slice(offset, offset + limit);

	return { trades: paged, total };
}

/** Get a single trade with all relations. */
export function getTrade(id: string): TradeWithRelations | undefined {
	const db = getDb();
	const trade = db.select().from(trades).where(eq(trades.id, id)).get();
	if (!trade) return undefined;

	const strategy = trade.strategyId
		? (db.select().from(strategies).where(eq(strategies.id, trade.strategyId)).get() ?? null)
		: null;

	const execs = db
		.select()
		.from(tradeExecutions)
		.where(eq(tradeExecutions.tradeId, id))
		.orderBy(tradeExecutions.executedAt)
		.all();

	const execsWithLegs = execs.map((exec) => ({
		...exec,
		legs: db
			.select()
			.from(tradeExecutionLegs)
			.where(eq(tradeExecutionLegs.executionId, exec.id))
			.all(),
	}));

	const screenshots = db
		.select()
		.from(tradeScreenshots)
		.where(eq(tradeScreenshots.tradeId, id))
		.all();

	const tagJoins = db.select().from(tradeTags).where(eq(tradeTags.tradeId, id)).all();

	const tagList =
		tagJoins.length > 0
			? db
					.select()
					.from(tags)
					.where(
						inArray(
							tags.id,
							tagJoins.map((j) => j.tagId),
						),
					)
					.all()
			: [];

	return {
		...trade,
		strategy,
		executions: execsWithLegs,
		screenshots,
		tagList,
	};
}

/** Create a trade with its first execution, legs, screenshots, and tags. */
export function createTrade(input: {
	symbol: string;
	instrument: 'option_spread' | 'stock';
	direction: 'long' | 'short' | 'neutral';
	strategyId?: string;
	plannedEntry?: number;
	plannedStop?: number;
	plannedTarget?: number;
	plannedSize?: number;
	plannedRiskUsd?: number;
	openedAt: string;
	notesMd?: string;
	tradeQuality?: string;
	tradeBasis?: string;
	preConfidence?: number;
	preConviction?: string;
	preMood?: string;
	preSleepHours?: number;
	preCaffeine?: boolean;
	preFollowingPlan?: boolean;
	tagIds?: string[];
	screenshots?: Array<{ timeframe: string; url: string; label?: string }>;
	execution: {
		kind: 'entry';
		executedAt: string;
		notes?: string;
		feesUsd?: number;
		legs: Array<{
			side: 'buy' | 'sell';
			shares?: number;
			optionType?: 'call' | 'put';
			strike?: number;
			expiration?: string;
			contracts?: number;
			price: number;
			multiplier?: number;
		}>;
	};
}): TradeWithRelations {
	const db = getDb();
	const now = nowUtc();
	const tradeId = uuid();

	// Create the trade
	const tradeRow: NewTrade = {
		id: tradeId,
		symbol: input.symbol,
		instrument: input.instrument,
		direction: input.direction,
		strategyId: input.strategyId ?? null,
		status: 'open',
		plannedEntry: input.plannedEntry ?? null,
		plannedStop: input.plannedStop ?? null,
		plannedTarget: input.plannedTarget ?? null,
		plannedSize: input.plannedSize ?? null,
		plannedRiskUsd: input.plannedRiskUsd ?? null,
		openedAt: input.openedAt,
		notesMd: input.notesMd ?? null,
		tradeQuality: (input.tradeQuality as Trade['tradeQuality']) ?? null,
		tradeBasis: (input.tradeBasis as Trade['tradeBasis']) ?? null,
		preConfidence: input.preConfidence ?? null,
		preConviction: input.preConviction ?? null,
		preMood: (input.preMood as Trade['preMood']) ?? null,
		preSleepHours: input.preSleepHours ?? null,
		preCaffeine: input.preCaffeine ?? null,
		preFollowingPlan: input.preFollowingPlan ?? null,
		realizedPnlUsd: null,
		realizedPnlR: null,
		feesUsd: 0,
		createdAt: now,
		updatedAt: now,
	};
	db.insert(trades).values(tradeRow).run();

	// Create the first execution + legs
	const execId = uuid();
	const execRow: NewTradeExecution = {
		id: execId,
		tradeId,
		kind: 'entry',
		executedAt: input.execution.executedAt,
		notes: input.execution.notes ?? null,
		feesUsd: input.execution.feesUsd ?? 0,
		createdAt: now,
	};
	db.insert(tradeExecutions).values(execRow).run();

	for (const leg of input.execution.legs) {
		const legRow: NewTradeExecutionLeg = {
			id: uuid(),
			executionId: execId,
			side: leg.side,
			shares: leg.shares ?? null,
			optionType: leg.optionType ?? null,
			strike: leg.strike ?? null,
			expiration: leg.expiration ?? null,
			contracts: leg.contracts ?? null,
			price: leg.price,
			multiplier: leg.multiplier ?? (input.instrument === 'option_spread' ? 100 : 1),
		};
		db.insert(tradeExecutionLegs).values(legRow).run();
	}

	// Tags
	if (input.tagIds && input.tagIds.length > 0) {
		for (const tagId of input.tagIds) {
			db.insert(tradeTags).values({ tradeId, tagId }).run();
		}
	}

	// Screenshots
	if (input.screenshots && input.screenshots.length > 0) {
		for (const ss of input.screenshots) {
			db.insert(tradeScreenshots)
				.values({
					id: uuid(),
					tradeId,
					timeframe: ss.timeframe as '4H' | '1H' | '15M' | '5M' | 'other',
					url: ss.url,
					label: ss.label ?? null,
				})
				.run();
		}
	}

	// Recompute P&L
	recomputeTradePnl(tradeId);

	// Audit log
	db.insert(auditLog)
		.values({
			id: uuid(),
			entity: 'trade',
			entityId: tradeId,
			action: 'create',
			occurredAt: now,
		})
		.run();

	return getTrade(tradeId)!;
}

/** Update trade fields (not executions). */
export function updateTrade(
	id: string,
	input: Partial<{
		symbol: string;
		instrument: 'option_spread' | 'stock';
		direction: 'long' | 'short' | 'neutral';
		strategyId: string | null;
		status: 'open' | 'closed' | 'cancelled';
		plannedEntry: number | null;
		plannedStop: number | null;
		plannedTarget: number | null;
		plannedSize: number | null;
		plannedRiskUsd: number | null;
		openedAt: string;
		closedAt: string | null;
		notesMd: string | null;
		tradeQuality: string | null;
		tradeBasis: string | null;
		preConfidence: number | null;
		preConviction: string | null;
		preMood: string | null;
		preSleepHours: number | null;
		preCaffeine: boolean | null;
		preFollowingPlan: boolean | null;
		duringStress: number | null;
		duringDeviations: string | null;
		postSatisfaction: number | null;
		postMistakes: string | null;
		postLessons: string | null;
		postMood: string | null;
		postWouldRetake: boolean | null;
		tagIds: string[];
	}>,
): TradeWithRelations | undefined {
	const db = getDb();
	const existing = db.select().from(trades).where(eq(trades.id, id)).get();
	if (!existing) return undefined;

	const { tagIds, ...tradeFields } = input;

	// Update trade fields
	if (Object.keys(tradeFields).length > 0) {
		db.update(trades)
			.set({ ...tradeFields, updatedAt: nowUtc() } as Record<string, unknown>)
			.where(eq(trades.id, id))
			.run();
	}

	// Update tags if provided
	if (tagIds !== undefined) {
		db.delete(tradeTags).where(eq(tradeTags.tradeId, id)).run();
		for (const tagId of tagIds) {
			db.insert(tradeTags).values({ tradeId: id, tagId }).run();
		}
	}

	// Recompute P&L (in case planned risk changed, affecting R)
	recomputeTradePnl(id);

	return getTrade(id);
}

/** Delete a trade and all associated data (executions, legs, tags, screenshots). */
export function deleteTrade(id: string): boolean {
	const db = getDb();
	const existing = db.select().from(trades).where(eq(trades.id, id)).get();
	if (!existing) return false;

	// Delete legs for all executions
	const execs = db.select().from(tradeExecutions).where(eq(tradeExecutions.tradeId, id)).all();
	for (const exec of execs) {
		db.delete(tradeExecutionLegs).where(eq(tradeExecutionLegs.executionId, exec.id)).run();
	}

	// Delete executions, tags, screenshots, then the trade itself
	db.delete(tradeExecutions).where(eq(tradeExecutions.tradeId, id)).run();
	db.delete(tradeTags).where(eq(tradeTags.tradeId, id)).run();
	db.delete(tradeScreenshots).where(eq(tradeScreenshots.tradeId, id)).run();
	db.delete(trades).where(eq(trades.id, id)).run();

	// Audit log
	db.insert(auditLog)
		.values({
			id: uuid(),
			entity: 'trade',
			entityId: id,
			action: 'delete',
			occurredAt: nowUtc(),
		})
		.run();

	return true;
}

// ─── Executions ─────────────────────────────────────────────────────────────

/** Add an execution to a trade. */
export function addExecution(input: {
	tradeId: string;
	kind: 'entry' | 'exit' | 'adjustment';
	executedAt: string;
	notes?: string;
	feesUsd?: number;
	legs: Array<{
		side: 'buy' | 'sell';
		shares?: number;
		optionType?: 'call' | 'put';
		strike?: number;
		expiration?: string;
		contracts?: number;
		price: number;
		multiplier?: number;
	}>;
}): TradeWithRelations | undefined {
	const db = getDb();
	const trade = db.select().from(trades).where(eq(trades.id, input.tradeId)).get();
	if (!trade) return undefined;

	const now = nowUtc();
	const execId = uuid();
	const execRow: NewTradeExecution = {
		id: execId,
		tradeId: input.tradeId,
		kind: input.kind,
		executedAt: input.executedAt,
		notes: input.notes ?? null,
		feesUsd: input.feesUsd ?? 0,
		createdAt: now,
	};
	db.insert(tradeExecutions).values(execRow).run();

	// Default multiplier based on trade instrument
	const defaultMultiplier = trade.instrument === 'option_spread' ? 100 : 1;

	for (const leg of input.legs) {
		const legRow: NewTradeExecutionLeg = {
			id: uuid(),
			executionId: execId,
			side: leg.side,
			shares: leg.shares ?? null,
			optionType: leg.optionType ?? null,
			strike: leg.strike ?? null,
			expiration: leg.expiration ?? null,
			contracts: leg.contracts ?? null,
			price: leg.price,
			multiplier: leg.multiplier ?? defaultMultiplier,
		};
		db.insert(tradeExecutionLegs).values(legRow).run();
	}

	// Recompute P&L
	recomputeTradePnl(input.tradeId);

	// Audit log
	db.insert(auditLog)
		.values({
			id: uuid(),
			entity: 'execution',
			entityId: execId,
			action: 'create',
			occurredAt: now,
		})
		.run();

	return getTrade(input.tradeId);
}

/** Delete an execution and its legs. */
export function deleteExecution(executionId: string): boolean {
	const db = getDb();
	const exec = db.select().from(tradeExecutions).where(eq(tradeExecutions.id, executionId)).get();
	if (!exec) return false;

	db.delete(tradeExecutionLegs).where(eq(tradeExecutionLegs.executionId, executionId)).run();
	db.delete(tradeExecutions).where(eq(tradeExecutions.id, executionId)).run();

	// Recompute P&L
	recomputeTradePnl(exec.tradeId);

	return true;
}

// ─── Screenshots ────────────────────────────────────────────────────────────

/** Add a screenshot to a trade. */
export function addScreenshot(input: {
	tradeId: string;
	timeframe: '4H' | '1H' | '15M' | '5M' | 'other';
	url: string;
	label?: string;
}): void {
	const db = getDb();
	db.insert(tradeScreenshots)
		.values({
			id: uuid(),
			tradeId: input.tradeId,
			timeframe: input.timeframe,
			url: input.url,
			label: input.label ?? null,
		})
		.run();
}

/** Delete a screenshot. */
export function deleteScreenshot(id: string): boolean {
	const db = getDb();
	const result = db.delete(tradeScreenshots).where(eq(tradeScreenshots.id, id)).run();
	return result.changes > 0;
}

// ─── P&L Recomputation ─────────────────────────────────────────────────────

/** Recompute realized P&L and R-multiple for a trade from its executions. */
export function recomputeTradePnl(tradeId: string): void {
	const db = getDb();
	const trade = db.select().from(trades).where(eq(trades.id, tradeId)).get();
	if (!trade) return;

	const execs = db.select().from(tradeExecutions).where(eq(tradeExecutions.tradeId, tradeId)).all();

	const pnlExecutions: PnlExecution[] = execs.map((exec) => {
		const legs = db
			.select()
			.from(tradeExecutionLegs)
			.where(eq(tradeExecutionLegs.executionId, exec.id))
			.all();

		const pnlLegs: PnlLeg[] = legs.map((leg) => ({
			side: leg.side as 'buy' | 'sell',
			price: leg.price,
			quantity: leg.shares ?? leg.contracts ?? 0,
			multiplier: leg.multiplier,
		}));

		return {
			kind: exec.kind as 'entry' | 'exit' | 'adjustment',
			legs: pnlLegs,
			feesUsd: exec.feesUsd,
		};
	});

	const realizedPnlUsd = computeRealizedPnl(pnlExecutions);
	const realizedPnlR = computeRMultiple(realizedPnlUsd, trade.plannedRiskUsd);
	const feesUsd = computeTotalFees(pnlExecutions);

	db.update(trades)
		.set({
			realizedPnlUsd,
			realizedPnlR,
			feesUsd,
			updatedAt: nowUtc(),
		})
		.where(eq(trades.id, tradeId))
		.run();
}

// ─── Calendar P&L ───────────────────────────────────────────────────────────

export interface CalendarDay {
	/** ISO date string "YYYY-MM-DD" (in user's local/UTC date from closedAt/openedAt). */
	date: string;
	pnlUsd: number;
	pnlR: number | null;
	tradeCount: number;
	wins: number;
	losses: number;
}

/**
 * Aggregate daily P&L for a given year/month.
 * Uses `closedAt` for closed trades, `openedAt` for open/cancelled.
 * Returns only days that have at least one trade.
 */
export function getCalendarMonth(year: number, month: number): CalendarDay[] {
	const db = getDb();
	// month is 1-based. Build prefix like "2026-05"
	const prefix = `${year}-${String(month).padStart(2, '0')}`;

	// Fetch all trades that fall in this calendar month
	// We match on the first 7 chars of closedAt or openedAt
	const rows = db
		.select({
			id: trades.id,
			openedAt: trades.openedAt,
			closedAt: trades.closedAt,
			status: trades.status,
			realizedPnlUsd: trades.realizedPnlUsd,
			realizedPnlR: trades.realizedPnlR,
		})
		.from(trades)
		.all()
		.filter((t) => {
			const dateStr = t.closedAt ?? t.openedAt;
			return dateStr.startsWith(prefix);
		});

	// Group by date
	const byDate = new Map<string, CalendarDay>();

	for (const row of rows) {
		const dateStr = (row.closedAt ?? row.openedAt).slice(0, 10); // "YYYY-MM-DD"
		const pnl = row.realizedPnlUsd ?? 0;
		const existing = byDate.get(dateStr);
		if (existing) {
			existing.pnlUsd += pnl;
			if (row.realizedPnlR != null) {
				existing.pnlR = (existing.pnlR ?? 0) + row.realizedPnlR;
			}
			existing.tradeCount += 1;
			if (pnl >= 0) existing.wins += 1;
			else existing.losses += 1;
		} else {
			byDate.set(dateStr, {
				date: dateStr,
				pnlUsd: pnl,
				pnlR: row.realizedPnlR ?? null,
				tradeCount: 1,
				wins: pnl >= 0 ? 1 : 0,
				losses: pnl < 0 ? 1 : 0,
			});
		}
	}

	return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Symbol autocomplete ────────────────────────────────────────────────────

/** Get distinct symbols from prior trades for autocomplete. */
export function getDistinctSymbols(): string[] {
	const db = getDb();
	const rows = db
		.select({ symbol: trades.symbol })
		.from(trades)
		.groupBy(trades.symbol)
		.orderBy(trades.symbol)
		.all();
	return rows.map((r) => r.symbol);
}
