/**
 * Proofs adapter.
 *
 * This is an adapter ONLY — it does not replace Quilibrium's proof/storage network.
 *
 * Local dev implementation:
 * - Stores artifact JSON under /app/storage/proofs
 * - Hashes canonical JSON with sha256
 * - Creates proof record with proofId, artifactHash, storageUri, timestamp, backend
 *
 * Production intent:
 * - Swap local store with Q Storage / Quilibrium adapter
 * - Store artifact/proof/receipt according to real Q APIs
 *
 * Verification:
 * - Requires: artifact/data + proof/receipt + verifier logic
 * - Public proof does NOT always mean public data
 * - Encrypted/private artifacts can still have public attestations
 * - Local proof mode is only a development stand-in
 */

import * as crypto from 'node:crypto';
import { writeJson, readJson } from '@castrater/storage';

export interface ProofArtifact {
  proofId: string;
  artifactHash: string;
  storageUri: string;
  timestamp: string;
  signer: string;
  backend: string;
  data?: unknown;
}

export interface VerifyResult {
  valid: boolean;
  proofId: string;
  computedHash?: string;
  storedHash?: string;
  backend: string;
}

/**
 * Create a proof record for an artifact.
 * Local dev: stores under baseDir/proofs/
 */
export async function createProof(
  artifact: unknown,
  baseDir: string,
  opts?: { signer?: string }
): Promise<ProofArtifact> {
  const canonical = JSON.stringify(artifact);
  const artifactHash = crypto.createHash('sha256').update(canonical).digest('hex');
  const proofId = `proof-${Date.now()}-${artifactHash.slice(0, 8)}`;
  const storageUri = `local://proofs/${proofId}.json`;

  const proof: ProofArtifact = {
    proofId,
    artifactHash,
    storageUri,
    timestamp: new Date().toISOString(),
    signer: opts?.signer ?? 'local-dev-placeholder',
    backend: 'local-dev',
    data: artifact,
  };

  await writeJson(baseDir, `proofs/${proofId}.json`, proof);
  return proof;
}

/**
 * Retrieve a proof record by proofId.
 */
export async function getProof(
  proofId: string,
  baseDir: string
): Promise<ProofArtifact> {
  return readJson<ProofArtifact>(baseDir, `proofs/${proofId}.json`);
}

/**
 * Verify a proof by recomputing the artifact hash and comparing to stored hash.
 */
export async function verifyProof(
  proofId: string,
  baseDir: string
): Promise<VerifyResult> {
  const proof = await getProof(proofId, baseDir);
  const canonical = JSON.stringify(proof.data);
  const computedHash = crypto.createHash('sha256').update(canonical).digest('hex');
  const valid = computedHash === proof.artifactHash;
  return {
    valid,
    proofId,
    computedHash,
    storedHash: proof.artifactHash,
    backend: proof.backend,
  };
}
