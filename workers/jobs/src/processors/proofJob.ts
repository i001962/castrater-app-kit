import type { Job } from 'bullmq';
import { createProof } from '@castrater/proofs';
import { logger } from '../logger.js';

export async function processProofJob(job: Job): Promise<unknown> {
  const { artifact, baseDir } = job.data as { artifact: unknown; baseDir?: string };
  const storageDir = baseDir ?? process.env['STORAGE_BASE_DIR'] ?? '/app/storage';

  logger.info({ jobId: job.id }, '[proof.process] creating proof');
  const proof = await createProof(artifact, storageDir);
  logger.info({ jobId: job.id, proofId: proof.proofId }, '[proof.process] done');
  return proof;
}
