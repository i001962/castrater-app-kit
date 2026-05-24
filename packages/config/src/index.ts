// Shared configuration constants for castrater-app-kit
export const APP_NAME = 'castrater-app-kit';
export const APP_VERSION = '0.1.0';

export const DEFAULTS = {
  API_PORT: 4001,
  WEB_PORT: 4000,
  REDIS_URL: 'redis://localhost:6379',
  POSTGRES_URL: 'postgresql://postgres:postgres@localhost:5432/castrater',
  HYPERSNAP_URL: 'https://hypersnap.castrater.xyz',
  INFERENCE_BASE_URL: 'http://localhost:11434',
  INFERENCE_MODEL: 'llama3.2',
  INFERENCE_EMBEDDING_MODEL: 'nomic-embed-text',
  INFERENCE_TIMEOUT_MS: 120000,
} as const;
