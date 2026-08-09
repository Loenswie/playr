import { useEffect, useState } from 'react';

type SearchBarProps = {
  onSearch: (term: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

/** Debounced so typing never fires one upstream request per keystroke. */
export function SearchBar({ onSearch, placeholder = 'Search games…', autoFocus }: SearchBarProps) {
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearch(term.trim()), 350);
    return () => clearTimeout(timer);
  }, [term, onSearch]);

  return (
    <div className="relative">
      <label htmlFor="game-search" className="sr-only">
        Search games
      </label>
      <input
        id="game-search"
        type="search"
        value={term}
        autoFocus={autoFocus}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-white/8 bg-ink-850/80 px-5 py-3 text-sm
          text-slate-100 placeholder:text-slate-500 focus:border-accent/50"
      />
    </div>
  );
}
