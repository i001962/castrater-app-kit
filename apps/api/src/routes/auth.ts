import type { FastifyInstance } from 'fastify';
import type {
  AuthenticationVerifyBody,
  RegistrationVerifyBody,
} from '../services/authService.js';

export async function authRoute(app: FastifyInstance) {
  app.post<{ Body: { displayName?: string; email?: string } }>(
    '/auth/register/options',
    async (request) => {
      const options = await app.auth.createRegistrationOptions(request.body ?? {});
      return { ok: true, data: options };
    }
  );

  app.post('/auth/register/verify', async (request, reply) => {
    try {
      const user = await app.auth.verifyRegistration(
        request.body as RegistrationVerifyBody,
        reply
      );
      return { ok: true, data: user };
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  });

  app.post<{ Body: { email?: string; userId?: string } }>(
    '/auth/login/options',
    async (request) => {
      const options = await app.auth.createAuthenticationOptions(request.body ?? {});
      return { ok: true, data: options };
    }
  );

  app.post('/auth/login/verify', async (request, reply) => {
    try {
      const user = await app.auth.verifyAuthentication(
        request.body as AuthenticationVerifyBody,
        reply
      );
      return { ok: true, data: user };
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  });

  app.post('/auth/logout', async (request, reply) => {
    await app.auth.logout(request.cookies[app.env.SESSION_COOKIE_NAME], reply);
    return { ok: true };
  });

  app.get('/auth/me', async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send({ ok: false, error: 'Authentication required' });
    }
    return { ok: true, data: request.currentUser };
  });
}
