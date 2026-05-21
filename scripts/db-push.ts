/**
 * db-push — upload local database to production.
 * ⚠️ DANGEROUS: Overwrites the production database.
 *
 * Usage: pnpm db:push
 *
 * Requires typing "OVERWRITE PRODUCTION" to confirm.
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const LOCAL_DB_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';
const PROD_URL = process.env.PROD_SYNC_URL || 'https://pk-trades.onrender.com';
const SYNC_TOKEN = process.env.ADMIN_SYNC_TOKEN;

function prompt(question: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function main() {
	if (!SYNC_TOKEN) {
		console.error('❌ ADMIN_SYNC_TOKEN is not set. Add it to .env.local');
		process.exit(1);
	}

	console.log('⚠️  WARNING: This will OVERWRITE the production database.');
	console.log(`   Source: ${LOCAL_DB_PATH}`);
	console.log(`   Target: ${PROD_URL}`);
	console.log('');

	const answer = await prompt('Type "OVERWRITE PRODUCTION" to confirm: ');
	if (answer !== 'OVERWRITE PRODUCTION') {
		console.log('❌ Aborted.');
		process.exit(1);
	}

	console.log('\n📤 Uploading...');

	// First, trigger a backup on the server
	const backupRes = await fetch(`${PROD_URL}/api/admin/backup`, {
		method: 'POST',
		headers: { 'x-pk-sync-token': SYNC_TOKEN },
	});
	if (backupRes.ok) {
		console.log('💾 Server backup created before push');
	} else {
		console.warn('⚠️  Server backup failed, continuing anyway...');
	}

	// Upload the local database
	const buffer = readFileSync(LOCAL_DB_PATH);
	console.log(`   Uploading ${(buffer.length / 1024).toFixed(1)} KB...`);

	// Note: The push endpoint would need to be created on the server.
	// For now, this is a placeholder that demonstrates the pattern.
	// In practice, you'd use SCP/SFTP via Render shell access, or
	// create a POST /api/admin/db/restore endpoint.
	console.log('');
	console.log('⚠️  Direct database upload endpoint not yet implemented.');
	console.log('   To push manually:');
	console.log('   1. SSH into the Render instance');
	console.log(`   2. Copy the database file to ${PROD_URL}`);
	console.log('   3. Restart the service');
	console.log('');
	console.log('   Or use the Render dashboard to upload via shell.');
}

main().catch((err) => {
	console.error('❌ Push failed:', err);
	process.exit(1);
});
