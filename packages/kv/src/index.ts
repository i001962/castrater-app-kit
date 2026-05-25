export interface KvClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<unknown>;
}

export async function kvGet(redis: KvClient, key: string): Promise<string | null> {
  return redis.get(key);
}

export async function kvSet(
  redis: KvClient,
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  if (ttlSeconds) {
    await redis.set(key, value, 'EX', ttlSeconds);
  } else {
    await redis.set(key, value);
  }
}

export async function kvDel(redis: KvClient, key: string): Promise<void> {
  await redis.del(key);
}

export async function kvIncr(redis: KvClient, key: string): Promise<number> {
  return redis.incr(key);
}

export async function kvExpire(redis: KvClient, key: string, ttlSeconds: number): Promise<void> {
  await redis.expire(key, ttlSeconds);
}
