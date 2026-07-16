import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, TARGET_VERSION } from './schema';

const DB_NAME = 'arrego.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Conexão única, aberta sob demanda e migrada antes de qualquer leitura.
 * Todo repositório passa por aqui — ninguém abre o banco por conta própria.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((err) => {
      // Sem isso, uma falha de abertura fica cacheada para sempre e o app
      // nunca mais tenta de novo nesta sessão.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let version = current; version < TARGET_VERSION; version++) {
    const migration = MIGRATIONS[version];
    if (!migration) continue;
    await db.execAsync(migration);
    // PRAGMA não aceita parâmetro vinculado; `version` é um índice de array
    // controlado por nós, nunca entrada do usuário.
    await db.execAsync(`PRAGMA user_version = ${version + 1};`);
  }

  return db;
}

/** Só para testes/desenvolvimento e para o botão "apagar meus dados". */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.closeAsync();
  await SQLite.deleteDatabaseAsync(DB_NAME);
  dbPromise = null;
}
