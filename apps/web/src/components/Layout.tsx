import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

const NAV_LINKS = [
  { to: '/', label: '~/' },
  { to: '/auth', label: 'auth' },
  { to: '/wallet', label: 'wallet' },
  { to: '/status', label: 'status' },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-green font-mono">
      {/* Top bar */}
      <header className="border-b border-terminal-border px-4 py-2 flex items-center gap-6">
        <span className="text-terminal-green font-bold text-sm">castrater-app-kit</span>
        <span className="text-terminal-dim text-xs">v0.1.0</span>
        <nav className="flex gap-4 ml-4 flex-wrap">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `text-xs no-underline px-1 py-0.5 border rounded transition-colors ${
                  isActive
                    ? 'border-terminal-green text-terminal-green bg-terminal-card'
                    : 'border-transparent text-terminal-dim hover:text-terminal-green hover:border-terminal-border'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      {/* Main content */}
      <main className="px-4 py-6 max-w-4xl mx-auto">
        {children}
      </main>
      {/* Footer */}
      <footer className="border-t border-terminal-border px-4 py-2 text-xs text-terminal-dim text-center">
        castrater-app-kit — MVP auth + app wallet scaffold (not production-ready)
      </footer>
    </div>
  );
}
