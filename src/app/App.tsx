import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PositionsPage } from '../features/positions/PositionsPage';
import { ErrorBoundary } from './ErrorBoundary';
import { Layout } from './Layout';
import { AppDataProvider } from './store';

function NotFoundPage() {
  return (
    <section className="panel">
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat ini bukan bagian dari RavaStake.</p>
      <Link className="button button--primary" to="/dashboard">
        Kembali ke dashboard
      </Link>
    </section>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppDataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="positions" element={<PositionsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </ErrorBoundary>
  );
}
