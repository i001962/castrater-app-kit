import { useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

export default function WalletDemo() {
  const [appSlug, setAppSlug] = useState('default-demo-app');
  const [message, setMessage] = useState('hello from castrater-app-kit');
  const [walletId, setWalletId] = useState('');
  const [output, setOutput] = useState<string>('No action yet');

  const handleCreateDefaultApp = async () => {
    const result = await api.createDefaultApp();
    setOutput(JSON.stringify(result, null, 2));
  };

  const handleCreateWallet = async () => {
    const result = await api.createWallet({ appSlug: appSlug || undefined });
    setOutput(JSON.stringify(result, null, 2));
  };

  const handleListWallets = async () => {
    const result = await api.listWallets();
    setOutput(JSON.stringify(result, null, 2));
  };

  const handleGetWallet = async () => {
    const result = await api.getWallet(walletId);
    setOutput(JSON.stringify(result, null, 2));
  };

  const handleSign = async () => {
    const result = await api.signMessage(walletId, message);
    setOutput(JSON.stringify(result, null, 2));
  };

  const handleEvents = async () => {
    const result = await api.listWalletEvents(walletId);
    setOutput(JSON.stringify(result, null, 2));
  };

  return (
    <div className="space-y-4">
      <h1>Wallet</h1>
      <p className="text-terminal-dim text-sm">
        Authenticated app wallet create/list/sign flow with audit events and policy placeholder.
      </p>

      <TerminalCard title="Create wallet">
        <div className="space-y-2 text-sm">
          <div>
            <label className="text-terminal-dim block text-xs mb-1">App slug (optional)</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded"
              value={appSlug}
              onChange={(event) => setAppSlug(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCreateDefaultApp}
              className="px-3 py-1 border border-terminal-border text-terminal-dim text-xs rounded hover:border-terminal-green hover:text-terminal-green transition-colors"
            >
              create/get default app
            </button>
            <button
              onClick={handleCreateWallet}
              className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
            >
              create wallet
            </button>
            <button
              onClick={handleListWallets}
              className="px-3 py-1 border border-terminal-border text-terminal-dim text-xs rounded hover:border-terminal-green hover:text-terminal-green transition-colors"
            >
              list wallets
            </button>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Wallet actions">
        <div className="space-y-2 text-sm">
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Wallet ID</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded"
              value={walletId}
              onChange={(event) => setWalletId(event.target.value)}
            />
          </div>
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Message</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGetWallet}
              className="px-3 py-1 border border-terminal-border text-terminal-dim text-xs rounded hover:border-terminal-green hover:text-terminal-green transition-colors"
            >
              get wallet
            </button>
            <button
              onClick={handleSign}
              className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
            >
              sign message
            </button>
            <button
              onClick={handleEvents}
              className="px-3 py-1 border border-terminal-border text-terminal-dim text-xs rounded hover:border-terminal-green hover:text-terminal-green transition-colors"
            >
              wallet events
            </button>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Result">
        <pre className="text-xs text-terminal-green overflow-auto">{output}</pre>
      </TerminalCard>
    </div>
  );
}

