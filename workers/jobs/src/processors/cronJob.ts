import type { Job } from 'bullmq';
import { logger } from '../logger.js';

export async function processCronJob(job: Job): Promise<{ heartbeat: string }> {
  const ts = new Date().toISOString();
  logger.info({ jobId: job.id, timestamp: ts }, '[cron.heartbeat] ♥');
  return { heartbeat: ts };
}
