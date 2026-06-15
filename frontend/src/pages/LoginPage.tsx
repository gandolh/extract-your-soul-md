import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Button, Card, FieldLabel, FIELD_CLASS, Notice } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-gutter py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="font-sans text-[28px] font-bold tracking-[-0.02em] text-text-primary">
            soul<span className="text-primary">.</span>study
          </div>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em] text-text-faint">Sign in</p>
        </div>

        <Card className="p-7">
          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <input
                id="username"
                className={FIELD_CLASS}
                type="text"
                autoComplete="username"
                placeholder="user@domain.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <input
                id="password"
                className={FIELD_CLASS}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="font-mono text-[10px] text-text-faint">6+ chars · stored hashed</span>
            </div>
            {error && <Notice tone="err">{error}</Notice>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-[13px] text-text-secondary">
          No account yet?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-strong">
            Request an account
          </Link>
        </p>
      </div>
    </div>
  );
}
