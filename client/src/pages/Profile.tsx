import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Icon } from '../components/Icon';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(async () => (await api.stats()).stats, []);
  const { data: stats, loading, error, reload } = useAsync(loader);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-slate-50">Profile</h1>

      <section className="surface space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Username</p>
          <p className="mt-1 text-slate-100">{user?.username}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Email</p>
          <p className="mt-1 text-slate-100">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Member since</p>
          <p className="mt-1 text-slate-100">
            {user ? new Date(user.createdAt).toLocaleDateString() : '-'}
          </p>
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="mb-4 text-sm uppercase tracking-widest text-slate-500">Your numbers</h2>
        {loading && <LoadingState label="Loading stats" />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {stats && (
          <dl className="grid grid-cols-2 gap-4">
            {[
              ['Want to play', stats.wantToPlay],
              ['Playing', stats.playing],
              ['Finished', stats.played],
              ['Your average', stats.averageRating === null ? '-' : `${stats.averageRating}/5`],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-2xl font-semibold text-slate-50">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate('/login');
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose/40
          bg-rose/10 py-3 text-sm font-medium text-rose transition hover:bg-rose/20
          active:scale-[0.98]"
      >
        <Icon name="signout" size={18} />
        Sign out
      </button>
    </div>
  );
}
