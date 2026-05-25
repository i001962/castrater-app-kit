import { useEffect, useState } from 'react';
import Panel from '../components/Panel.tsx';
import {
  api,
  type SignMessageResult,
  type WalletEventRecord,
  type WalletRecord,
} from '../lib/api.ts';

export default function WalletPage() {
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [message, setMessage] = useState('hello from castrater-app-kit');
  const [signature, setSignature] = useState<SignMessageResult | null>(null);
  const [events, setEvents] = useState<WalletEventRecord[]>([]);
  const [status, setStatus] = useState('Load your session on the auth page, then create a wallet.');
  const [isLoading, setIsLoading] = useState(true);

  const selectedWallet = wallets.find((wallet) => wallet.walletId === selectedWalletId) ?? null;

  async function refreshWallets() {
    setIsLoading(true);
    const response = await api.listWallets();
    if (response.ok && response.data) {
      setWallets(response.data);
      if (!selectedWalletId && response.data[0]) {
        setSelectedWalletId(response.data[0].walletId);
      }
      setIsLoading(false);
      return;
    }
    setStatus(response.error ?? 'Failed to load wallets');
    setIsLoading(false);
  }

  useEffect(() => {
    refreshWallets().catch(() => setStatus('Failed to load wallets'));
  }, []);

  async function handleCreateWallet() {
    await api.ensureDefaultApp();
    const created = await api.createWallet();
    if (!created.ok) {
      setStatus(created.error ?? 'Failed to create wallet');
      return;
    }
    setStatus('Wallet created');
    await refreshWallets();
  }

  async function handleSign() {
    if (!selectedWalletId) {
      setStatus('Select a wallet first');
      return;
    }

    const response = await api.signMessage(selectedWalletId, message);
    if (response.ok && response.data) {
      setSignature(response.data);
      setStatus('Message signed through qKMS boundary');
      const eventResponse = await api.getWalletEvents(selectedWalletId);
      if (eventResponse.ok && eventResponse.data) {
        setEvents(eventResponse.data);
      }
      return;
    }

    setStatus(response.error ?? 'Signing failed');
  }

  async function handleLoadEvents(walletId: string) {
    setSelectedWalletId(walletId);
    const response = await api.getWalletEvents(walletId);
    if (response.ok && response.data) {
      setEvents(response.data);
      setStatus('Wallet events loaded');
      return;
    }
    setStatus(response.error ?? 'Failed to load events');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-6">
        <Panel
          title="Wallet Actions"
          subtitle="Create an app-scoped wallet, then sign a test message through the API."
        >
          <div className="mb-4 rounded-2xl border border-terminal-amber/50 bg-terminal-amber/10 px-4 py-3 text-sm text-terminal-amber">
            This scaffold is still using the mock qKMS signer unless you configure a real remote qKMS provider.
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="button-primary" onClick={handleCreateWallet}>
              create wallet
            </button>
            <button className="button-secondary" onClick={() => refreshWallets()}>
              refresh wallets
            </button>
          </div>
          <label className="mt-4 grid gap-2 text-sm">
            <span className="text-terminal-dim">Message</span>
            <textarea
              className="input min-h-28"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
          <button className="button-primary mt-4" onClick={handleSign}>
            sign selected wallet message
          </button>
          <p className="mt-4 rounded-2xl border border-terminal-border bg-black/20 px-4 py-3 text-sm text-terminal-muted">
            {status}
          </p>
        </Panel>

        <Panel title="Signature Result" subtitle="The browser never signs directly. The API applies policy checks, calls qKMS, and records an event.">
          {signature ? (
            <div className="grid gap-3 rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Wallet</span>
                <span className="break-all text-right">{signature.wallet.walletId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Event ID</span>
                <span className="break-all text-right">{signature.eventId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Payload hash</span>
                <span className="break-all text-right">{signature.payloadHash}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Signature</span>
                <span className="break-all text-right">{signature.signature}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm text-terminal-muted">
              No signature yet.
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6">
        <Panel title="Wallets" subtitle="Wallets are scoped per app account and persisted in Postgres.">
          <div className="grid gap-3">
            {isLoading ? (
              <div className="rounded-2xl border border-terminal-border bg-black/20 p-4 text-sm text-terminal-muted">
                Loading wallets…
              </div>
            ) : null}
            {wallets.map((wallet) => (
              <button
                key={wallet.walletId}
                className={[
                  'rounded-2xl border p-4 text-left transition-colors',
                  selectedWalletId === wallet.walletId
                    ? 'border-terminal-green bg-terminal-green/10'
                    : 'border-terminal-border bg-black/20 hover:border-terminal-green/60',
                ].join(' ')}
                onClick={() => handleLoadEvents(wallet.walletId)}
              >
                <p className="font-display text-lg">{wallet.appName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-terminal-dim">
                  {wallet.appSlug}
                </p>
                <p className="mt-3 break-all text-sm text-terminal-muted">{wallet.address}</p>
                <p className="mt-2 text-xs text-terminal-dim">
                  {new Date(wallet.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
            {!wallets.length ? (
              <p className="text-sm text-terminal-muted">No wallets yet.</p>
            ) : null}
          </div>
        </Panel>

        <Panel title="Selected Wallet" subtitle="Current wallet metadata and ownership context.">
          {selectedWallet ? (
            <div className="grid gap-3 rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">App</span>
                <span>{selectedWallet.appName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Chain</span>
                <span>{selectedWallet.chain}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Status</span>
                <span>{selectedWallet.status}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Wallet ID</span>
                <span className="break-all text-right">{selectedWallet.walletId}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm text-terminal-muted">
              Select a wallet to inspect it.
            </div>
          )}
        </Panel>

        <Panel title="Wallet Audit Events" subtitle="Every wallet action writes an event and a local proof placeholder artifact.">
          {events.length ? (
            <div className="grid gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm"
                >
                  <div className="flex justify-between gap-4">
                    <span className="text-terminal-dim">{event.eventType}</span>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 break-all text-xs text-terminal-muted">{event.id}</p>
                  {event.signature ? (
                    <p className="mt-3 break-all text-xs text-terminal-green">{event.signature}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm text-terminal-muted">
              No events loaded yet.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
