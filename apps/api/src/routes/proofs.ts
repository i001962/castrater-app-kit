import type { FastifyInstance } from 'fastify';
import { createProof, getProof, verifyProof } from '@castrater/proofs';

export async function proofsRoute(app: FastifyInstance) {
  const baseDir = app.env.STORAGE_BASE_DIR;

  app.post<{ Body: { data: unknown } }>(
    '/proofs/create',
    {
      schema: {
        body: {
          type: 'object',
          required: ['data'],
          properties: {
            data: {},
          },
        },
      },
    },
    async (req, reply) => {
      const proof = await createProof(req.body.data, baseDir);
      return reply.code(201).send({ ok: true, data: proof });
    }
  );

  app.get<{ Params: { proofId: string } }>('/proofs/:proofId', async (req, reply) => {
    try {
      const proof = await getProof(req.params.proofId, baseDir);
      return { ok: true, data: proof };
    } catch {
      return reply.code(404).send({ ok: false, error: 'Proof not found' });
    }
  });

  app.post<{ Params: { proofId: string } }>(
    '/proofs/:proofId/verify',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      try {
        const result = await verifyProof(req.params.proofId, baseDir);
        return { ok: true, data: result };
      } catch {
        return reply.code(404).send({ ok: false, error: 'Proof not found' });
      }
    }
  );
}
