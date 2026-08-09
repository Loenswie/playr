import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { GameStatus, LibraryEntry } from '../api/types';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Rating } from '../components/Rating';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { StatusPicker } from '../components/StatusPicker';
import { Tag, formatDate } from '../components/Tag';
import { useAsync } from '../hooks/useAsync';

export function GamePage() {
  const { externalId } = useParams();
  const navigate = useNavigate();
  const id = Number(externalId);

  const loader = useCallback(async () => {
    const [{ game }, { entries }] = await Promise.all([api.game(id), api.library()]);
    return { game, entry: entries.find((e) => e.game.externalId === id) ?? null };
  }, [id]);

  const { data, loading, error, reload, setData } = useAsync(loader, [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);

  // Browser history is not guaranteed to have an entry, for example on a shared link.
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/discover'));

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm
        text-slate-200 backdrop-blur transition hover:bg-white/15"
    >
      <Icon name="back" size={18} />
      Back
    </button>
  );

  if (!Number.isInteger(id) || id <= 0 || (!loading && (error || !data))) {
    return (
      <div className="space-y-6">
        {backButton}
        {!Number.isInteger(id) || id <= 0 ? (
          <EmptyState title="Game not found" />
        ) : (
          <ErrorState message={error ?? 'No data.'} onRetry={reload} />
        )}
      </div>
    );
  }
  if (loading || !data) return <LoadingState label="Loading game" />;

  const { game, entry } = data;
  const noteValue = notes ?? entry?.notes ?? '';

  async function apply(action: () => Promise<LibraryEntry | null>) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await action();
      setData({ game, entry: updated });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (status: GameStatus) =>
    apply(async () =>
      entry
        ? (await api.updateEntry(entry.game.id, { status })).entry
        : (await api.addToLibrary(game.externalId, status)).entry,
    );

  return (
    <article className="space-y-8 pb-4">
      <div className="relative -mx-4 -mt-6 sm:mx-0 sm:mt-0">
        <div className="aspect-[16/10] w-full overflow-hidden bg-ink-800 sm:aspect-[21/9] sm:rounded-3xl">
          {(game.backgroundUrl ?? game.coverUrl) && (
            <img
              src={game.backgroundUrl ?? game.coverUrl ?? ''}
              alt={`Artwork for ${game.title}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Layered stops so the artwork dissolves into the page background
            rather than ending on a visible edge. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 from-[1%] via-ink-950/70 via-45% to-transparent to-85% sm:rounded-3xl" />
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-32 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/70 via-transparent to-ink-950/70 sm:rounded-3xl" />

        <div className="absolute left-4 top-4 sm:left-5 sm:top-5">{backButton}</div>

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 sm:p-8">
          {game.coverUrl && (
            <img
              src={game.coverUrl}
              alt=""
              className="w-20 shrink-0 rounded-xl shadow-card sm:w-28 sm:rounded-2xl"
            />
          )}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{game.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {game.releaseDate && <Tag>{formatDate(game.releaseDate)}</Tag>}
              {game.rating != null && (
                <Tag>
                  <span className="font-semibold text-white">{game.rating}</span>
                  <span className="text-slate-400">/10 IGDB</span>
                </Tag>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {game.description && (
            <p className="max-w-2xl leading-relaxed text-slate-300">{game.description}</p>
          )}

          <dl className="space-y-5">
            <div>
              <dt className="text-xs uppercase tracking-widest text-slate-500">Genres</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {game.genres.length ? (
                  game.genres.map((genre) => (
                    <Tag key={genre} tone="accent">
                      {genre}
                    </Tag>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Unknown</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-slate-500">Platforms</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {game.platforms.length ? (
                  game.platforms.map((platform) => <Tag key={platform}>{platform}</Tag>)
                ) : (
                  <span className="text-sm text-slate-500">Unknown</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-slate-500">Release date</dt>
              <dd className="mt-1.5 text-lg font-medium text-slate-100">
                {formatDate(game.releaseDate) ?? 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>

        <aside className="surface h-fit space-y-5 p-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Your status</p>
            <StatusPicker value={entry?.status ?? null} onChange={setStatus} disabled={busy} />
          </div>

          {entry?.status === 'PLAYED' && (
            <Rating
              value={entry.rating}
              onChange={(rating) =>
                apply(async () => (await api.updateEntry(entry.game.id, { rating })).entry)
              }
            />
          )}

          {entry && (
            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-xs uppercase tracking-widest text-slate-500"
              >
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                maxLength={2000}
                value={noteValue}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-2xl border border-white/8 bg-ink-900 px-3.5 py-2.5 text-sm
                  text-slate-100 placeholder:text-slate-600 focus:border-accent/50"
                placeholder="Anything you want to remember..."
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                disabled={busy || noteValue === (entry.notes ?? '')}
                onClick={() =>
                  apply(async () => (await api.updateEntry(entry.game.id, { notes: noteValue })).entry)
                }
              >
                Save notes
              </Button>
            </div>
          )}

          <div className="space-y-2 border-t border-white/5 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus('NOT_INTERESTED')}
              aria-pressed={entry?.status === 'NOT_INTERESTED'}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-3
                text-sm font-medium transition active:scale-[0.98] disabled:opacity-40 ${
                  entry?.status === 'NOT_INTERESTED'
                    ? 'border-rose bg-rose/25 text-rose'
                    : 'border-rose/40 bg-rose/10 text-rose hover:bg-rose/20'
                }`}
            >
              <Icon name="cross" size={18} />
              Not interested
            </button>

            {entry && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  apply(async () => {
                    await api.removeEntry(entry.game.id);
                    setNotes(null);
                    return null;
                  })
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5
                  text-sm text-slate-500 transition hover:text-slate-300 disabled:opacity-40"
              >
                <Icon name="trash" size={16} />
                Remove from library
              </button>
            )}
          </div>

          {actionError && (
            <p role="alert" className="text-sm text-rose">
              {actionError}
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
