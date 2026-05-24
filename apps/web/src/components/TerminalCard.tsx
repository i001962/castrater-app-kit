import type { ReactNode } from 'react';

interface TerminalCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  badge?: { label: string; variant?: 'green' | 'amber' | 'red' };
}

export default function TerminalCard({ title, children, className = '', badge }: TerminalCardProps) {
  const badgeClass =
    badge?.variant === 'amber'
      ? 'terminal-badge-amber'
      : badge?.variant === 'red'
      ? 'terminal-badge-red'
      : 'terminal-badge-green';

  return (
    <div className={`terminal-card ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-terminal-border">
          <span className="text-terminal-dim text-xs">▶</span>
          <span className="text-sm font-semibold">{title}</span>
          {badge && <span className={badgeClass}>{badge.label}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
