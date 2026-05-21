/**
 * Database client — better-sqlite3 + Drizzle.
 * Single SQLite connection per process with WAL mode and FK enforcement.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/pk_trades.db';

/**
 * Create a raw better-sqlite3 connection with correct pragmas.
 * WAL mode for concurrent reads. Foreign keys enforced.
 */
export function createSqliteConnection(path: string = DATABASE_PATH): Database.Database {
	const sqlite = new Database(path);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	return sqlite;
}

/** Singleton connection — reused across the process lifetime. */
let _sqlite: Database.Database | null = null;

function getSqlite(): Database.Database {
	if (!_sqlite) {
		_sqlite = createSqliteConnection();
	}
	return _sqlite;
}

/** Drizzle ORM instance with full schema + relations. */
export function getDb() {
	return drizzle(getSqlite(), { schema });
}

/** Type of the Drizzle database instance. */
export type Db = ReturnType<typeof getDb>;

/**
 * Create an in-memory database for testing.
 * Returns both the raw sqlite connection and the Drizzle instance.
 */
export function createTestDb() {
	const sqlite = new Database(':memory:');
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	return { sqlite, db };
}
