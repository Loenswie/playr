import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icon } from './Icon';
import { Logo } from './Logo';

const LINKS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/discover', label: 'Discover', icon: 'compass' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/library', label: 'Library', icon: 'library' },
] as const;

/**
 * Signing out lives inside the account menu rather than beside the navigation
 * links: it is an account action, not a destination.
 */
function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initial = user?.username.charAt(0).toUpperCase() ?? '?';

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 transition
          ${open ? 'bg-white/10' : 'hover:bg-white/5'}`}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br
            from-accent-soft to-accent-deep text-sm font-semibold text-white"
        >
          {initial}
        </span>
        <span className="max-w-[9rem] truncate text-sm text-slate-200">{user?.username}</span>
        <span className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          <Icon name="chevron" size={16} />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 animate-pop-in overflow-hidden
            rounded-2xl border border-white/8 bg-ink-900/95 shadow-card backdrop-blur-xl"
        >
          <div className="border-b border-white/5 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-100">{user?.username}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>

          <NavLink
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <Icon name="user" size={17} />
            Your profile
          </NavLink>

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose transition hover:bg-rose/10"
          >
            <Icon name="signout" size={17} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Top bar on tablet and desktop. */
export function Navigation() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-white/5 bg-ink-950/75 backdrop-blur-xl md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <NavLink to="/" aria-label="Playr home" className="shrink-0">
          <Logo height={22} />
        </NavLink>

        <nav aria-label="Main" className="flex-1">
          <ul className="flex w-fit items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] p-1">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      isActive
                        ? 'bg-accent/20 font-medium text-white ring-1 ring-accent/40'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon name={link.icon} size={17} />
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <AccountMenu />
      </div>
    </header>
  );
}

/** Thumb-friendly bottom bar on mobile. */
export function BottomNavigation() {
  const items = [...LINKS, { to: '/profile', label: 'You', icon: 'user' } as const];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink-950/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] transition ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent"
                    />
                  )}
                  <Icon name={item.icon} size={21} />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
