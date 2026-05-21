/**
 * Zod schemas for settings validation.
 */

import { z } from 'zod/v4';

export const updateSettingSchema = z.object({
	key: z.string().min(1).max(100),
	value: z.string().max(10000),
});

export const settingsSchema = z.object({
	timezone: z.string().default('America/Chicago'),
	startingBalance: z.number().positive().default(25000),
	defaultCommissionPerContract: z.number().min(0).default(0.65),
	defaultCommissionPerShare: z.number().min(0).default(0),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type SettingsConfig = z.infer<typeof settingsSchema>;
