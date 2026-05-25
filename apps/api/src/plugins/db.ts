import fp from 'fastify-plugin';
import { getDb, type Db } from '@castrater/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

export const dbPlugin = fp<{ db?: Db }>(async (app, opts) => {
  const db = opts.db ?? getDb(app.env.DATABASE_URL);
  app.decorate('db', db);
});
