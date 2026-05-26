/**
 * Seed default tags for a new user.
 * Called once on user creation — provides the chip-select defaults.
 */

import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { nowUtc } from '../time';
import { getDb, getSqlite } from './client';
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
 * Uses INSERT OR IGNORE to tolerate constraint violations gracefully.
 * Safe to call multiple times — idempotent.
 */
export function seedDefaultTags(userId: string): void {
	const db = getDb();
	const sqlite = getSqlite();

	// Skip if user already has tags
	const existing = db.select().from(tags).where(eq(tags.userId, userId)).all();
	if (existing.length > 0) return;

	const now = nowUtc();

	// Use raw INSERT OR IGNORE to survive any lingering unique constraint issues.
	// Drizzle's .onConflictDoNothing() generates different SQL across dialects —
	// raw SQL is more predictable for this critical path.
	const stmt = sqlite.prepare(
		'INSERT OR IGNORE INTO tags (id, user_id, label, category, archived, created_at) VALUES (?, ?, ?, ?, 0, ?)',
	);

	for (const [category, labels] of Object.entries(DEFAULT_TAGS)) {
		for (const label of labels) {
			stmt.run(uuid(), userId, label, category, now);
		}
	}
}
