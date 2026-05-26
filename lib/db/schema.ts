/**
 * Drizzle ORM schema for pk_trades.
 * All tables, columns, constraints, and relations for the trade journal.
 *
 * Conventions:
 * - UUIDs stored as TEXT (SQLite has no native UUID)
 * - Timestamps stored as TEXT in ISO 8601 UTC
 * - Booleans stored as INTEGER (0/1)
 * - Enums stored as TEXT, validated by Zod at the app boundary
 */

import { relations } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	passcode: text('passcode').notNull().unique(),
	displayName: text('display_name'),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at').notNull(),
});

// ─── User settings (per-user key-value) ─────────────────────────────────────

export const userSettings = sqliteTable(
	'user_settings',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		value: text('value'),
		updatedAt: text('updated_at').notNull(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.key] })],
);

// ─── Reference / lookup tables ───────────────────────────────────────────────

export const strategies = sqliteTable(
	'strategies',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').references(() => users.id),
		name: text('name').notNull(),
		description: text('description'),
		defaultInstrument: text('default_instrument', { enum: ['option', 'stock'] }),
		archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull(),
	},
	(table) => [unique('strategies_user_name_unique').on(table.userId, table.name)],
);

export const tags = sqliteTable(
	'tags',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').references(() => users.id),
		label: text('label').notNull(),
		category: text('category', {
			enum: ['setup', 'context', 'psychology', 'mistake', 'custom'],
		}).notNull(),
		archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: text('created_at').notNull(),
	},
	(table) => [unique('tags_user_label_unique').on(table.userId, table.label)],
);

// ─── Trades ──────────────────────────────────────────────────────────────────

export const trades = sqliteTable('trades', {
	id: text('id').primaryKey(),
	userId: text('user_id').references(() => users.id),
	symbol: text('symbol').notNull(),
	instrument: text('instrument', { enum: ['option_spread', 'stock'] }).notNull(),
	direction: text('direction', { enum: ['long', 'short', 'neutral'] }).notNull(),
	strategyId: text('strategy_id').references(() => strategies.id),
	status: text('status', { enum: ['open', 'closed', 'cancelled'] })
		.notNull()
		.default('open'),

	// Plan
	plannedEntry: real('planned_entry'),
	plannedStop: real('planned_stop'),
	plannedTarget: real('planned_target'),
	plannedSize: real('planned_size'),
	plannedRiskUsd: real('planned_risk_usd'),

	// Timing
	openedAt: text('opened_at').notNull(),
	closedAt: text('closed_at'),

	// Computed — cached from executions, never user-entered
	realizedPnlUsd: real('realized_pnl_usd'),
	realizedPnlR: real('realized_pnl_r'),
	feesUsd: real('fees_usd').notNull().default(0),

	// Trade classification
	tradeQuality: text('trade_quality', {
		enum: ['A', 'A+', 'A++', 'B', 'B+'],
	}),
	tradeBasis: text('trade_basis', { enum: ['rules', 'intuition'] }),

	// Notes
	notesMd: text('notes_md'),

	// Pre-trade psychology
	preConfidence: integer('pre_confidence'),
	preConviction: text('pre_conviction'),
	preMood: text('pre_mood', {
		enum: ['calm', 'anxious', 'fomo', 'revenge', 'tired', 'focused', 'neutral'],
	}),
	preSleepHours: real('pre_sleep_hours'),
	preCaffeine: integer('pre_caffeine', { mode: 'boolean' }),
	preFollowingPlan: integer('pre_following_plan', { mode: 'boolean' }),

	// During-trade psychology
	duringStress: integer('during_stress'),
	duringDeviations: text('during_deviations'),

	// Post-trade psychology
	postSatisfaction: integer('post_satisfaction'),
	postMistakes: text('post_mistakes'),
	postLessons: text('post_lessons'),
	postMood: text('post_mood', {
		enum: ['calm', 'anxious', 'fomo', 'revenge', 'tired', 'focused', 'neutral'],
	}),
	postWouldRetake: integer('post_would_retake', { mode: 'boolean' }),

	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
});

// ─── Trade executions ────────────────────────────────────────────────────────

export const tradeExecutions = sqliteTable('trade_executions', {
	id: text('id').primaryKey(),
	tradeId: text('trade_id')
		.notNull()
		.references(() => trades.id, { onDelete: 'cascade' }),
	kind: text('kind', { enum: ['entry', 'exit', 'adjustment'] }).notNull(),
	executedAt: text('executed_at').notNull(),
	notes: text('notes'),
	feesUsd: real('fees_usd').notNull().default(0),
	createdAt: text('created_at').notNull(),
});

