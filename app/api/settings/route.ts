/**
 * GET /api/settings — return all settings as a key-value object.
 * PATCH /api/settings — update one or more settings.
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';

/** Known settings and their defaults. */
const DEFAULTS: Record<string, string> = {
	timezone: 'America/Chicago',
	startingBalance: '25000',
	commissionPerContract: '0.65',
	commissionPerShare: '0.005',
};

export async function GET() {
	const db = getDb();
	const rows = db.select().from(settings).all();

	const result: Record<string, string> = { ...DEFAULTS };
	for (const row of rows) {
		result[row.key] = row.value ?? DEFAULTS[row.key] ?? '';
	}

	return NextResponse.json(result);
}

export async function PATCH(request: Request) {
	const body = (await request.json()) as Record<string, string>;
	const db = getDb();
	const now = new Date().toISOString();

	for (const [key, value] of Object.entries(body)) {
		// Upsert each setting
		const existing = db.select().from(settings).where(eq(settings.key, key)).get();
		if (existing) {
			db.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, key)).run();
		} else {
			db.insert(settings).values({ key, value, updatedAt: now }).run();
		}
	}

	// Return updated settings
	const rows = db.select().from(settings).all();
	const result: Record<string, string> = { ...DEFAULTS };
	for (const row of rows) {
		result[row.key] = row.value ?? DEFAULTS[row.key] ?? '';
	}

	return NextResponse.json(result);
}
