/**
 * GET /api/admin/db/snapshot — stream a consistent database snapshot.
 * Auth: x-pk-sync-token header must match ADMIN_SYNC_TOKEN.
 * Uses VACUUM INTO for point-in-time consistency.
 * Rate limited: max 1 request per 30 seconds.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';

/** Simple in-memory rate limiter. */
let lastRequestTime = 0;
const RATE_LIMIT_MS = 30_000;

/** Verify admin token. */
function verifyToken(request: Request): boolean {
	const token = request.headers.get('x-pk-sync-token');
	const expected = process.env.ADMIN_SYNC_TOKEN;
	if (!expected || !token) return false;
	return token === expected;
}

export async function GET(request: Request) {
	if (!verifyToken(request)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = Date.now();
	if (now - lastRequestTime < RATE_LIMIT_MS) {
		return NextResponse.json({ error: 'Rate limited. Try again in 30 seconds.' }, { status: 429 });
	}
	lastRequestTime = now;

	const tempPath = join(tmpdir(), `snapshot-${randomUUID()}.db`);

	try {
		// VACUUM INTO creates a consistent point-in-time copy
		const db = new Database(DATABASE_PATH, { readonly: true });
		try {
			db.exec(`VACUUM INTO '${tempPath.replace(/'/g, "''")}'`);
		} finally {
			db.close();
		}

		// Read and stream the file
		const buffer = readFileSync(tempPath);

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="pk_trades-snapshot.db"`,
				'Content-Length': buffer.length.toString(),
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	} finally {
		// Clean up temp file
		try {
			unlinkSync(tempPath);
		} catch {
			// Ignore cleanup errors
		}
	}
}
