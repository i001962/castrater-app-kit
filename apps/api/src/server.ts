import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { buildApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function start() {
  const app = await buildApp();
  await app.listen({
    port: app.env.PORT,
    host: app.env.HOST,
  });
  app.log.info(`API running at http://${app.env.HOST}:${app.env.PORT}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
