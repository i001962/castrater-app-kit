import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString:
      process.env['DATABASE_URL'] ??
      'postgresql://postgres:changeme@localhost:5432/castrater',
  } as never,
});
