import type { Job } from 'bullmq';
import { createInferenceClient } from '@castrater/inference';
import { logger } from '../logger.js';

export async function processInferenceJob(job: Job): Promise<unknown> {
  const { prompt, model, mode } = job.data as {
    prompt: string;
    model?: string;
    mode?: 'mock' | 'local' | 'remote';
  };

  logger.info({ jobId: job.id, mode, model }, '[inference] starting');

  const client = createInferenceClient(mode);
  const result = await client.generateText({ prompt, model });

  logger.info({ jobId: job.id, textLength: result.text.length }, '[inference] done');
  return result;
}
