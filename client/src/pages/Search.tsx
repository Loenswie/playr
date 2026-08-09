import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Game, GameStatus, LibraryEntry } from '../api/types';
import { SearchBar } from '../components/SearchBar';
import { StatusPicker } from '../components/StatusPicker';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { Tag } from '../components/Tag';
import { useAsync } from '../hooks/useAsync';

export function Search() {
  const [results, setResults] = useState<Game[] | null>(null);
  const [suggestions, setSuggestions] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // The library is loaded once so each row can show its current status.
  const libraryLoader = useCallback(async () => (await api.library()).entries, []);
  const { data: entries, setData: setEntries } = useAsync<LibraryEntry[]>(libraryLoader);

  // Popular games fill the page before anything has been typed. A failure here
  // is not worth an error state: the search box still works.
  useEffect(() => {
    api
      .discover(0, 12)
      .then(({ games }) => setSuggestions(games))
      .catch(() => setSuggestions([]));
  }, []);

  const statusFor = (externalId: number): GameStatus | null =>
    entries?.find((entry) => entry.game.externalId === externalId)?.status ?? null;

  const onSearch = useCallback(async (term: string) => {
    if (!term) {
      setResults(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResults((await api.search(term)).games);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function setStatus(game: Game, status: GameStatus) {
    setBusyId(game.externalId);
    try {
      const { entry } = await api.addToLibrary(game.externalId, status);
      setEntries([
        ...(entries ?? []).filter((existing) => existing.game.externalId !== game.externalId),
        entry,
      ]);
    } catch {
      setError('That did not save. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  function GameList({ games }: { games: Game[] }) {
    return (
      <ul className="divide-y divide-white/5">
        {games.map((game) => (
          <li key={game.externalId} className="flex items-start gap-4 py-3">
            <Link to={`/game/${game.externalId}`} className="shrink-0">
              <div className="h-[86px] w-[62px] overflow-hidden rounded-lg bg-ink-800">
                {game.coverUrl && (
                  <img
                    src={game.coverUrl}
                    alt={`${game.title} cover art`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </Link>

            <div className="min-w-0 flex-1 space-y-1.5">
              <Link
                to={`/game/${game.externalId}`}
                className="block truncate font-medium text-slate-100 hover:text-white"
              >
                {game.title}
              </Link>

              <div className="flex flex-wrap items-center gap-1.5">
                {game.releaseDate && <Tag>{game.releaseDate.slice(0, 4)}</Tag>}
                {game.rating != null && (
                  <Tag>
                    <span className="font-semibold text-slate-100">{game.rating}</span>
                    <span className="text-slate-500">/10</span>
                  </Tag>
                )}
              </div>

              {/* Genres always sit on their own line, never beside the year. */}
              {game.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {game.genres.slice(0, 3).map((genre) => (
                    <Tag key={genre} tone="accent">
                      {genre}
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 pt-1">
              <StatusPicker
                compact
                value={statusFor(game.externalId)}
                disabled={busyId === game.externalId}
                onChange={(status) => setStatus(game, status)}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const showingSuggestions = results === null && !loading;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-50">Search</h1>

      <SearchBar onSearch={onSearch} placeholder="Search for a game..." autoFocus />

      {loading && <LoadingState label="Searching" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && results?.length === 0 && (
        <EmptyState title="No games found" description="Try a different title." />
      )}

      {results && results.length > 0 && <GameList games={results} />}

      {showingSuggestions && suggestions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-500">
              Popular right now
            </h2>
            <span className="text-xs text-slate-600">Add straight to your library</span>
          </div>
          <GameList games={suggestions} />
        </section>
      )}

      {showingSuggestions && suggestions.length === 0 && (
        <EmptyState
          title="Find any game"
          description="Search the catalogue and add anything straight to your library."
        />
      )}
    </div>
  );
}
