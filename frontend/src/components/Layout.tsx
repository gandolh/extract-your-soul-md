import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './Toaster';
import { cx } from './ui';

const NAV_LINK =
  'font-mono text-[12px] font-medium uppercase tracking-[0.05em] text-text-secondary ' +
  'border-b-[1.5px] border-transparent pb-0.5 transition-colors hover:text-text-primary';

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
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-hairline bg-surface-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-column items-center gap-6 px-gutter py-3">
          <NavLink to="/" className="font-sans text-[18px] font-bold tracking-[-0.01em] text-text-primary no-underline">
            soul<span className="text-primary">.</span>study
          </NavLink>
          <nav className="ml-auto flex items-center gap-5">
            <NavLink to="/" end className={({ isActive }) => cx(NAV_LINK, isActive && '!border-primary !text-primary')}>
              Overview
            </NavLink>
            <NavLink to="/studies" className={({ isActive }) => cx(NAV_LINK, isActive && '!border-primary !text-primary')}>
              Studies
            </NavLink>
            <NavLink to="/import" className={({ isActive }) => cx(NAV_LINK, isActive && '!border-primary !text-primary')}>
              Conversations
            </NavLink>
            <NavLink to="/results" className={({ isActive }) => cx(NAV_LINK, isActive && '!border-primary !text-primary')}>
              Profile
            </NavLink>
            {user && (
              <span className="font-mono text-[12px] text-text-faint">— {user.username}</span>
            )}
            <button
              type="button"
              onClick={() => void onLogout()}
              className={cx(NAV_LINK, 'cursor-pointer border-0 bg-transparent p-0')}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-column flex-1 px-gutter py-12">
        <Outlet />
      </main>

      <footer className="border-t border-hairline px-gutter py-6 text-center font-mono text-[10px] tracking-[0.04em] text-text-faint">
        Self-report data stays on this machine · profiles are generated locally · review before reuse
        <span className="mx-2">·</span>Clinical Instrument v1.0.4
      </footer>
    </div>
  );
}

export function Meter({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] text-text-faint">
      <span className="tabular-nums">{pct}%</span>
      <div className="h-1 flex-1 overflow-hidden rounded-sm bg-primary-wash">
        <div className="h-full rounded-sm bg-primary-strong transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
