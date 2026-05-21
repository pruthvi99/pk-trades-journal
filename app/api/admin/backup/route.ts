/**
 * POST /api/admin/backup — nightly backup cron endpoint.
 * Copies the live database to /var/data/backups/ and keeps the last 30.
 * Auth: x-pk-sync-token header must match ADMIN_SYNC_TOKEN.
 */

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';
const BACKUP_DIR = join(DATABASE_PATH, '..', 'backups');
const MAX_BACKUPS = 30;

/** Verify admin token. */
function verifyToken(request: Request): boolean {
	const token = request.headers.get('x-pk-sync-token');
	const expected = process.env.ADMIN_SYNC_TOKEN;
	if (!expected || !token) return false;
	return token === expected;
}

export async function POST(request: Request) {
	if (!verifyToken(request)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Ensure backup directory exists
		if (!existsSync(BACKUP_DIR)) {
			mkdirSync(BACKUP_DIR, { recursive: true });
		}

		const date = new Date().toISOString().slice(0, 10);
		const backupPath = join(BACKUP_DIR, `pk_trades-${date}.db`);

		// Use VACUUM INTO for a consistent point-in-time copy
		const db = new Database(DATABASE_PATH, { readonly: true });
		try {
			db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
		} finally {
			db.close();
		}

		// Prune old backups — keep only the newest MAX_BACKUPS
		const backups = readdirSync(BACKUP_DIR)
			.filter((f) => f.startsWith('pk_trades-') && f.endsWith('.db'))
			.map((f) => ({
				name: f,
				path: join(BACKUP_DIR, f),
				mtime: statSync(join(BACKUP_DIR, f)).mtimeMs,
			}))
			.sort((a, b) => b.mtime - a.mtime);

		for (const old of backups.slice(MAX_BACKUPS)) {
			unlinkSync(old.path);
		}

		return NextResponse.json({
			ok: true,
			backup: backupPath,
			totalBackups: Math.min(backups.length, MAX_BACKUPS),
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
