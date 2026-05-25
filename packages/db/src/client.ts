import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

function createDatabase(client: ReturnType<typeof postgres>) {
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDatabase>;

let _db: Db | null = null;

export function getDb(connectionString?: string): Db {
  if (_db) return _db;
  const url = connectionString ?? process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is required');
  const client = postgres(url);
  _db = createDatabase(client);
  return _db;
}
