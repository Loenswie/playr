import type { LibraryEntry } from '../api/types';
import { GameCard } from './GameCard';

export function GameGrid({ entries }: { entries: LibraryEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {entries.map((entry) => (
        <li key={entry.game.id} className="animate-fade-up">
          <GameCard game={entry.game} status={entry.status} rating={entry.rating} />
        </li>
      ))}
    </ul>
  );
}
