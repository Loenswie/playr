import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';

export function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <Logo height={46} />

      <h1 className="mt-10 text-4xl font-semibold leading-tight text-slate-50 sm:text-6xl">
        Discover games.
        <br />
        <span className="bg-gradient-to-r from-accent-soft to-mint bg-clip-text text-transparent">
          Swipe on them.
        </span>
        <br />
        Decide what to play next.
      </h1>

      <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400">
        PLAYR turns that endless pile of unplayed games into something you actually finish. Swipe through
        thousands of games, keep track of what you're playing, and let PLAYR pick your next one.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link to="/register">
          <Button size="lg" className="w-full sm:w-auto">
            Get started
          </Button>
        </Link>
        <Link to="/login">
          <Button size="lg" variant="secondary" className="w-full sm:w-auto">
            I already have an account
          </Button>
        </Link>
      </div>

      <ul className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
        {[
          ['Swipe to sort', 'Right to save it for later, left to never see it again.'],
          ['One library', 'Want to play, playing, played. All in one place, on any device.'],
          ['What next?', 'One tap and PLAYR picks your next game for you.'],
        ].map(([title, description]) => (
          <li key={title} className="surface p-5">
            <p className="font-medium text-slate-100">{title}</p>
            <p className="mt-1.5 text-sm text-slate-400">{description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
