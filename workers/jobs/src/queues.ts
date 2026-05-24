import { Queue } from 'bullmq';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

const connection = { url: REDIS_URL };

export const defaultQueue = new Queue('default', { connection });
