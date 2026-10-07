import { NavLink, Outlet } from 'react-router';
import { useAppData } from './store';
import { TimeBadge, TimeControls } from './TimeControls';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/positions', label: 'Posisi' },
] as const;

export function Layout() {
  const { state, notice, connectionWarning } = useAppData();

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      <header className="topbar">
        <div className="topbar__brand">
          <span className="logo" aria-hidden="true">
            R
          </span>
          <span className="brand-name">RavaStake</span>
          <span className="pill" title="Semua angka adalah fixture demonstrasi, bukan data pasar">
            Data simulasi
          </span>
        </div>
        <nav className="topbar__nav" aria-label="Navigasi utama">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {state.kind === 'ready' ? (
          <div className="topbar__time">
            <TimeBadge />
            <TimeControls />
          </div>
        ) : null}
      </header>

      {connectionWarning ? (
        <p className="banner banner--warning" role="alert">
          {connectionWarning}
        </p>
      ) : null}

      <main id="main" className="page" tabIndex={-1}>
        {state.kind === 'loading' ? (
          <p className="muted" role="status">
            Menyiapkan data demo lokal…
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <section className="panel panel--error" role="alert">
            <h1>Data demo tidak bisa dimuat</h1>
            <p>{state.error.message}</p>
            <p className="muted">Kode: {state.error.code}. Data yang tersimpan tidak diubah.</p>
            <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
              Muat ulang
            </button>
          </section>
        ) : null}
        {state.kind === 'ready' ? <Outlet /> : null}
      </main>

      <p className="visually-hidden" role="status" aria-live="polite" data-testid="notice">
        {notice}
      </p>
    </div>
  );
}
