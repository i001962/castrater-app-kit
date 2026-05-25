import { useEffect, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import Panel from '../components/Panel.tsx';
import { api, type SessionUser } from '../lib/api.ts';

export default function AuthPage() {
  const [displayName, setDisplayName] = useState('Demo User');
  const [email, setEmail] = useState('demo@example.com');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [message, setMessage] = useState<string>('Checking current session…');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((response) => {
        if (response.ok && response.data) {
          setUser(response.data);
          setMessage('Authenticated');
        } else {
          setUser(null);
          setMessage('No active session');
        }
      })
      .catch(() => {
        setUser(null);
        setMessage('Auth service unreachable');
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRegister() {
    setMessage('Preparing registration challenge…');
    const options = await api.registerOptions({ displayName, email });
    if (!options.ok || !options.data) {
      setMessage(options.error ?? 'Failed to create registration options');
      return;
    }

    const response = await startRegistration({
      optionsJSON: options.data as Parameters<typeof startRegistration>[0]['optionsJSON'],
    });
    const verified = await api.verifyRegistration({
      response,
      displayName,
      email,
    });

    if (verified.ok && verified.data) {
      setUser(verified.data);
      setMessage('Passkey registered and session created');
      return;
    }

    setMessage(verified.error ?? 'Registration failed');
  }

  async function handleLogin() {
    setMessage('Preparing login challenge…');
    const options = await api.loginOptions({ email });
    if (!options.ok || !options.data) {
      setMessage(options.error ?? 'Failed to create login options');
      return;
    }

    const response = await startAuthentication({
      optionsJSON: options.data as Parameters<typeof startAuthentication>[0]['optionsJSON'],
    });
    const verified = await api.verifyLogin({ response });

    if (verified.ok && verified.data) {
      setUser(verified.data);
      setMessage('Logged in with passkey');
      return;
    }

    setMessage(verified.error ?? 'Login failed');
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setMessage('Logged out');
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
      <Panel
        title="Passkey Auth"
        subtitle="Register a passkey on localhost, then log back in using the WebAuthn flow."
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-terminal-dim">Display name</span>
            <input
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-terminal-dim">Email</span>
            <input
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="button-primary" onClick={handleRegister}>
              register passkey
            </button>
            <button className="button-secondary" onClick={handleLogin}>
              login with passkey
            </button>
            <button className="button-secondary" onClick={handleLogout}>
              logout
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Current Session"
        subtitle="The API issues an httpOnly session cookie after registration or login."
      >
        <p className="rounded-2xl border border-terminal-border bg-black/20 px-4 py-3 text-sm text-terminal-muted">
          {message}
        </p>
        {isLoading ? (
          <div className="mt-4 rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm text-terminal-muted">
            Loading session…
          </div>
        ) : user ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-terminal-dim">Display name</span>
              <span>{user.displayName ?? 'Unset'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-terminal-dim">Email</span>
              <span>{user.email ?? 'Unset'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-terminal-dim">User ID</span>
              <span className="break-all text-right">{user.id}</span>
            </div>
            {user.createdAt ? (
              <div className="flex justify-between gap-4">
                <span className="text-terminal-dim">Created</span>
                <span>{new Date(user.createdAt).toLocaleString()}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-terminal-border bg-black/30 p-4 text-sm text-terminal-muted">
            No authenticated user yet.
          </div>
        )}
      </Panel>
    </div>
  );
}
