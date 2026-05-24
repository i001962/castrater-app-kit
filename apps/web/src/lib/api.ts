const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:4001';

export async function apiFetch<T>(
  path: string,
  opts?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...opts?.headers },
      ...opts,
    });
    const json = await res.json();
    return json as { ok: boolean; data?: T; error?: string };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export const api = {
  health: () => apiFetch<{ status: string; redis: string }>('/health'),
  info: () => apiFetch<{ name: string; version: string; env: string; features: Record<string, unknown> }>('/v1/info'),
  kvGet: (key: string) => apiFetch<{ key: string; value: string }>(`/v1/kv/${key}`),
  kvSet: (key: string, value: string, ttl?: number) =>
    apiFetch('/v1/kv', { method: 'POST', body: JSON.stringify({ key, value, ttl }) }),
  kvDel: (key: string) => apiFetch(`/v1/kv/${key}`, { method: 'DELETE' }),
  enqueueJob: (name: string, data?: Record<string, unknown>) =>
    apiFetch<{ jobId: string }>('/v1/jobs', { method: 'POST', body: JSON.stringify({ name, data }) }),
  getJob: (id: string) => apiFetch<{ id: string; name: string; state: string }>(`/v1/jobs/${id}`),
  getFarcasterUser: (fid: number) => apiFetch(`/v1/farcaster/fid/${fid}`),
  createWallet: (userId: string, appId: string) =>
    apiFetch('/v1/wallet/create', { method: 'POST', body: JSON.stringify({ userId, appId }) }),
  createProof: (data: unknown) =>
    apiFetch('/v1/proofs/create', { method: 'POST', body: JSON.stringify({ data }) }),
  enqueueInference: (prompt: string, model?: string) =>
    apiFetch<{ jobId: string }>('/v1/inference/jobs', {
      method: 'POST',
      body: JSON.stringify({ prompt, model }),
    }),
};
