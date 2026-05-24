import { useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

export default function FarcasterDemo() {
  const [fid, setFid] = useState('1');
  const [result, setResult] = useState<string | null>(null);

  const handleLookup = async () => {
    const r = await api.getFarcasterUser(Number(fid));
    setResult(JSON.stringify(r, null, 2));
  };

  return (
    <div className="space-y-4">
      <h1>Farcaster Demo</h1>
      <p className="text-terminal-dim text-sm">
        User lookup via HyperSnap. Farcaster identity is not replaced — only surfaced.
      </p>
      <TerminalCard title="Lookup FID">
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-terminal-dim block text-xs mb-1">FID</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs rounded w-24"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              type="number"
              min="1"
            />
          </div>
          <button
            onClick={handleLookup}
            className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
          >
            lookup
          </button>
        </div>
      </TerminalCard>
      {result !== null && (
        <TerminalCard title="Result">
          <pre className="text-xs text-terminal-green overflow-auto">{result}</pre>
        </TerminalCard>
      )}
    </div>
  );
}
