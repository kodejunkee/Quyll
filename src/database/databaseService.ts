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
  try {
    const result = await db.execute(sql, bindValues);
    return {
      rowsAffected: result.rowsAffected ?? 0,
      lastInsertId: result.lastInsertId ?? 0,
    };
  } catch (e: any) {
    if (e?.toString().includes('closed pool')) {
      console.warn('Recovering from closed pool error in execute...', db.path);
      const DatabaseClass = (await import('@tauri-apps/plugin-sql')).default;
      const newDb = await DatabaseClass.load(db.path);
      connections.set(db.path, newDb);
      Object.assign(db, newDb); // mutate original reference if possible
      const result = await newDb.execute(sql, bindValues);
      return {
        rowsAffected: result.rowsAffected ?? 0,
        lastInsertId: result.lastInsertId ?? 0,
      };
    }
    throw e;
  }
}

/** Run a SELECT and return typed rows. */
export async function select<T>(
  db: Database,
  sql: string,
  bindValues: unknown[] = [],
): Promise<T[]> {
  try {
    return await db.select<T[]>(sql, bindValues);
  } catch (e: any) {
    if (e?.toString().includes('closed pool')) {
      console.warn('Recovering from closed pool error in select...', db.path);
      const DatabaseClass = (await import('@tauri-apps/plugin-sql')).default;
      const newDb = await DatabaseClass.load(db.path);
      connections.set(db.path, newDb);
      Object.assign(db, newDb);
      return await newDb.select<T[]>(sql, bindValues);
    }
    throw e;
  }
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
