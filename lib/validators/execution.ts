/**
 * Zod schemas for trade execution validation.
 */

import { z } from 'zod/v4';

export const executionKindEnum = z.enum(['entry', 'exit', 'adjustment']);
export const sideEnum = z.enum(['buy', 'sell']);
export const optionTypeEnum = z.enum(['call', 'put']);

export const legSchema = z.object({
	side: sideEnum,
	shares: z.number().positive().optional(),
	optionType: optionTypeEnum.optional(),
	strike: z.number().positive().optional(),
	expiration: z.string().date().optional(),
	contracts: z.number().positive().optional(),
	price: z.number().min(0),
	multiplier: z.number().int().positive().default(1),
});

export const createExecutionSchema = z.object({
	tradeId: z.string().uuid(),
	kind: executionKindEnum,
	executedAt: z.iso.datetime(),
	notes: z.string().max(2000).optional(),
	feesUsd: z.number().min(0).default(0),
	legs: z.array(legSchema).min(1),
});

export type LegInput = z.infer<typeof legSchema>;
export type CreateExecutionInput = z.infer<typeof createExecutionSchema>;
