/**
 * Zod schemas for trade-related data validation.
 * Single source of truth for runtime validation and TypeScript types.
 */

import { z } from 'zod/v4';

export const instrumentEnum = z.enum(['option_spread', 'stock']);
export const directionEnum = z.enum(['long', 'short', 'neutral']);
export const tradeStatusEnum = z.enum(['open', 'closed', 'cancelled']);
export const moodEnum = z.enum([
	'calm',
	'anxious',
	'fomo',
	'revenge',
	'tired',
	'focused',
	'neutral',
]);
export const tradeQualityEnum = z.enum(['A', 'A+', 'A++', 'B', 'B+']);
export const tradeBasisEnum = z.enum(['rules', 'intuition']);

export const createTradeSchema = z.object({
	symbol: z
		.string()
		.min(1)
		.max(10)
		.transform((s) => s.toUpperCase()),
	instrument: instrumentEnum,
	direction: directionEnum,
	strategyId: z.string().uuid().optional(),

	// Plan — all optional
	plannedEntry: z.number().positive().optional(),
	plannedStop: z.number().positive().optional(),
	plannedTarget: z.number().positive().optional(),
	plannedSize: z.number().positive().optional(),
	plannedRiskUsd: z.number().positive().optional(),

	openedAt: z.iso.datetime(),
	notesMd: z.string().max(10000).optional(),

	// Trade classification
	tradeQuality: tradeQualityEnum.optional(),
	tradeBasis: tradeBasisEnum.optional(),

	// Pre-trade psychology — all optional
	preConfidence: z.number().int().min(1).max(10).optional(),
	preConviction: z.string().max(2000).optional(),
	preMood: moodEnum.optional(),
	preSleepHours: z.number().min(0).max(24).optional(),
	preCaffeine: z.boolean().optional(),
	preFollowingPlan: z.boolean().optional(),

	// Tags — array of tag IDs
	tagIds: z.array(z.string().uuid()).optional(),
});

export const updateTradeSchema = createTradeSchema.partial().extend({
	status: tradeStatusEnum.optional(),
	closedAt: z.iso.datetime().optional(),

	// During-trade psychology
	duringStress: z.number().int().min(1).max(10).optional(),
	duringDeviations: z.string().max(2000).optional(),

	// Post-trade psychology
	postSatisfaction: z.number().int().min(1).max(10).optional(),
	postMistakes: z.string().max(2000).optional(),
	postLessons: z.string().max(2000).optional(),
	postMood: moodEnum.optional(),
	postWouldRetake: z.boolean().optional(),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;
