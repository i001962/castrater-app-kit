const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:4001';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface StatusResponse {
  authEnabled: boolean;
  db: string;
  redis: string;
  custody: {
    mode: 'local' | 'mock' | 'quilibrium-sdk';
    configured: boolean;
    server?: string;
    qnzmServer?: string;
  };
  scaffold: {
    authProvider: 'passkey' | 'demo';
    sessionProvider: 'cookie' | 'none';
    custodyProvider: 'local' | 'mock' | 'quilibrium-sdk';
  };
  webauthn: { rpId: string; origin: string };
}

export interface SessionUser {
  id: string;
  displayName: string | null;
  email: string | null;
  fid?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletRecord {
  walletId: string;
  address: string;
  chain: string;
  status: string;
  appSlug: string;
  appName: string;
  createdAt: string;
}

export interface WalletEventRecord {
  id: string;
  walletId: string;
  eventType: string;
  requestId: string | null;
  payloadHash: string | null;
  signature: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SignMessageResult {
  wallet: {
    walletId: string;
    address: string;
    chain: string;
    status: string;
    qkmsKeyId: string;
    createdAt: string;
    appAccountId: string;
    appSlug: string;
    appName: string;
    policyId: string | null;
  };
  signature: string;
  eventId: string;
  payloadHash: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  return (await response.json()) as ApiResponse<T>;
}

export const api = {
  health: () => request<{ status: string; db: string; redis: string }>('/health'),
  status: () =>
    request<StatusResponse>('/v1/status'),
  registerOptions: (payload: { displayName?: string; email?: string }) =>
    request('/v1/auth/register/options', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyRegistration: (payload: unknown) =>
    request<SessionUser>(
      '/v1/auth/register/verify',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  loginOptions: (payload: { email?: string; userId?: string }) =>
    request('/v1/auth/login/options', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyLogin: (payload: unknown) =>
    request<SessionUser>(
      '/v1/auth/login/verify',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  me: () => request<SessionUser>('/v1/auth/me'),
  logout: () => request('/v1/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
  ensureDefaultApp: () =>
    request('/v1/apps/default', { method: 'POST', body: JSON.stringify({}) }),
  createWallet: (payload?: { appSlug?: string }) =>
    request<{
      wallet: {
        id: string;
        appAccountId: string;
        qkmsKeyId: string;
        address: string;
        chain: string;
        status: string;
        policyId: string | null;
        createdAt: string;
      };
      app: {
        id: string;
        slug: string;
        name: string;
        createdAt: string;
      };
      event: WalletEventRecord;
    }>('/v1/wallet/create', {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
  listWallets: () => request<WalletRecord[]>('/v1/wallets'),
  getWalletEvents: (walletId: string) => request<WalletEventRecord[]>(`/v1/wallet/${walletId}/events`),
  signMessage: (walletId: string, message: string) =>
    request<SignMessageResult>(
      `/v1/wallet/${walletId}/sign-message`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    ),
};
