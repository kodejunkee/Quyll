import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:quyll.db');
    // Enforce foreign key constraints since SQLite disables them by default
    await dbInstance.execute('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}
