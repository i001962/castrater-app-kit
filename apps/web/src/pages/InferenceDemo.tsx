import { useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

export default function InferenceDemo() {
  const [prompt, setPrompt] = useState('What is the Quilibrium network?');
  const [model, setModel] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    const r = await api.enqueueInference(prompt, model || undefined);
    setResult(JSON.stringify(r, null, 2));
    if (r.ok && r.data) setJobId(r.data.jobId ?? '');
  };

  const handleCheckStatus = async () => {
    if (!jobId) return;
    const r = await api.getJob(jobId);
    setStatus(JSON.stringify(r, null, 2));
  };

  return (
    <div className="space-y-4">
      <h1>Inference Demo</h1>
      <p className="text-terminal-dim text-sm">
        Async inference — always queued, never inline. Supports mock/local (Ollama)/remote modes.
      </p>

      <TerminalCard title="Submit Inference Job">
        <div className="space-y-2">
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Prompt</label>
            <textarea
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded font-mono"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Model (optional)</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs rounded w-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="llama3.2"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
          >
            submit job
          </button>
        </div>
      </TerminalCard>

      {result !== null && (
        <TerminalCard title="Job Queued">
          <pre className="text-xs text-terminal-green overflow-auto">{result}</pre>
        </TerminalCard>
      )}

      <TerminalCard title="Check Job Status">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-terminal-dim block text-xs mb-1">Job ID</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs rounded w-full"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="job id…"
            />
          </div>
          <button
            onClick={handleCheckStatus}
            className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
          >
            check
          </button>
        </div>
        {status !== null && (
          <pre className="text-xs text-terminal-green overflow-auto mt-2">{status}</pre>
        )}
      </TerminalCard>
    </div>
  );
}
