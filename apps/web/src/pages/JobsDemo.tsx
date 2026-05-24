import { useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';
import { JOB_NAMES } from '@castrater/queue';

const JOB_NAME_LIST = Object.values(JOB_NAMES) as string[];

export default function JobsDemo() {
  const [selectedJob, setSelectedJob] = useState<string>(JOB_NAMES.EXAMPLE_ECHO);
  const [jobData, setJobData] = useState('{"message": "hello"}');
  const [result, setResult] = useState<string | null>(null);
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleEnqueue = async () => {
    try {
      const data = JSON.parse(jobData) as Record<string, unknown>;
      const r = await api.enqueueJob(selectedJob, data);
      setResult(JSON.stringify(r, null, 2));
      if (r.ok && r.data) setJobId(r.data.jobId ?? '');
    } catch {
      setResult(JSON.stringify({ ok: false, error: 'Invalid JSON in job data' }, null, 2));
    }
  };

  const handleCheckStatus = async () => {
    if (!jobId) return;
    const r = await api.getJob(jobId);
    setStatus(JSON.stringify(r, null, 2));
  };

  return (
    <div className="space-y-4">
      <h1>Jobs Demo</h1>
      <p className="text-terminal-dim text-sm">BullMQ background jobs and cron tasks.</p>

      <TerminalCard title="Enqueue Job">
        <div className="space-y-2 text-sm">
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Job Name</label>
            <select
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs rounded w-full"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
            >
              {JOB_NAME_LIST.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Job Data (JSON)</label>
            <textarea
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded font-mono"
              rows={3}
              value={jobData}
              onChange={(e) => setJobData(e.target.value)}
            />
          </div>
          <button
            onClick={handleEnqueue}
            className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
          >
            enqueue
          </button>
        </div>
      </TerminalCard>

      {result !== null && (
        <TerminalCard title="Enqueue Result">
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
