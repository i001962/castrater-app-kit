import 'dotenv/config';
import { Worker } from 'bullmq';
import { JOB_NAMES } from '@castrater/queue';
import { logger } from './logger.js';
import { processExampleJob } from './processors/exampleJob.js';
import { processCronJob } from './processors/cronJob.js';
import { processInferenceJob } from './processors/inferenceJob.js';
import { processWalletJob } from './processors/walletJob.js';
import { processProofJob } from './processors/proofJob.js';
import { defaultQueue } from './queues.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const connection = { url: REDIS_URL };

const worker = new Worker(
  'default',
  async (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Processing job');

    switch (job.name) {
      case JOB_NAMES.EXAMPLE_ECHO:
        return processExampleJob(job);
      case JOB_NAMES.CRON_HEARTBEAT:
        return processCronJob(job);
      case JOB_NAMES.INFERENCE_MOCK:
      case JOB_NAMES.INFERENCE_GENERATE_TEXT:
        return processInferenceJob(job);
      case JOB_NAMES.WALLET_AUDIT:
        return processWalletJob(job);
      case JOB_NAMES.PROOF_PROCESS:
        return processProofJob(job);
      default:
        logger.warn({ jobName: job.name }, 'Unknown job name — skipping');
        return null;
    }
  },
  {
    connection,
    concurrency: 4,
  }
);

// Cron: heartbeat every 5 minutes
async function setupCronJobs() {
  await defaultQueue.add(
    JOB_NAMES.CRON_HEARTBEAT,
    {},
    {
      repeat: { every: 5 * 60 * 1000 },
      jobId: 'cron-heartbeat',
    }
  );
  logger.info('Cron heartbeat scheduled (every 5 minutes)');
}

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, jobName: job.name, result }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, 'Job failed');
});

setupCronJobs()
  .then(() => logger.info('Worker started'))
  .catch((err) => {
    logger.error({ err }, 'Failed to start worker');
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — closing worker');
  await worker.close();
  await defaultQueue.close();
  process.exit(0);
});
