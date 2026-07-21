/**
 * Wrapper around @tauri-apps/plugin-sql providing a singleton-like
 * interface for opening, querying, and closing SQLite databases.
 */
import Database from '@tauri-apps/plugin-sql';

/** Map of currently open database connections keyed by path. */
const connections = new Map<string, Database>();

/**
 * Open (or reuse) a SQLite database at the given path.
 * Paths are relative to the Tauri app data directory when prefixed with `sqlite:`.
 */
export async function openDatabase(path: string): Promise<Database> {
  const existing = connections.get(path);
  if (existing) return existing;

  const db = await Database.load(path);
  connections.set(path, db);
  return db;
}

/** Execute a write statement (INSERT / UPDATE / DELETE / DDL). */
export async function execute(
  db: Database,
  sql: string,
  bindValues: unknown[] = [],
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const result = await db.execute(sql, bindValues);
  return {
    rowsAffected: result.rowsAffected ?? 0,
    lastInsertId: result.lastInsertId ?? 0,
  };
}

/** Run a SELECT and return typed rows. */
export async function select<T>(
  db: Database,
  sql: string,
  bindValues: unknown[] = [],
): Promise<T[]> {
  return db.select<T[]>(sql, bindValues);
}

/** Close a database connection and remove it from the pool. */
export async function closeDatabase(path: string): Promise<void> {
  const db = connections.get(path);
  if (db) {
    await db.close(path);
    connections.delete(path);
  }
}

/** Close every open connection. */
export async function closeAll(): Promise<void> {
  for (const [path, db] of connections) {
    await db.close(path);
    connections.delete(path);
  }
}
