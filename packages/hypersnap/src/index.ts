/// <reference types="node" />
/**
 * HyperSnap client adapter.
 * HyperSnap is a Farcaster data indexer run by the Castrater team.
 * Default URL: https://hypersnap.castrater.xyz
 *
 * This is an adapter only — it does not replace Farcaster identity infrastructure.
 */

export interface HyperSnapInfo {
  version: string;
  status: string;
}

export interface HyperSnapUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
}

export class HyperSnapClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env['HYPERSNAP_URL'] ?? 'https://hypersnap.castrater.xyz') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getInfo(): Promise<HyperSnapInfo> {
    const res = await fetch(`${this.baseUrl}/info`);
    if (!res.ok) throw new Error(`HyperSnap getInfo failed: ${res.status}`);
    return res.json() as Promise<HyperSnapInfo>;
  }

  async getUserByFid(fid: number): Promise<HyperSnapUser> {
    const res = await fetch(`${this.baseUrl}/v1/users/${fid}`);
    if (!res.ok) throw new Error(`HyperSnap getUserByFid failed: ${res.status}`);
    return res.json() as Promise<HyperSnapUser>;
  }
}

export function createHyperSnapClient(baseUrl?: string): HyperSnapClient {
  return new HyperSnapClient(baseUrl);
}
