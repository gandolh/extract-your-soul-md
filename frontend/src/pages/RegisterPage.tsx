import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

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
    <div className="auth-wrap">
      <div className="auth-card stack stack-4">
        <div>
          <div className="auth-mark">
            soul<span className="dot">.</span>study
          </div>
          <p className="muted mono" style={{ fontSize: '0.74rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '6px 0 0' }}>
            Create a participant account
          </p>
        </div>
        <div className="panel">
          <form className="stack stack-4" onSubmit={onSubmit}>
            <label className="field">
              <span className="field-q-index">Username</span>
              <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </label>
            <label className="field">
              <span className="field-q-index">Password</span>
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="field-hint">At least 6 characters. Stored hashed (scrypt).</span>
            </label>
            {error && <div className="notice notice-err">{error}</div>}
            <button className="btn btn-accent" type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
