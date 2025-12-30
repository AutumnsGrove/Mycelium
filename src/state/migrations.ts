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
 * Run all pending migrations
 *
 * TODO: Implement when Durable Object storage is available
 */
export async function runMigrations(sql: SqlStorage): Promise<void> {
  // TODO: Implement migration runner
  // - Create migrations table if not exists
  // - Get current version
  // - Run pending migrations in order
  // - Update version after each migration
  console.log("[STUB] runMigrations called");
}

/**
 * Get current migration version
 */
export async function getCurrentVersion(sql: SqlStorage): Promise<number> {
  // TODO: Implement
  return 0;
}

/**
 * Rollback to a specific version
 */
export async function rollbackTo(sql: SqlStorage, targetVersion: number): Promise<void> {
  // TODO: Implement rollback
  console.log(`[STUB] rollbackTo version ${targetVersion}`);
}

// =============================================================================
// Type Stubs (will be provided by Cloudflare Workers runtime)
// =============================================================================

// Placeholder for Cloudflare SqlStorage type
interface SqlStorage {
  exec(query: string): unknown;
  prepare(query: string): SqlPreparedStatement;
}

interface SqlPreparedStatement {
  bind(...values: unknown[]): SqlPreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ changes: number }>;
}
