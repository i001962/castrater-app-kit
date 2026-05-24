import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

const FEATURE_CARDS = [
  { label: 'Redis KV', path: '/status', desc: 'Local key-value store, cache, sessions' },
  { label: 'BullMQ Jobs', path: '/jobs', desc: 'Background jobs & cron tasks' },
  { label: 'Farcaster', path: '/farcaster', desc: 'HyperSnap-backed user data' },
  { label: 'Mini App', path: '/miniapp', desc: 'Farcaster Mini App SDK integration' },
  { label: 'Wallet', path: '/wallet', desc: 'App-scoped wallets via qKMS' },
  { label: 'Proofs', path: '/proofs', desc: 'Q Storage-backed proof artifacts' },
  { label: 'Inference', path: '/inference', desc: 'Async ML inference via workers' },
];

export default function Home() {
  const [health, setHealth] = useState<{ status: string; redis: string } | null>(null);

  useEffect(() => {
    api.health().then((r) => { if (r.ok && r.data) setHealth(r.data); }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-terminal-green mb-1">castrater-app-kit</h1>
        <p className="text-terminal-dim text-sm">
          Self-hosted sovereign app kit — built for the Quilibrium ecosystem
        </p>
      </div>

      <TerminalCard title="API Health" badge={{ label: health?.status ?? 'checking…', variant: health?.status === 'ok' ? 'green' : 'amber' }}>
        <div className="text-sm space-y-1">
          <div className="flex gap-2">
            <span className="text-terminal-dim w-16">status</span>
            <span>{health?.status ?? '…'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-terminal-dim w-16">redis</span>
            <span>{health?.redis ?? '…'}</span>
          </div>
          <div className="mt-2">
            <Link to="/status" className="text-xs no-underline terminal-badge-green">
              view status →
            </Link>
          </div>
        </div>
      </TerminalCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURE_CARDS.map(({ label, path, desc }) => (
          <Link key={path} to={path} className="no-underline">
            <TerminalCard className="hover:border-terminal-green transition-colors cursor-pointer h-full">
              <p className="text-sm font-semibold text-terminal-green">{label}</p>
              <p className="text-xs text-terminal-dim mt-1">{desc}</p>
            </TerminalCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
