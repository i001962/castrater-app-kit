import fp from 'fastify-plugin';
import { getDb, type Db } from '@castrater/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

export const dbPlugin = fp(async (app) => {
  if (!app.env.DATABASE_URL) {
    app.log.warn('DATABASE_URL not set — Postgres/Drizzle features disabled');
    return;
  }
  const db = getDb(app.env.DATABASE_URL);
  app.decorate('db', db);
});
