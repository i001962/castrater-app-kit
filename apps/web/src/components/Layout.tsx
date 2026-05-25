import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'auth' },
  { to: '/wallets', label: 'wallets' },
  { to: '/status', label: 'status' },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-green">
      <header className="border-b border-terminal-border bg-terminal-panel/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-terminal-dim">
              castrater-app-kit
            </p>
            <h1 className="font-display text-2xl text-terminal-green">
              Auth + qKMS App Wallet Scaffold
            </h1>
          </div>
          <nav className="flex gap-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] no-underline transition-colors',
                    isActive
                      ? 'border-terminal-green bg-terminal-green text-black'
                      : 'border-terminal-border text-terminal-dim hover:border-terminal-green hover:text-terminal-green',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
