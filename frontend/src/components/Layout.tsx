import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './Toaster';

export function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();

  async function onLogout() {
    try {
      await logout();
    } catch {
      toast('Could not log out.', 'err');
    }
  }

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead-inner">
          <NavLink to="/" className="wordmark">
            soul<span className="dot">.</span>study
          </NavLink>
          <span className="masthead-sub">voice · regularities · self-report</span>
          <nav className="nav">
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/studies">Studies</NavLink>
            <NavLink to="/import">Conversations</NavLink>
            <NavLink to="/results">Profile</NavLink>
            {user && <span className="who">— {user.username}</span>}
            <a
              href="#logout"
              onClick={(e) => {
                e.preventDefault();
                void onLogout();
              }}
            >
              Sign out
            </a>
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="foot">
        Self-report data stays on this machine · profiles are generated locally · review before reuse
      </footer>
    </div>
  );
}

export function Meter({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="meter">
      <span>
        {completed}/{total}
      </span>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
