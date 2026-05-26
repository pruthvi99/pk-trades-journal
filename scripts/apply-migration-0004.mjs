/**
 * Apply migration 0004 directly: fix strategies global unique constraint.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database(path.join(__dirname, '../data/pk_trades.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Checking current state...');
const hasOld = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='strategies_name_unique'").get();
const hasNew = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='strategies_user_name_unique'").get();

console.log(`  strategies_name_unique: ${hasOld ? 'EXISTS' : 'not found'}`);
console.log(`  strategies_user_name_unique: ${hasNew ? 'EXISTS' : 'not found'}`);

if (!hasOld && hasNew) {
  console.log('Migration 0004 already applied — nothing to do.');
  db.close();
  process.exit(0);
}

console.log('\nApplying migration 0004...');
db.exec(`DROP INDEX IF EXISTS \`strategies_name_unique\`;`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS \`strategies_user_name_unique\` ON \`strategies\` (\`user_id\`, \`name\`);`);

// Register in drizzle migrations table
const now = Date.now();
db.prepare("INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run('0004_strategies_unique_per_user', now);

// Verify
const verifyOld = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='strategies_name_unique'").get();
const verifyNew = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='strategies_user_name_unique'").get();
console.log(`\nAfter migration:`);
console.log(`  strategies_name_unique: ${verifyOld ? '❌ STILL EXISTS' : '✅ removed'}`);
console.log(`  strategies_user_name_unique: ${verifyNew ? '✅ EXISTS' : '❌ not found'}`);

db.close();
console.log('Done.');
