/**
 * Farcaster Mini App helpers.
 *
 * TODO: See current Farcaster Mini Apps docs at https://miniapps.farcaster.xyz/docs/specification
 * Manifest fields and SDK APIs may change — always refer to official docs.
 *
 * Mini Apps publish metadata at /.well-known/farcaster.json
 * The fully qualified domain identifies the Mini App.
 */

import { z } from 'zod';

// ---- Types ----

export interface MiniAppContext {
  isInMiniApp: boolean;
  fid?: number;
  username?: string;
  displayName?: string;
}

/**
 * TODO: Keep manifest shape in sync with https://miniapps.farcaster.xyz/docs/specification
 * These fields are placeholders — final fields depend on the current Farcaster spec.
 */
export const MiniAppManifestSchema = z.object({
  accountAssociation: z.object({
    header: z.string(),
    payload: z.string(),
    signature: z.string(),
  }).optional(),
  frame: z.object({
    version: z.string(),
    name: z.string(),
    iconUrl: z.string().url(),
    homeUrl: z.string().url(),
    imageUrl: z.string().url().optional(),
    buttonTitle: z.string().optional(),
    splashImageUrl: z.string().url().optional(),
    splashBackgroundColor: z.string().optional(),
    webhookUrl: z.string().url().optional(),
  }),
});

export type MiniAppManifest = z.infer<typeof MiniAppManifestSchema>;

// ---- Helpers ----

/**
 * Get Mini App context from the current environment.
 * Checks for Farcaster SDK context safely.
 */
export async function getMiniAppContext(): Promise<MiniAppContext> {
  // TODO: Replace with real Farcaster Mini App SDK context
  // import sdk from '@farcaster/miniapp-sdk';
  // const context = await sdk.context;
  // return { isInMiniApp: true, fid: context.user.fid, ... };
  return { isInMiniApp: false };
}

/**
 * Detect if running inside a Farcaster Mini App client.
 * Safe to call in any environment — returns false outside Farcaster client.
 */
export function isInMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  // TODO: Use real Farcaster SDK detection when available
  return false;
}

/**
 * Signal to Farcaster client that the app is ready to be displayed.
 * Must be called after initial render completes.
 *
 * TODO: Replace with real sdk.actions.ready() call from @farcaster/miniapp-sdk
 */
export async function ready(): Promise<void> {
  if (!isInMiniApp()) return;
  // TODO: import sdk from '@farcaster/miniapp-sdk'; await sdk.actions.ready();
  console.log('[miniapp] ready() called — stub, integrate real SDK');
}

/**
 * Placeholder: Verify a Mini App request payload from a Farcaster client.
 * TODO: Implement with real Farcaster frame/action verification spec.
 */
export async function verifyMiniAppRequest(
  _payload: unknown
): Promise<{ valid: boolean; fid?: number }> {
  // TODO: Implement real payload verification
  throw new Error('verifyMiniAppRequest: not implemented — see Farcaster Mini Apps spec');
}

/**
 * Build Open Graph meta tags for a page.
 */
export function buildOgTags(opts: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}): Record<string, string> {
  return {
    'og:title': opts.title,
    'og:description': opts.description,
    'og:image': opts.imageUrl,
    'og:url': opts.url,
    'og:type': 'website',
    'twitter:card': 'summary_large_image',
    'twitter:title': opts.title,
    'twitter:description': opts.description,
    'twitter:image': opts.imageUrl,
  };
}

/**
 * Build Farcaster Mini App embed meta tags.
 * TODO: Verify exact tag names with current Farcaster Mini Apps spec.
 * See https://miniapps.farcaster.xyz/docs/specification
 */
export function buildMiniAppEmbedTags(opts: {
  name: string;
  iconUrl: string;
  homeUrl: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
}): Record<string, string> {
  const tags: Record<string, string> = {
    'fc:frame': 'vNext',
    'fc:frame:name': opts.name,
    'fc:frame:icon_url': opts.iconUrl,
    'fc:frame:home_url': opts.homeUrl,
  };
  if (opts.splashImageUrl) tags['fc:frame:splash_image_url'] = opts.splashImageUrl;
  if (opts.splashBackgroundColor) tags['fc:frame:splash_background_color'] = opts.splashBackgroundColor;
  return tags;
}

/**
 * Parse and validate a Farcaster manifest JSON object.
 */
export function parseFarcasterManifest(raw: unknown): MiniAppManifest {
  return MiniAppManifestSchema.parse(raw);
}

/**
 * Validate manifest shape without throwing (returns success/error).
 */
export function validateManifestShape(
  raw: unknown
): { success: true; manifest: MiniAppManifest } | { success: false; error: string } {
  const result = MiniAppManifestSchema.safeParse(raw);
  if (result.success) {
    return { success: true, manifest: result.data };
  }
  return { success: false, error: result.error.message };
}
