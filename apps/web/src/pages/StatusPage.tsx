import { useEffect, useState } from 'react';
import Panel from '../components/Panel.tsx';
import { api } from '../lib/api.ts';

export default function StatusPage() {
  const [health, setHealth] = useState<unknown>(null);
  const [status, setStatus] = useState<unknown>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false, error: 'unreachable' }));
    api.status().then(setStatus).catch(() => setStatus({ ok: false, error: 'unreachable' }));
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Health" subtitle="Basic process and dependency health.">
        <pre className="overflow-auto rounded-2xl border border-terminal-border bg-black/30 p-4 text-xs text-terminal-green">
          {JSON.stringify(health, null, 2)}
        </pre>
      </Panel>
      <Panel title="MVP Status" subtitle="Database, Redis challenge storage, qKMS mode, and WebAuthn config.">
        <pre className="overflow-auto rounded-2xl border border-terminal-border bg-black/30 p-4 text-xs text-terminal-green">
          {JSON.stringify(status, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}
