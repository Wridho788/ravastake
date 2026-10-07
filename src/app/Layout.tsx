import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Dialog } from '../shared/Dialog';
import { useAppData } from './store';
import { TimeBadge, TimeControls } from './TimeControls';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/assets', label: 'Aset' },
  { to: '/calculator', label: 'Kalkulator' },
  { to: '/positions', label: 'Posisi' },
  { to: '/activity', label: 'Aktivitas' },
  { to: '/settings', label: 'Pengaturan' },
] as const;

export function Layout() {
  const { state, notice, connectionWarning } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
          <button
            type="button"
            className="button button--ghost menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
        </div>
        <nav id="main-nav" className={`topbar__nav ${menuOpen ? 'topbar__nav--open' : ''}`} aria-label="Navigasi utama">
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
          {connectionWarning}{' '}
          <button type="button" className="button button--ghost" onClick={() => window.location.reload()}>
            Muat ulang
          </button>
        </p>
      ) : null}

      <main id="main" className="page" tabIndex={-1}>
        {state.kind === 'loading' ? (
          <p className="muted" role="status">
            Menyiapkan data demo lokal…
          </p>
        ) : null}
        {state.kind === 'error' ? <RecoveryPanel /> : null}
        {state.kind === 'ready' ? <Outlet /> : null}
      </main>

      <p className="visually-hidden" role="status" aria-live="polite" data-testid="notice">
        {notice}
      </p>
    </div>
  );
}

/** Shown when the local data cannot be opened. Nothing is deleted unless the user confirms. */
function RecoveryPanel() {
  const { state, deleteLocalData } = useAppData();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (state.kind !== 'error') return null;
  const canDelete = state.error.code !== 'migration-blocked';

  return (
    <section className="panel panel--error" role="alert" aria-labelledby="recovery-heading">
      <h1 id="recovery-heading">Data demo tidak bisa dimuat</h1>
      <p>{state.error.message}</p>
      <p className="muted">Kode: {state.error.code}. Data yang tersimpan tidak diubah.</p>
      <div className="card__actions">
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
          Muat ulang
        </button>
        {canDelete ? (
          <button type="button" className="button button--ghost" onClick={() => setConfirming(true)}>
            Hapus data lokal dan mulai ulang
          </button>
        ) : null}
      </div>
      <Dialog open={confirming} title="Hapus data lokal?" onClose={() => setConfirming(false)} busy={busy}>
        <p>
          Semua draft, posisi, ledger, dan waktu simulasi di browser ini akan dihapus, lalu fixture demo dibuat ulang. Tindakan ini
          tidak bisa dibatalkan.
        </p>
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Batal
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await deleteLocalData();
            }}
          >
            Hapus dan mulai ulang
          </button>
        </div>
      </Dialog>
    </section>
  );
}
