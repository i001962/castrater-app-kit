import fp from 'fastify-plugin';
import { Queue } from 'bullmq';

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      default: Queue;
    };
  }
}

export const queuesPlugin = fp(async (app) => {
  const connection = { url: app.env.REDIS_URL };
  const defaultQueue = new Queue('default', { connection });

  app.decorate('queues', { default: defaultQueue });

  app.addHook('onClose', async () => {
    await defaultQueue.close();
  });
});
