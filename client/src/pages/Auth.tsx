import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';

type Mode = 'login' | 'register';

/** Login and registration share one layout; only the fields differ. */
export function AuthPage({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, username, password);
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link to="/" className="mb-10 self-start" aria-label="PLAYR home">
        <Logo height={26} />
      </Link>

      <h1 className="text-3xl font-semibold text-slate-50">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {mode === 'login'
          ? 'Sign in and pick up where you left off.'
          : 'Start swiping and build your personal game library.'}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          required
        />

        {mode === 'register' && (
          <Field
            id="username"
            label="Username"
            autoComplete="username"
            value={username}
            onChange={setUsername}
            hint="Letters, numbers and underscores. At least 3 characters."
            required
          />
        )}

        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={setPassword}
          hint={mode === 'register' ? 'At least 10 characters.' : undefined}
          required
        />

        {error && (
          <p role="alert" className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {mode === 'login' ? (
          <>
            New to PLAYR?{' '}
            <Link to="/register" className="text-accent-soft hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link to="/login" className="text-accent-soft hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
  ...props
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-slate-300">
        {label}
      </label>
      <input
        {...props}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-2xl border border-white/8 bg-ink-850 px-4 py-3 text-sm
          text-slate-100 placeholder:text-slate-600 focus:border-accent/50"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
