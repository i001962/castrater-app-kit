type ChallengeRecord = {
  payload: string;
  expiresAt: number;
};

export interface ChallengeStore {
  set(key: string, payload: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

export class MemoryChallengeStore implements ChallengeStore {
  private readonly store = new Map<string, ChallengeRecord>();

  async set(key: string, payload: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      payload,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async get(key: string): Promise<string | null> {
    const record = this.store.get(key);
    if (!record) {
      return null;
    }
    if (record.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return record.payload;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
