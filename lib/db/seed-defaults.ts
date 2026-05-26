/**
 * Seed default tags for a new user.
 * Called once on user creation — provides the chip-select defaults.
 */

import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { nowUtc } from '../time';
import { getDb } from './client';
import { tags } from './schema';

/** Default tags grouped by category. */
const DEFAULT_TAGS: Record<string, string[]> = {
	mistake: [
		'Overtrading',
		'Revenge Trading',
		'Risked Too Much',
		'Ignored Stop',
		'FOMO Entry',
		'Chased Entry',
		'No Plan',
		'Early Exit',
		'Moved Stop',
	],
	setup: [
		'Breakout',
		'VWAP Bounce',
		'Mean Reversion',
		'Trend Continuation',
		'Support/Resistance',
		'Gap Fill',
	],
	context: ['High IV', 'Low IV', 'Earnings Play', 'FOMC/News', 'Low Volume', 'Trend Day'],
	psychology: ['Followed Plan', 'Stayed Patient', 'Managed Emotions', 'Tilt', 'Hesitated'],
};

/**
 * Insert default tags for a user. Skips if user already has tags.
 * Safe to call multiple times — checks existing count first.
 */
export function seedDefaultTags(userId: string): void {
	const db = getDb();

	// Skip if user already has tags
	const existing = db.select().from(tags).where(eq(tags.userId, userId)).all();
	if (existing.length > 0) return;

	const now = nowUtc();

	for (const [category, labels] of Object.entries(DEFAULT_TAGS)) {
		for (const label of labels) {
			db.insert(tags)
				.values({
					id: uuid(),
					userId,
					label,
					category: category as 'mistake' | 'setup' | 'context' | 'psychology',
					archived: false,
					createdAt: now,
				})
				.run();
		}
	}
}
