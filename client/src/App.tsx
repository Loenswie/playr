import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BottomNavigation, Navigation } from './components/Navigation';
import { LoadingState } from './components/States';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Discover } from './pages/Discover';
import { GamePage } from './pages/GamePage';
import { Landing } from './pages/Landing';
import { Library } from './pages/Library';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';

/** Redirects to the landing/login experience when there is no session. */
function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Starting PLAYR" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12">{children}</main>
      <BottomNavigation />
    </>
  );
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Starting PLAYR" />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

export function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          loading ? (
            <LoadingState label="Starting PLAYR" />
          ) : user ? (
            <Protected>
              <Dashboard />
            </Protected>
          ) : (
            <Landing />
          )
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <AuthPage mode="login" />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <AuthPage mode="register" />
          </PublicOnly>
        }
      />
      <Route
        path="/discover"
        element={
          <Protected>
            <Discover />
          </Protected>
        }
      />
      <Route
        path="/search"
        element={
          <Protected>
            <Search />
          </Protected>
        }
      />
      <Route
        path="/library"
        element={
          <Protected>
            <Library />
          </Protected>
        }
      />
      <Route
        path="/library/:status"
        element={
          <Protected>
            <Library />
          </Protected>
        }
      />
      <Route
        path="/game/:externalId"
        element={
          <Protected>
            <GamePage />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
