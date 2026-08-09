import { useCallback, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { LIBRARY_STATUSES, STATUS_LABELS, STATUS_SLUGS, type GameStatus } from '../api/types';
import { Button } from '../components/Button';
import { GameGrid } from '../components/GameGrid';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';

const SLUG_TO_STATUS = Object.fromEntries(
  LIBRARY_STATUSES.map((status) => [STATUS_SLUGS[status], status]),
) as Record<string, GameStatus>;

export function Library() {
  const { status: slug } = useParams();
  const status = slug ? SLUG_TO_STATUS[slug] : undefined;
  const [search, setSearch] = useState('');

  const loader = useCallback(() => api.library(status), [status]);
  const { data, loading, error, reload } = useAsync(loader, [status]);

  const entries = (data?.entries ?? []).filter((entry) =>
    entry.game.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-50">Your library</h1>
        <label className="sm:w-72">
          <span className="sr-only">Filter your library</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by title…"
            className="w-full rounded-full border border-white/8 bg-ink-850/80 px-4 py-2.5 text-sm
              text-slate-100 placeholder:text-slate-500 focus:border-accent/50"
          />
        </label>
      </div>

      <nav aria-label="Library filters" className="no-scrollbar -mx-1 overflow-x-auto px-1">
        <ul className="flex w-max gap-2">
          <li>
            <NavLink to="/library" end className={tabClass}>
              All
            </NavLink>
          </li>
          {LIBRARY_STATUSES.map((value) => (
            <li key={value}>
              <NavLink to={`/library/${STATUS_SLUGS[value]}`} className={tabClass}>
                {STATUS_LABELS[value]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {loading && <LoadingState label="Loading your library" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && entries.length === 0 && (
        <EmptyState
          title={search ? 'No games match that filter' : 'Nothing here yet'}
          description={
            search ? undefined : 'Swipe through discovery to start saving games you want to play.'
          }
          action={
            !search && (
              <Link to="/discover">
                <Button>Discover games</Button>
              </Link>
            )
          }
        />
      )}

      {!loading && !error && entries.length > 0 && <GameGrid entries={entries} />}
    </div>
  );
}

function tabClass({ isActive }: { isActive: boolean }) {
  return `inline-flex whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
    isActive ? 'bg-accent text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
  }`;
}
