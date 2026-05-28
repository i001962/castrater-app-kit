export const APP_NAME = 'castrater-app-kit';
export const APP_VERSION = '0.2.0';

export const AUTH_PROVIDERS = ['passkey', 'demo'] as const;
export const SESSION_PROVIDERS = ['cookie', 'none'] as const;
export const CUSTODY_PROVIDERS = ['local', 'mock', 'quilibrium-sdk'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
export type SessionProvider = (typeof SESSION_PROVIDERS)[number];
export type CustodyProvider = (typeof CUSTODY_PROVIDERS)[number];

export interface ScaffoldSelections {
  projectName: string;
  authProvider: AuthProvider;
  sessionProvider: SessionProvider;
  custodyProvider: CustodyProvider;
}

export const DEFAULTS = {
  API_PORT: 4001,
  WEB_PORT: 4000,
  REDIS_URL: 'redis://localhost:6379',
  POSTGRES_URL: 'postgresql://postgres:changeme@localhost:5432/castrater',
  AUTH_PROVIDER: 'passkey' as AuthProvider,
  SESSION_PROVIDER: 'cookie' as SessionProvider,
  CUSTODY_PROVIDER: 'local' as CustodyProvider,
  LOCAL_CUSTODY_SECRET: 'change-me-local-custody-secret',
  DEMO_USER_EMAIL: 'demo@example.com',
  DEMO_USER_DISPLAY_NAME: 'Demo User',
} as const;

export function slugifyProjectName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
