import type { FastifyInstance } from 'fastify';
import { kvGet, kvSet, kvDel } from '@castrater/kv';

export async function kvRoute(app: FastifyInstance) {
  app.post<{ Body: { key: string; value: string; ttl?: number } }>(
    '/kv',
    {
      schema: {
        body: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
            ttl: { type: 'number' },
          },
        },
      },
    },
    async (req, reply) => {
      await kvSet(app.redis, req.body.key, req.body.value, req.body.ttl);
      return reply.code(201).send({ ok: true });
    }
  );

  app.get<{ Params: { key: string } }>('/kv/:key', async (req, reply) => {
    const value = await kvGet(app.redis, req.params.key);
    if (value === null) return reply.code(404).send({ ok: false, error: 'Key not found' });
    return { ok: true, data: { key: req.params.key, value } };
  });

  app.delete<{ Params: { key: string } }>('/kv/:key', async (req, _reply) => {
    await kvDel(app.redis, req.params.key);
    return { ok: true };
  });
}
