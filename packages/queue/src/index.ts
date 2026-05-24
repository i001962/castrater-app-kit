import { Queue, Job } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export const JOB_NAMES = {
  EXAMPLE_ECHO: 'example.echo',
  CRON_HEARTBEAT: 'cron.heartbeat',
  INFERENCE_MOCK: 'inference.mock',
  INFERENCE_GENERATE_TEXT: 'inference.generateText',
  WALLET_AUDIT: 'wallet.audit',
  PROOF_PROCESS: 'proof.process',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export interface JobPayload {
  name: JobName;
  data: Record<string, unknown>;
}

export function createQueue(name: string, connection: RedisOptions): Queue {
  return new Queue(name, { connection });
}

export async function enqueueJob(
  queue: Queue,
  name: JobName,
  data: Record<string, unknown>,
  opts?: { delay?: number; priority?: number }
): Promise<Job> {
  return queue.add(name, data, opts);
}

export async function getJobStatus(queue: Queue, jobId: string): Promise<Job | undefined> {
  return queue.getJob(jobId);
}

export { Queue, Job };
