import { Link } from 'react-router-dom';
import TerminalCard from '../components/TerminalCard.tsx';

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-terminal-green mb-1">castrater-app-kit</h1>
        <p className="text-terminal-dim text-sm">
          Developer scaffold for passkey auth, app-scoped wallets, qKMS adapter signing, and audit
          trails.
        </p>
      </div>

      <TerminalCard title="MVP focus">
        <ul className="text-sm text-terminal-dim space-y-1">
          <li>- Passkey registration/login (WebAuthn)</li>
          <li>- Durable Postgres user/session/wallet records</li>
          <li>- qKMS adapter boundary (mock in local dev)</li>
          <li>- Wallet policy checks + wallet event audit logs</li>
          <li>- Local proof/audit placeholders</li>
        </ul>
      </TerminalCard>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/auth" className="no-underline">
          <TerminalCard className="hover:border-terminal-green transition-colors cursor-pointer h-full">
            <p className="text-sm font-semibold text-terminal-green">Auth flow</p>
            <p className="text-xs text-terminal-dim mt-1">Register, login, logout, me</p>
          </TerminalCard>
        </Link>
        <Link to="/wallet" className="no-underline">
          <TerminalCard className="hover:border-terminal-green transition-colors cursor-pointer h-full">
            <p className="text-sm font-semibold text-terminal-green">Wallet flow</p>
            <p className="text-xs text-terminal-dim mt-1">Create, list, sign, events</p>
          </TerminalCard>
        </Link>
        <Link to="/status" className="no-underline">
          <TerminalCard className="hover:border-terminal-green transition-colors cursor-pointer h-full">
            <p className="text-sm font-semibold text-terminal-green">Status</p>
            <p className="text-xs text-terminal-dim mt-1">Health, DB, qKMS mode, auth</p>
          </TerminalCard>
        </Link>
      </div>
    </div>
  );
}

