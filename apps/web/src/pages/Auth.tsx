import { useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import TerminalCard from '../components/TerminalCard.tsx';
import { api } from '../lib/api.ts';

export default function Auth() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [output, setOutput] = useState<string>('No action yet');

  const handleRegister = async () => {
    const options = await api.authRegisterOptions({
      displayName: displayName || undefined,
      email: email || undefined,
    });
    if (!options.ok || !options.data) {
      setOutput(JSON.stringify(options, null, 2));
      return;
    }
    const response = await startRegistration({ optionsJSON: options.data as never });
    const verified = await api.authRegisterVerify({
      response,
      displayName: displayName || undefined,
      email: email || undefined,
    });
    setOutput(JSON.stringify(verified, null, 2));
  };

  const handleLogin = async () => {
    const options = await api.authLoginOptions({
      email: email || undefined,
    });
    if (!options.ok || !options.data) {
      setOutput(JSON.stringify(options, null, 2));
      return;
    }
    const response = await startAuthentication({ optionsJSON: options.data as never });
    const verified = await api.authLoginVerify({ response });
    setOutput(JSON.stringify(verified, null, 2));
  };

  const handleLogout = async () => {
    const result = await api.authLogout();
    setOutput(JSON.stringify(result, null, 2));
  };

  const handleMe = async () => {
    const result = await api.authMe();
    setOutput(JSON.stringify(result, null, 2));
  };

  return (
    <div className="space-y-4">
      <h1>Auth</h1>
      <p className="text-terminal-dim text-sm">
        Passkey/WebAuthn registration and login with server-side session cookies.
      </p>
      <TerminalCard title="Passkey">
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Display name (optional)</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div>
            <label className="text-terminal-dim block text-xs mb-1">Email (optional)</label>
            <input
              className="bg-terminal-bg border border-terminal-border text-terminal-green px-2 py-1 text-xs w-full rounded"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRegister}
              className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
            >
              register passkey
            </button>
            <button
              onClick={handleLogin}
              className="px-3 py-1 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green hover:text-black transition-colors"
            >
              login passkey
            </button>
            <button
              onClick={handleMe}
              className="px-3 py-1 border border-terminal-border text-terminal-dim text-xs rounded hover:border-terminal-green hover:text-terminal-green transition-colors"
            >
              me
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 border border-terminal-border text-terminal-dim text-xs rounded hover:border-terminal-green hover:text-terminal-green transition-colors"
            >
              logout
            </button>
          </div>
        </div>
      </TerminalCard>
      <TerminalCard title="Result">
        <pre className="text-xs text-terminal-green overflow-auto">{output}</pre>
      </TerminalCard>
    </div>
  );
}

