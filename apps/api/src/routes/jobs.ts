import type { FastifyInstance } from 'fastify';
import { enqueueJob, getJobStatus, JOB_NAMES } from '@castrater/queue';

export async function jobsRoute(app: FastifyInstance) {
  app.post<{ Body: { name: string; data?: Record<string, unknown> } }>(
    '/jobs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    async (req, reply) => {
      const validNames = Object.values(JOB_NAMES) as string[];
      if (!validNames.includes(req.body.name)) {
        return reply.code(400).send({ ok: false, error: `Unknown job name: ${req.body.name}` });
      }
      const job = await enqueueJob(
        app.queues.default,
        req.body.name as (typeof JOB_NAMES)[keyof typeof JOB_NAMES],
        req.body.data ?? {}
      );
      return reply.code(201).send({ ok: true, data: { jobId: job.id } });
    }
  );

  app.get<{ Params: { id: string } }>('/jobs/:id', async (req, reply) => {
    const job = await getJobStatus(app.queues.default, req.params.id);
    if (!job) return reply.code(404).send({ ok: false, error: 'Job not found' });
    const state = await job.getState();
    return {
      ok: true,
      data: {
        id: job.id,
        name: job.name,
        state,
        result: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
      },
    };
  });
}
