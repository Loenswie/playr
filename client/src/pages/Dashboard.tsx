import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { STATUS_SLUGS, type Game, type LibraryEntry } from '../api/types';
import { Button } from '../components/Button';
import { GameCard } from '../components/GameCard';
import { Modal } from '../components/Modal';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';

function Shelf({
  title,
  link,
  empty,
  children,
}: {
  title: string;
  link: { to: string; label: string };
  empty: string;
  children: ReactNode[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <Link to={link.to} className="text-sm text-slate-400 hover:text-white">
          {link.label}
        </Link>
      </div>

      {children.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">{children}</ul>
      )}
    </section>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const loader = useCallback(
    async () => ({
      stats: (await api.stats()).stats,
      recent: (await api.library()).entries.slice(0, 10),
      // Discovery can be unavailable without breaking the dashboard.
      popular: await api
        .discover(0, 12)
        .then(({ games }) => games)
        .catch((): Game[] => []),
    }),
    [],
  );
  const { data, loading, error, reload } = useAsync(loader);

  const [pick, setPick] = useState<LibraryEntry | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function whatShouldIPlay() {
    setPicking(true);
    setPickError(null);
    try {
      const { entry } = await api.nextGame();
      setPick(entry);
      setModalOpen(true);
    } catch (cause) {
      setPickError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setPicking(false);
    }
  }

  if (loading) return <LoadingState label="Loading your dashboard" />;
  if (error || !data) return <ErrorState message={error ?? 'No data.'} onRetry={reload} />;

  const { stats, recent, popular } = data;
  const cards = [
    { label: 'Want to play', value: stats.wantToPlay, to: `/library/${STATUS_SLUGS.WANT_TO_PLAY}` },
    { label: 'Playing now', value: stats.playing, to: `/library/${STATUS_SLUGS.PLAYING}` },
    { label: 'Finished', value: stats.played, to: `/library/${STATUS_SLUGS.PLAYED}` },
    {
      label: 'Your average',
      value: stats.averageRating === null ? '-' : `${stats.averageRating}/5`,
      to: `/library/${STATUS_SLUGS.PLAYED}`,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="surface relative overflow-hidden p-7 sm:p-9">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <p className="text-sm text-slate-400">Welcome back, {user?.username}</p>
        <h1 className="mt-2 max-w-lg text-3xl font-semibold leading-tight text-slate-50 sm:text-4xl">
          {stats.wantToPlay > 0
            ? `${stats.wantToPlay} game${stats.wantToPlay === 1 ? '' : 's'} waiting to be played.`
            : 'No games saved yet. Let’s find something to play.'}
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={whatShouldIPlay} disabled={picking || stats.wantToPlay === 0}>
            What should I play?
          </Button>
          <Link to="/discover">
            <Button size="lg" variant="secondary">
              Discover games
            </Button>
          </Link>
        </div>
        {pickError && (
          <p role="alert" className="mt-4 text-sm text-rose">
            {pickError}
          </p>
        )}
      </section>

      <section>
        <h2 className="sr-only">Your stats</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((card) => (
            <li key={card.label}>
              <Link
                to={card.to}
                className="surface block px-5 py-4 transition hover:border-accent/30 hover:bg-ink-800/70"
              >
                <p className="text-2xl font-semibold text-slate-50">{card.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{card.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Shelf
        title="Recently added"
        link={{ to: '/library', label: 'View all' }}
        empty="Nothing yet - swipe through discovery to fill this up."
      >
        {recent.map((entry) => (
          <li key={entry.game.id} className="w-32 shrink-0 sm:w-36">
            <GameCard game={entry.game} status={entry.status} rating={entry.rating} />
          </li>
        ))}
      </Shelf>

      <Shelf
        title="Popular right now"
        link={{ to: '/search', label: 'Browse' }}
        empty="Discovery is unavailable at the moment."
      >
        {popular.map((game) => (
          <li key={game.externalId} className="w-32 shrink-0 sm:w-36">
            <GameCard game={game} />
          </li>
        ))}
      </Shelf>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Your next game">
        {pick ? (
          <div className="space-y-5 text-center">
            {pick.game.coverUrl && (
              <img
                src={pick.game.coverUrl}
                alt={`${pick.game.title} cover art`}
                className="mx-auto w-40 rounded-2xl shadow-card"
              />
            )}
            <div>
              <p className="text-2xl font-semibold text-white">{pick.game.title}</p>
              <p className="mt-1 text-sm text-slate-400">
                You’ve wanted to play this since{' '}
                {new Date(pick.createdAt).toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
                .
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={async () => {
                  await api.updateEntry(pick.game.id, { status: 'PLAYING' });
                  setModalOpen(false);
                  reload();
                }}
              >
                Let’s play
              </Button>
              <Button variant="secondary" onClick={whatShouldIPlay} disabled={picking}>
                Pick another
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            You have not saved any games yet. Swipe right on a few first.
          </p>
        )}
      </Modal>
    </div>
  );
}
