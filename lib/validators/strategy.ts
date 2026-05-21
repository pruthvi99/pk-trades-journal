/**
 * Zod schemas for strategy validation.
 */

import { z } from 'zod/v4';

export const createStrategySchema = z.object({
	name: z
		.string()
		.min(1)
		.max(100)
		.transform((s) => s.trim()),
	description: z.string().max(1000).optional(),
	defaultInstrument: z.enum(['option', 'stock']).optional(),
});

export const updateStrategySchema = createStrategySchema.partial().extend({
	archived: z.boolean().optional(),
});

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
