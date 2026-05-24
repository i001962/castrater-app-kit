import type { FastifyInstance } from 'fastify';
import { writeJson, readJson } from '@castrater/storage';
import * as crypto from 'node:crypto';

export async function storageRoute(app: FastifyInstance) {
  const baseDir = app.env.STORAGE_BASE_DIR;

  app.post<{ Body: { content: string; meta?: unknown } }>(
    '/storage/text',
    {
      schema: {
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string' },
            meta: {},
          },
        },
      },
    },
    async (req, reply) => {
      const id = crypto.randomUUID();
      await writeJson(baseDir, `uploads/${id}.json`, {
        id,
        content: req.body.content,
        meta: req.body.meta,
        createdAt: new Date().toISOString(),
      });
      return reply.code(201).send({ ok: true, data: { id } });
    }
  );

  app.get<{ Params: { id: string } }>('/storage/:id', async (req, reply) => {
    try {
      const data = await readJson(baseDir, `uploads/${req.params.id}.json`);
      return { ok: true, data };
    } catch {
      return reply.code(404).send({ ok: false, error: 'Not found' });
    }
  });
}
