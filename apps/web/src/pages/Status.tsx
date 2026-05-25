import { useEffect, useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

export default function Status() {
  const [health, setHealth] = useState<string>('loading…');
  const [info, setInfo] = useState<string>('loading…');

  useEffect(() => {
    api.health()
      .then((result) => setHealth(JSON.stringify(result.data ?? result, null, 2)))
      .catch(() => setHealth(JSON.stringify({ error: 'unreachable' }, null, 2)));
    api.info()
      .then((result) => setInfo(JSON.stringify(result.data ?? result, null, 2)))
      .catch(() => setInfo(JSON.stringify({ error: 'unreachable' }, null, 2)));
  }, []);

  return (
    <div className="space-y-4">
      <h1>Status</h1>
      <TerminalCard title="Health">
        <pre className="text-xs text-terminal-green overflow-auto">{health}</pre>
      </TerminalCard>
      <TerminalCard title="Config / Features">
        <pre className="text-xs text-terminal-green overflow-auto">{info}</pre>
      </TerminalCard>
    </div>
  );
}

