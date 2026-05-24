import type { FastifyInstance } from 'fastify';
import { enqueueJob, JOB_NAMES } from '@castrater/queue';

export async function inferenceRoute(app: FastifyInstance) {
  app.post<{ Body: { prompt: string; model?: string } }>(
    '/inference/jobs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string' },
            model: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      // Inference is ALWAYS enqueued — never run inline in the API
      const job = await enqueueJob(app.queues.default, JOB_NAMES.INFERENCE_GENERATE_TEXT, {
        prompt: req.body.prompt,
        model: req.body.model,
        mode: app.env.INFERENCE_MODE,
      });
      return reply.code(201).send({ ok: true, data: { jobId: job.id } });
    }
  );

  app.get<{ Params: { id: string } }>('/inference/jobs/:id', async (req, reply) => {
    const job = await app.queues.default.getJob(req.params.id);
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
      },
    };
  });
}
