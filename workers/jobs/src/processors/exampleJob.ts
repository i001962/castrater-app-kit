import type { Job } from 'bullmq';
import { logger } from '../logger.js';

export async function processExampleJob(job: Job): Promise<{ echoed: unknown }> {
  logger.info({ jobId: job.id, data: job.data }, '[example.echo] processing');
  // Simple echo job — demonstrates job processing pattern
  return { echoed: job.data };
}
