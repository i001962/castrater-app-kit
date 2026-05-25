import crypto from 'node:crypto';

export function hashPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export interface ProofArtifactInput {
  artifactHash: string;
  storageUri: string;
  metadata?: Record<string, unknown>;
}

export interface ProofArtifactRecord extends ProofArtifactInput {
  createdAt: string;
}

export function buildLocalProofArtifact(
  input: ProofArtifactInput
): ProofArtifactRecord {
  return {
    artifactHash: input.artifactHash,
    storageUri: input.storageUri,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
}
