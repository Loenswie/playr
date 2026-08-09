import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { Game, GameStatus } from '../api/types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { SwipeCard, SwipeControls, cardImage } from '../components/SwipeCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

const TUTORIAL_KEY = 'playr.discover.tutorial.v1';

export function Discover() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Game[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Shown once per browser, then never again.
    if (!localStorage.getItem(TUTORIAL_KEY)) setShowTutorial(true);
  }, []);

  function dismissTutorial() {
    localStorage.setItem(TUTORIAL_KEY, 'seen');
    setShowTutorial(false);
  }

  const load = useCallback(async (nextOffset: number, replace: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const { games } = await api.discover(nextOffset);
      setQueue((current) => (replace ? games : [...current, ...games]));
      setOffset(nextOffset + games.length);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0, true);
  }, [load]);

  const current = queue[0];
  const next = queue[1];

  async function decide(status: GameStatus) {
    if (!current) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.addToLibrary(current.externalId, status);
      setQueue((rest) => rest.slice(1));
      // Keep a small buffer of cards ahead of the user.
      if (queue.length <= 4) void load(offset, false);
    } catch (cause) {
      // The card stays put: Playr never pretends a save succeeded.
      setSaveError(
        cause instanceof ApiError && cause.status === 0
          ? "You're offline, so that didn't save. Try again once you're back."
          : (cause as Error).message,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 sm:gap-5">
      {error && <ErrorState message={error} onRetry={() => load(0, true)} />}

      {!error && loading && queue.length === 0 && <LoadingState label="Finding games" />}

      {!error && !loading && !current && (
        <EmptyState
          title="That's everything for now"
          description="You have been through the queue. Check back soon for more."
          action={<Button onClick={() => load(0, true)}>Load more games</Button>}
        />
      )}

      {current && (
        <>
          <div className="relative">
            {next && (
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 translate-y-3 scale-[0.96] overflow-hidden rounded-[28px] bg-ink-800 opacity-60"
              >
                {/* Same image the card itself will use, so nothing swaps on promotion. */}
                {cardImage(next) && (
                  <img src={cardImage(next)!} alt="" className="h-full w-full object-cover blur-[1px]" />
                )}
              </div>
            )}
            <SwipeCard
              key={current.externalId}
              game={current}
              onDecide={decide}
              onOpenDetails={() => navigate(`/game/${current.externalId}`)}
              disabled={saving}
            />
          </div>

          {saveError && (
            <p role="alert" className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-rose">
              {saveError}
            </p>
          )}

          <SwipeControls onDecide={decide} disabled={saving} />
        </>
      )}

      <Modal open={showTutorial} onClose={dismissTutorial} title="How discovery works">
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex gap-3">
            <span className="font-semibold text-mint">Swipe right</span>
            <span>saves the game for later.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-rose">Swipe left</span>
            <span>hides it, and you will not see it again.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-sky-300">Swipe up</span>
            <span>marks it as already played.</span>
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-400">
          Prefer buttons? The three below the card do exactly the same. On a keyboard, use the
          left, right and up arrows. Tap the icon on the artwork for full details.
        </p>
        <Button className="mt-6 w-full" onClick={dismissTutorial}>
          Got it
        </Button>
      </Modal>
    </div>
  );
}
