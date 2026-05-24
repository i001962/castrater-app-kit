import { useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:4001';

export default function ProofsDemo() {
  const [artifactData, setArtifactData] = useState('{"message": "proof of work", "timestamp": "2024-01-01"}');
  const [proofResult, setProofResult] = useState<string | null>(null);
  const [proofId, setProofId] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      const data = JSON.parse(artifactData) as unknown;
      const r = await api.createProof(data);
      setProofResult(JSON.stringify(r, null, 2));
      if (r.ok && r.data && typeof r.data === 'object' && 'proofId' in r.data) {
        setProofId(String((r.data as { proofId: string }).proofId));
      }
    } catch {
      setProofResult(JSON.stringify({ ok: false, error: 'Invalid JSON' }, null, 2));
    }
  };

  const handleVerify = async () => {
    if (!proofId) return;
    const r = await fetch(`${API_URL}/v1/proofs/${proofId}/verify`, { method: 'POST' });
    const json = await r.json() as unknown;
    setVerifyResult(JSON.stringify(json, null, 2));
  };

  return (
    <div className="space-y-4">
      <h1>Proofs Demo</h1>
      <p className="text-terminal-dim text-sm">
        Local proof artifacts. Production: swap adapter to Q Storage / Quilibrium.
      </p>

      <TerminalCard title="Create Proof">
        <div className="space-y-2">
          <label className="text-terminal-dim block text-xs mb-1">Artifact Data (JSON)</label>
          <textarea
            className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded font-mono"
            rows={4}
            value={artifactData}
            onChange={(e) => setArtifactData(e.target.value)}
          />
          <button
            onClick={handleCreate}
            className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
          >
            create proof
          </button>
        </div>
      </TerminalCard>

      {proofResult !== null && (
        <TerminalCard title="Proof Created">
          <pre className="text-xs text-terminal-green overflow-auto">{proofResult}</pre>
        </TerminalCard>
      )}

      <TerminalCard title="Verify Proof">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-terminal-dim block text-xs mb-1">Proof ID</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs rounded w-full"
              value={proofId}
              onChange={(e) => setProofId(e.target.value)}
              placeholder="proof id…"
            />
          </div>
          <button
            onClick={handleVerify}
            className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
          >
            verify
          </button>
        </div>
        {verifyResult !== null && (
          <pre className="text-xs text-terminal-green overflow-auto mt-2">{verifyResult}</pre>
        )}
      </TerminalCard>
    </div>
  );
}
