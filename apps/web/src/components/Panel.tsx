import type { ReactNode } from 'react';

export default function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-terminal-border bg-terminal-panel p-5 shadow-panel">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-terminal-dim">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-terminal-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
