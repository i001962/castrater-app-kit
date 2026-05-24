/**
 * Farcaster helpers and adapter.
 *
 * This package does NOT replace Farcaster identity infrastructure.
 * Use HyperSnap / Farcaster SDK as the source of truth.
 *
 * TODO: Replace stubs with real Farcaster SDK / Neynar adapter for production.
 */

import { HyperSnapClient } from '@castrater/hypersnap';

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
}

/**
 * Normalize a Farcaster ID to a number.
 */
export function normalizeFid(fid: string | number): number {
  const n = Number(fid);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid FID: ${fid}`);
  return n;
}

/**
 * Placeholder: Verify FID ownership via a signed message.
 * TODO: Implement with real Farcaster auth (SIWF / Farcaster Connect).
 */
export async function verifyFidOwnership(
  _fid: number,
  _signedMessage: string
): Promise<boolean> {
  // TODO: Implement real FID ownership verification
  throw new Error('verifyFidOwnership: not implemented — integrate real Farcaster auth');
}

/**
 * Placeholder: Verify a Sign-In With Farcaster message.
 * TODO: Implement with @farcaster/auth-client or farcaster-js.
 */
export async function verifySignInMessage(
  _message: string,
  _signature: string
): Promise<{ valid: boolean; fid?: number }> {
  // TODO: Implement real SIWF verification
  throw new Error('verifySignInMessage: not implemented — integrate real Farcaster auth');
}

/**
 * Placeholder: Verify a cast action payload from a Farcaster client.
 * TODO: Implement with Farcaster Frame/Action spec verification.
 */
export async function verifyCastActionPayload(
  _payload: unknown
): Promise<{ valid: boolean }> {
  // TODO: Implement real cast action verification
  throw new Error('verifyCastActionPayload: not implemented — see Farcaster docs');
}

/**
 * Get a Farcaster user by FID using HyperSnap as data source.
 */
export async function getUserByFid(
  fid: number,
  client?: HyperSnapClient
): Promise<FarcasterUser> {
  const hyperSnap = client ?? new HyperSnapClient();
  const user = await hyperSnap.getUserByFid(fid);
  return {
    fid: user.fid,
    username: user.username,
    displayName: user.displayName,
    pfpUrl: user.pfpUrl,
    bio: user.bio,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
  };
}
