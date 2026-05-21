/**
 * Migration runner — applies Drizzle migrations idempotently.
 * Called by `pnpm db:migrate` and at server startup in production.
 * Exits non-zero on failure so Render rolls back.
 */

import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createSqliteConnection } from './client';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';

try {
	console.log(`Running migrations on ${DATABASE_PATH}...`);
	const sqlite = createSqliteConnection(DATABASE_PATH);
	const db = drizzle(sqlite);

	migrate(db, {
		migrationsFolder: resolve(process.cwd(), 'db/migrations'),
	});

	sqlite.close();
	console.log('Migrations complete.');
} catch (error) {
	console.error('Migration failed:', error);
	process.exit(1);
}
