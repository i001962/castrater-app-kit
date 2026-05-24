import type { FastifyInstance } from 'fastify';
import { HyperSnapClient } from '@castrater/hypersnap';
import { normalizeFid } from '@castrater/farcaster';

export async function farcasterRoute(app: FastifyInstance) {
  app.get<{ Params: { fid: string } }>('/farcaster/fid/:fid', async (req, reply) => {
    try {
      const fid = normalizeFid(req.params.fid);
      const client = new HyperSnapClient(app.env.HYPERSNAP_URL);
      const user = await client.getUserByFid(fid);
      return { ok: true, data: user };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(404).send({ ok: false, error: message });
    }
  });
}
