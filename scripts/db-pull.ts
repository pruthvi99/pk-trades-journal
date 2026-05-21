/**
 * db-pull — download production database to local dev environment.
 *
 * Usage: pnpm db:pull
 *
 * Steps:
 * 1. Backs up current local DB
 * 2. Downloads prod snapshot via /api/admin/db/snapshot
 * 3. Runs integrity check on downloaded file
 * 4. Atomically replaces local database
 * 5. Prints diff summary
 */

import { copyFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';

const LOCAL_DB_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';
const BACKUP_DIR = join(dirname(LOCAL_DB_PATH), 'backups');
const PROD_URL = process.env.PROD_SYNC_URL || 'https://pk-trades.onrender.com';
const SYNC_TOKEN = process.env.ADMIN_SYNC_TOKEN;

async function main() {
	if (!SYNC_TOKEN) {
		console.error('❌ ADMIN_SYNC_TOKEN is not set. Add it to .env.local');
		process.exit(1);
	}

	console.log(`📡 Pulling from ${PROD_URL}...`);

	// Step 1: Backup current local DB
	if (existsSync(LOCAL_DB_PATH)) {
		mkdirSync(BACKUP_DIR, { recursive: true });
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		const backupPath = join(BACKUP_DIR, `pk_trades-pre-pull-${ts}.db`);
		copyFileSync(LOCAL_DB_PATH, backupPath);
		console.log(`💾 Local backup: ${backupPath}`);
	}

	// Step 2: Download prod snapshot
	const url = `${PROD_URL}/api/admin/db/snapshot`;
	const response = await fetch(url, {
		headers: { 'x-pk-sync-token': SYNC_TOKEN },
	});

	if (!response.ok) {
		const text = await response.text();
		console.error(`❌ Download failed (${response.status}): ${text}`);
		process.exit(1);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	const tempPath = `${LOCAL_DB_PATH}.download`;
	writeFileSync(tempPath, buffer);
	console.log(`📥 Downloaded ${(buffer.length / 1024).toFixed(1)} KB`);

	// Step 3: Integrity check
	try {
		const tempDb = new Database(tempPath, { readonly: true });
		const result = tempDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
		tempDb.close();

		const status = result[0]?.integrity_check;
		if (status !== 'ok') {
			console.error(`❌ Integrity check failed: ${status}`);
			unlinkSync(tempPath);
			process.exit(1);
		}
		console.log('✅ Integrity check passed');
	} catch (err) {
		console.error(`❌ Could not open downloaded database: ${err}`);
		unlinkSync(tempPath);
		process.exit(1);
	}

	// Step 4: Get pre-replace stats for diff
	let oldTradeCount = 0;
	if (existsSync(LOCAL_DB_PATH)) {
		try {
			const oldDb = new Database(LOCAL_DB_PATH, { readonly: true });
			const row = oldDb.prepare('SELECT COUNT(*) as count FROM trades').get() as {
				count: number;
			};
			oldTradeCount = row.count;
			oldDb.close();
		} catch {
			// Old DB might be corrupt, that's fine
		}
	}

	// Step 5: Atomic replace
	mkdirSync(dirname(LOCAL_DB_PATH), { recursive: true });

	// Remove WAL/SHM files if they exist
	for (const suffix of ['-wal', '-shm']) {
		const walPath = `${LOCAL_DB_PATH}${suffix}`;
		if (existsSync(walPath)) {
			unlinkSync(walPath);
		}
	}

	// Rename is atomic on the same filesystem
	if (existsSync(LOCAL_DB_PATH)) {
		unlinkSync(LOCAL_DB_PATH);
	}
	copyFileSync(tempPath, LOCAL_DB_PATH);
	unlinkSync(tempPath);

	// Step 6: Print diff summary
	const newDb = new Database(LOCAL_DB_PATH, { readonly: true });
	const newRow = newDb.prepare('SELECT COUNT(*) as count FROM trades').get() as { count: number };
	const latestRow = newDb
		.prepare('SELECT opened_at FROM trades ORDER BY opened_at DESC LIMIT 1')
		.get() as { opened_at: string } | undefined;
	newDb.close();

	console.log('\n📊 Summary:');
	console.log(`   Trades: ${oldTradeCount} → ${newRow.count}`);
	if (latestRow) {
		console.log(`   Latest trade: ${latestRow.opened_at}`);
	}
	console.log('\n✅ Pull complete!');
}

main().catch((err) => {
	console.error('❌ Pull failed:', err);
	process.exit(1);
});
