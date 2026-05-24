import { useEffect, useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

export default function Status() {
  const [health, setHealth] = useState<string>('loading…');
  const [info, setInfo] = useState<string>('loading…');

  useEffect(() => {
    api.health()
      .then((r) => setHealth(JSON.stringify(r.data ?? r, null, 2)))
      .catch(() => setHealth(JSON.stringify({ error: 'unreachable' }, null, 2)));
    api.info()
      .then((r) => setInfo(JSON.stringify(r.data ?? r, null, 2)))
      .catch(() => setInfo(JSON.stringify({ error: 'unreachable' }, null, 2)));
  }, []);

  return (
    <div className="space-y-4">
      <h1>System Status</h1>
      <TerminalCard title="Health">
        <pre className="text-xs text-terminal-green overflow-auto">{health}</pre>
      </TerminalCard>
      <TerminalCard title="Info">
        <pre className="text-xs text-terminal-green overflow-auto">{info}</pre>
      </TerminalCard>
    </div>
  );
}