export const tradeExecutionLegs = sqliteTable('trade_execution_legs', {
	id: text('id').primaryKey(),
	executionId: text('execution_id')
		.notNull()
		.references(() => tradeExecutions.id, { onDelete: 'cascade' }),
	side: text('side', { enum: ['buy', 'sell'] }).notNull(),

	// Stock fields
	shares: real('shares'),

	// Option fields
	optionType: text('option_type', { enum: ['call', 'put'] }),
	strike: real('strike'),
	expiration: text('expiration'),
	contracts: real('contracts'),

	// Universal
	price: real('price').notNull(),
	multiplier: integer('multiplier').notNull().default(1),
});

// ─── Trade screenshots ───────────────────────────────────────────────────────

export const tradeScreenshots = sqliteTable('trade_screenshots', {
	id: text('id').primaryKey(),
	tradeId: text('trade_id')
		.notNull()
		.references(() => trades.id, { onDelete: 'cascade' }),
	timeframe: text('timeframe', { enum: ['4H', '1H', '15M', '5M', 'other'] }).notNull(),
	url: text('url').notNull(),
	label: text('label'),
	capturedAt: text('captured_at'),
});

// ─── Trade tags (join table) ─────────────────────────────────────────────────

export const tradeTags = sqliteTable('trade_tags', {
	tradeId: text('trade_id')
		.notNull()
		.references(() => trades.id, { onDelete: 'cascade' }),
	tagId: text('tag_id')
		.notNull()
		.references(() => tags.id, { onDelete: 'restrict' }),
});

// ─── Settings ────────────────────────────────────────────────────────────────

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value'),
	updatedAt: text('updated_at').notNull(),
});

// ─── Audit log ───────────────────────────────────────────────────────────────

export const auditLog = sqliteTable('audit_log', {
	id: text('id').primaryKey(),
	entity: text('entity').notNull(),
	entityId: text('entity_id'),
	action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
	diffJson: text('diff_json'),
	occurredAt: text('occurred_at').notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	trades: many(trades),
	strategies: many(strategies),
	tags: many(tags),
	settings: many(userSettings),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id],
	}),
}));

export const strategiesRelations = relations(strategies, ({ one, many }) => ({
	user: one(users, {
		fields: [strategies.userId],
		references: [users.id],
	}),
	trades: many(trades),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
	user: one(users, {
		fields: [tags.userId],
		references: [users.id],
	}),
	tradeTags: many(tradeTags),
}));

export const tradesRelations = relations(trades, ({ one, many }) => ({
	user: one(users, {
		fields: [trades.userId],
		references: [users.id],
	}),
	strategy: one(strategies, {
		fields: [trades.strategyId],
		references: [strategies.id],
	}),
	executions: many(tradeExecutions),
	screenshots: many(tradeScreenshots),
	tradeTags: many(tradeTags),
}));

export const tradeExecutionsRelations = relations(tradeExecutions, ({ one, many }) => ({
	trade: one(trades, {
		fields: [tradeExecutions.tradeId],
		references: [trades.id],
	}),
	legs: many(tradeExecutionLegs),
}));

export const tradeExecutionLegsRelations = relations(tradeExecutionLegs, ({ one }) => ({
	execution: one(tradeExecutions, {
		fields: [tradeExecutionLegs.executionId],
		references: [tradeExecutions.id],
	}),
}));

export const tradeScreenshotsRelations = relations(tradeScreenshots, ({ one }) => ({
	trade: one(trades, {
		fields: [tradeScreenshots.tradeId],
		references: [trades.id],
	}),
}));

export const tradeTagsRelations = relations(tradeTags, ({ one }) => ({
	trade: one(trades, {
		fields: [tradeTags.tradeId],
		references: [trades.id],
	}),
	tag: one(tags, {
		fields: [tradeTags.tagId],
		references: [tags.id],
	}),
}));

// ─── Type exports ────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSetting = typeof userSettings.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type NewStrategy = typeof strategies.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type TradeExecution = typeof tradeExecutions.$inferSelect;
export type NewTradeExecution = typeof tradeExecutions.$inferInsert;
export type TradeExecutionLeg = typeof tradeExecutionLegs.$inferSelect;
export type NewTradeExecutionLeg = typeof tradeExecutionLegs.$inferInsert;
export type TradeScreenshot = typeof tradeScreenshots.$inferSelect;
export type NewTradeScreenshot = typeof tradeScreenshots.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
