import type { FastifyInstance } from 'fastify';
import { parseFarcasterManifest, validateManifestShape } from '@castrater/miniapp';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function miniappRoute(app: FastifyInstance) {
  app.get(
    '/miniapp/manifest',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (_req, reply) => {
    // Try to read the manifest from the well-known path
    const manifestPath = path.join(
      process.env['WEB_PUBLIC_DIR'] ?? './public',
      '.well-known',
      'farcaster.json'
    );
    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      const manifest = parseFarcasterManifest(JSON.parse(raw));
      return { ok: true, data: manifest };
    } catch {
      return reply.code(404).send({ ok: false, error: 'Manifest not found or invalid' });
    }
    }
  );

  app.post<{ Body: unknown }>(
    '/miniapp/verify',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      const result = validateManifestShape(req.body);
      if (!result.success) {
        return reply.code(400).send({ ok: false, error: result.error });
      }
      return { ok: true, data: { valid: true, manifest: result.manifest } };
    }
  );
}
