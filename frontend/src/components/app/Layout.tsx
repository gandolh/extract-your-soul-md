import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from './Toaster';
import { cx } from '../ui';

const NAV_LINK =
  'font-mono text-[12px] font-medium uppercase tracking-[0.05em] text-text-secondary ' +
  'border-b-[1.5px] border-transparent pb-0.5 transition-colors hover:text-text-primary';

// Nav label · route. Labels match each destination's page title so the same
// surface reads the same in the nav and on the page (Profile→soul.md stays
// "Profile" as the human-facing name).
const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/studies', label: 'Studies', end: false },
  { to: '/answers', label: 'Answers', end: false },
  { to: '/swipe', label: 'Cards', end: false },
  { to: '/stats', label: 'Analyze', end: false },
  { to: '/saved-stats', label: 'Saved', end: false },
  { to: '/results', label: 'Profile', end: false },
] as const;

export function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on route change so a tap-through never leaves it open.
  // location.pathname is the intended trigger, not an unnecessary dep.
  // biome-ignore lint/correctness/useExhaustiveDependencies: route-change trigger
  useEffect(() => setMenuOpen(false), [location.pathname]);

  async function onLogout() {
    setMenuOpen(false);
    try {
      await logout();
    } catch {
      toast('Could not log out.', 'err');
    }
  }

  const links = NAV_ITEMS.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => cx(NAV_LINK, isActive && '!border-primary !text-primary')}
    >
      {item.label}
    </NavLink>
  ));

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-sticky border-b border-hairline bg-surface-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-column items-center gap-6 px-gutter py-3">
          <NavLink to="/" className="font-sans text-[18px] font-bold tracking-[-0.01em] text-text-primary no-underline">
            soul<span className="text-primary">.</span>study
          </NavLink>

          {/* Desktop nav — single row, hidden below md where it would overflow. */}
          <nav className="ml-auto hidden items-center gap-5 md:flex">
            {links}
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

          {/* Mobile menu toggle — replaces the row below md. */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto grid h-11 w-11 place-items-center rounded-md border border-hairline text-text-secondary transition-colors hover:text-text-primary md:hidden"
          >
            <span aria-hidden className="relative block h-3 w-4">
              <span
                className={cx(
                  'absolute left-0 block h-0.5 w-4 bg-current transition-transform duration-200',
                  menuOpen ? 'top-1.5 rotate-45' : 'top-0',
                )}
              />
              <span
                className={cx(
                  'absolute left-0 top-1.5 block h-0.5 w-4 bg-current transition-opacity duration-200',
                  menuOpen && 'opacity-0',
                )}
              />
              <span
                className={cx(
                  'absolute left-0 block h-0.5 w-4 bg-current transition-transform duration-200',
                  menuOpen ? 'top-1.5 -rotate-45' : 'top-3',
                )}
              />
            </span>
          </button>
        </div>

        {/* Mobile nav panel — disclosed below the bar; each row a 44px target. */}
        {menuOpen && (
          <nav
            id="mobile-nav"
            className="flex flex-col border-t border-hairline px-gutter py-2 md:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-11 items-center font-mono text-[13px] font-medium uppercase tracking-[0.05em] text-text-secondary transition-colors hover:text-text-primary',
                    isActive && '!text-primary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-hairline pt-1">
              {user && (
                <span className="font-mono text-[12px] text-text-faint">— {user.username}</span>
              )}
              <button
                type="button"
                onClick={() => void onLogout()}
                className="flex min-h-11 items-center font-mono text-[13px] font-medium uppercase tracking-[0.05em] text-text-secondary transition-colors hover:text-text-primary"
              >
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-column flex-1 px-gutter py-12">
        <Outlet />
      </main>

      <footer className="border-t border-hairline px-gutter py-6 text-center font-mono text-[10px] tracking-[0.04em] text-text-secondary">
        Your data stays on this machine · profiles are generated locally · review before reuse
        <span className="mx-2">·</span>A personal research experiment
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
