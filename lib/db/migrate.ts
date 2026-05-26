/**
 * Migration runner — applies Drizzle migrations idempotently.
 * Called by `pnpm db:migrate` and at server startup in production.
 * Exits non-zero on failure so Render rolls back.
 */

import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createSqliteConnection } from './client';
import * as schema from './schema';
import { seedDefaultTags } from './seed-defaults';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';

try {
	console.log(`Running migrations on ${DATABASE_PATH}...`);
	const sqlite = createSqliteConnection(DATABASE_PATH);
	const db = drizzle(sqlite, { schema });

	migrate(db, {
		migrationsFolder: resolve(process.cwd(), 'db/migrations'),
	});

	console.log('Migrations complete.');

	// Backfill default tags for any existing users that have 0 tags.
	// seedDefaultTags is idempotent — skips users who already have tags.
	const allUsers = db.select({ id: schema.users.id }).from(schema.users).all();
	const taggedUserIds = new Set(
		db
			.select({ userId: schema.tags.userId })
			.from(schema.tags)
			.all()
			.map((r) => r.userId),
	);
	let seeded = 0;
	for (const user of allUsers) {
		if (!taggedUserIds.has(user.id)) {
			seedDefaultTags(user.id);
			seeded++;
		}
	}
	if (seeded > 0) {
		console.log(`Seeded default tags for ${seeded} existing user(s).`);
	}

	sqlite.close();
} catch (error) {
	console.error('Migration failed:', error);
	process.exit(1);
}
