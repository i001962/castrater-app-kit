import { useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

export default function WalletDemo() {
  const [userId, setUserId] = useState('user-demo');
  const [appId, setAppId] = useState('app-demo');
  const [result, setResult] = useState<string | null>(null);

  const handleCreate = async () => {
    const r = await api.createWallet(userId, appId);
    setResult(JSON.stringify(r, null, 2));
  };

  return (
    <div className="space-y-4">
      <h1>Wallet Demo</h1>
      <p className="text-terminal-dim text-sm">
        App-scoped embedded wallets. No raw keys — qKMS handles signing.
      </p>
      <TerminalCard title="Create App Wallet">
        <div className="space-y-2 text-sm">
          <div>
            <label className="text-terminal-dim block text-xs mb-1">User ID</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div>
            <label className="text-terminal-dim block text-xs mb-1">App ID</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            />
          </div>
          <button
            onClick={handleCreate}
            className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
          >
            create wallet
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
