/**
 * Zod schemas for tag validation.
 */

import { z } from 'zod/v4';

export const tagCategoryEnum = z.enum(['setup', 'context', 'psychology', 'mistake', 'custom']);

export const createTagSchema = z.object({
	label: z
		.string()
		.min(1)
		.max(50)
		.transform((s) => s.trim()),
	category: tagCategoryEnum,
});

export const updateTagSchema = createTagSchema.partial().extend({
	archived: z.boolean().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
