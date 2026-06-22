import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/app/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { IntroPage } from './pages/IntroPage';
import { StudiesPage } from './pages/StudiesPage';
import { StudyPage } from './pages/StudyPage';
import { SwipePage } from './pages/SwipePage';
import { ResultsPage } from './pages/ResultsPage';
import { type ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><span className="spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><span className="spin" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<IntroPage />} />
        <Route path="/studies" element={<StudiesPage />} />
        <Route path="/studies/:studyId" element={<StudyPage />} />
        <Route path="/swipe" element={<SwipePage />} />
        {/* Old routes — redirect away after the conversations/eval removal. */}
        <Route path="/conversations" element={<Navigate to="/swipe" replace />} />
        <Route path="/conversations/:id" element={<Navigate to="/swipe" replace />} />
        <Route path="/import" element={<Navigate to="/swipe" replace />} />
        <Route path="/eval" element={<Navigate to="/results" replace />} />
        <Route path="/results" element={<ResultsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
