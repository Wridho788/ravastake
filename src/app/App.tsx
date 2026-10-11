import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router';
import { Compass } from 'lucide-react';
import { ActivityPage } from '../features/activity/ActivityPage';
import { AssetsPage } from '../features/assets/AssetsPage';
import { CalculatorPage } from '../features/calculator/CalculatorPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PositionsPage } from '../features/positions/PositionsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ErrorBoundary } from './ErrorBoundary';
import { Layout } from './Layout';
import { AppDataProvider } from './store';

function NotFoundPage() {
  return (
    <section className="panel panel--highlight not-found">
      <span className="empty-state__icon" aria-hidden="true">
        <Compass />
      </span>
      <p className="eyebrow">Error 404</p>
      <h1>Halaman tidak ditemukan</h1>
      <p className="muted">Alamat ini bukan bagian dari RavaStake.</p>
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
              <Route path="assets" element={<AssetsPage />} />
              <Route path="calculator" element={<CalculatorPage />} />
              <Route path="positions" element={<PositionsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </ErrorBoundary>
  );
}
