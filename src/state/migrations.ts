/**
 * SQL Migrations
 *
 * Database schema for Mycelium Durable Object SQLite storage.
 *
 * @see docs/SPEC.md for full database specifications
 */

// =============================================================================
// Migration Definitions
// =============================================================================

export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: `
      -- Task history for analytics
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        params TEXT, -- JSON
        result TEXT CHECK(result IN ('success', 'error')),
        error_message TEXT,
        created_at INTEGER NOT NULL,
        duration_ms INTEGER
      );

      -- Index for querying recent tasks
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);

      -- Cached API responses
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      -- Index for cache expiry cleanup
      CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);

      -- User preferences (singleton)
      CREATE TABLE IF NOT EXISTS preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        default_region TEXT DEFAULT 'eu',
        default_tenant TEXT,
        notify_on_complete INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      -- Insert default preferences
      INSERT OR IGNORE INTO preferences (id, default_region, notify_on_complete, updated_at)
      VALUES (1, 'eu', 0, unixepoch() * 1000);
    `,
    down: `
      DROP TABLE IF EXISTS tasks;
      DROP TABLE IF EXISTS cache;
      DROP TABLE IF EXISTS preferences;
    `,
  },
];

// =============================================================================
// Migration Runner
// =============================================================================

/**
 * SqlStorage interface provided by Cloudflare Durable Objects
 * @see https://developers.cloudflare.com/durable-objects/api/sql-storage/
 */
export interface SqlStorage {
  exec(query: string): SqlStorageCursor;
}

interface SqlStorageCursor extends Iterable<Record<string, unknown>> {
  [Symbol.iterator](): Iterator<Record<string, unknown>>;
  toArray(): Record<string, unknown>[];
  one(): Record<string, unknown> | null;
  columnNames: string[];
  rowsRead: number;
  rowsWritten: number;
}

/**
 * Run all pending migrations
 *
 * Creates migrations tracking table and runs any pending migrations in order.
 */
export function runMigrations(sql: SqlStorage): void {
  // Create migrations tracking table if it doesn't exist
  sql.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  // Get current version
  const currentVersion = getCurrentVersion(sql);

  // Run pending migrations in order
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`[Migration] Running v${migration.version}: ${migration.name}`);

      // Execute the migration SQL
      sql.exec(migration.up);

      // Record the migration
      sql.exec(`
        INSERT INTO _migrations (version, name, applied_at)
        VALUES (${migration.version}, '${migration.name}', ${Date.now()})
      `);

      console.log(`[Migration] Completed v${migration.version}`);
    }
  }
}

/**
 * Get current migration version from _migrations table
 */
export function getCurrentVersion(sql: SqlStorage): number {
  try {
    const cursor = sql.exec(`SELECT MAX(version) as version FROM _migrations`);
    const results = [...cursor];
    if (results.length > 0 && results[0].version !== null) {
      return results[0].version as number;
    }
    return 0;
  } catch {
    // Table doesn't exist yet, return 0
    return 0;
  }
}

/**
 * Rollback to a specific version
 */
export function rollbackTo(sql: SqlStorage, targetVersion: number): void {
  const currentVersion = getCurrentVersion(sql);

  // Run down migrations in reverse order
  for (let i = migrations.length - 1; i >= 0; i--) {
    const migration = migrations[i];
    if (migration.version > targetVersion && migration.version <= currentVersion) {
      console.log(`[Migration] Rolling back v${migration.version}: ${migration.name}`);

      sql.exec(migration.down);
      sql.exec(`DELETE FROM _migrations WHERE version = ${migration.version}`);

      console.log(`[Migration] Rolled back v${migration.version}`);
    }
  }
}
