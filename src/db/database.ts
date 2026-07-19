// ---------------------------------------------------------------------------
// Litter Lab Pro — Database Layer
// Offline-first SQLite via expo-sqlite. No cloud sync, no accounts.
// ---------------------------------------------------------------------------

import * as SQLite from 'expo-sqlite';
import { ALL_CREATE_STATEMENTS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

// ── Initialisation ─────────────────────────────────────────────────────────

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const database = await SQLite.openDatabaseAsync('litter_lab_pro.db');

  // Run all CREATE TABLE statements in a single transaction
  await database.withTransactionAsync(async () => {
    for (const stmt of ALL_CREATE_STATEMENTS) {
      await database.execAsync(stmt);
    }
  });

  db = database;
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error(
      'Database not initialised. Call initDatabase() before accessing the database.',
    );
  }
  return db;
}

// ── Generic CRUD Helpers ───────────────────────────────────────────────────

/**
 * Insert a row into any table. Returns the resulting row (including the
 * auto-generated id).
 */
export async function insertRow<T extends Record<string, unknown>>(
  table: string,
  data: Partial<T>,
): Promise<T> {
  const database = getDatabase();
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = Object.values(data);

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

  const result = await database.runAsync(sql, ...values);
  return { ...data, id: result.lastInsertRowId } as unknown as T;
}

/**
 * Update a row by id. Returns the number of rows affected.
 */
export async function updateRow<T extends Record<string, unknown>>(
  table: string,
  id: number,
  data: Partial<T>,
): Promise<number> {
  const database = getDatabase();
  const keys = Object.keys(data);
  const setClauses = keys.map((k) => `${k} = ?`).join(', ');
  const values = Object.values(data);

  const sql = `UPDATE ${table} SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`;

  const result = await database.runAsync(sql, ...values, id);
  return result.changes;
}

/**
 * Delete a row by id. Returns the number of rows affected.
 */
export async function deleteRow(table: string, id: number): Promise<number> {
  const database = getDatabase();
  const result = await database.runAsync(
    `DELETE FROM ${table} WHERE id = ?`,
    id,
  );
  return result.changes;
}

/**
 * Return all rows from a table, ordered by id descending.
 */
export async function getAllRows<T>(table: string): Promise<T[]> {
  const database = getDatabase();
  return (await database.getAllAsync<T>(
    `SELECT * FROM ${table} ORDER BY id DESC`,
  )) as T[];
}

/**
 * Return rows matching a specific field value, ordered by id descending.
 */
export async function getRowsByField<T>(
  table: string,
  field: string,
  value: SQLite.SQLiteBindParams,
): Promise<T[]> {
  const database = getDatabase();
  return (await database.getAllAsync<T>(
    `SELECT * FROM ${table} WHERE ${field} = ? ORDER BY id DESC`,
    value,
  )) as T[];
}
