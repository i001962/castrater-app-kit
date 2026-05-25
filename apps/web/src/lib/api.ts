const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:4001';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...opts?.headers },
      ...opts,
    });
    const text = await response.text();
    const parsed = text.length > 0 ? (JSON.parse(text) as ApiResponse<T>) : { ok: response.ok };
    if (!response.ok && parsed.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return parsed;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const api = {
  health: () => apiFetch<{ status: string; redis: string; db: string; qkmsMode: string; auth: string }>('/health'),
  info: () =>
    apiFetch<{
      name: string;
      version: string;
      env: string;
      features: Record<string, unknown>;
    }>('/v1/info'),

  authRegisterOptions: (input: { displayName?: string; email?: string }) =>
    apiFetch('/v1/auth/register/options', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  authRegisterVerify: (input: { response: unknown; displayName?: string; email?: string }) =>
    apiFetch('/v1/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  authLoginOptions: (input: { email?: string; userId?: string }) =>
    apiFetch('/v1/auth/login/options', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  authLoginVerify: (input: { response: unknown }) =>
    apiFetch('/v1/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  authLogout: () =>
    apiFetch('/v1/auth/logout', {
      method: 'POST',
    }),
  authMe: () => apiFetch('/v1/auth/me'),

  createDefaultApp: () =>
    apiFetch('/v1/apps/default', {
      method: 'POST',
    }),
  createWallet: (input: { appSlug?: string }) =>
    apiFetch('/v1/wallet/create', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  listWallets: () => apiFetch('/v1/wallets'),
  getWallet: (walletId: string) => apiFetch(`/v1/wallet/${walletId}`),
  signMessage: (walletId: string, message: string) =>
    apiFetch(`/v1/wallet/${walletId}/sign-message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  listWalletEvents: (walletId: string) => apiFetch(`/v1/wallet/${walletId}/events`),
};

