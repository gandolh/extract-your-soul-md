import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Button, Card, FieldLabel, FIELD_CLASS, Notice } from '../components/ui';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) return setError('Username must be at least 3 characters.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      await register(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register.');
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
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em] text-text-faint">
            New participant
          </p>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="font-mono text-[10px] text-text-faint">
                At least 6 characters · stored hashed (scrypt)
              </span>
            </div>
            {error && <Notice tone="err">{error}</Notice>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-[13px] text-text-secondary">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary-strong">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
