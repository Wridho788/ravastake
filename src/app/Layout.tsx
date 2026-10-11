import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router';
import { Calculator, Coins, Database, History, Layers, LayoutDashboard, Menu, Plus, Settings, type LucideIcon } from 'lucide-react';
import { AssetIcon } from '../shared/AssetIcon';
import { Amount } from '../shared/Amount';
import { BrandMark } from '../shared/BrandMark';
import { Dialog } from '../shared/Dialog';
import { useAppData, useSnapshot } from './store';
import { TimeBadge, TimeControls } from './TimeControls';

const NAV: readonly { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/assets', label: 'Aset', icon: Coins },
  { to: '/calculator', label: 'Kalkulator', icon: Calculator },
  { to: '/positions', label: 'Posisi', icon: Layers },
  { to: '/activity', label: 'Aktivitas', icon: History },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
];

const SIDEBAR_POSITION_LIMIT = 4;

export function Layout() {
  const { state, notice, connectionWarning } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const ready = state.kind === 'ready';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className={`shell ${menuOpen ? 'shell--menu-open' : ''}`}>
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>

      <aside className="sidebar" id="sidebar">
        <Link to="/dashboard" className="sidebar__brand">
          <BrandMark />
          <span className="brand-text">
            <span className="brand-name">RavaStake</span>
            <span className="brand-sub">Staking simulasi</span>
          </span>
        </Link>
        <nav id="main-nav" className="sidebar__nav" aria-label="Navigasi utama">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`} title={label}>
              <Icon />
              <span className="nav-link__label">{label}</span>
            </NavLink>
          ))}
        </nav>
        {ready ? <SidebarPositions /> : null}
        <div className="sidebar__foot">
          <Database />
          <p>
            <strong>Tersimpan di browser ini</strong>
            Tanpa akun, server, atau wallet.
          </p>
        </div>
      </aside>
      <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />

      <div className="main-col">
        <header className="topbar">
          <button
            type="button"
            className="icon-button menu-toggle"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="sidebar"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu />
          </button>
          <Link to="/dashboard" className="topbar__brand">
            <BrandMark small />
            RavaStake
          </Link>
          <span className="pill" title="Semua angka adalah fixture demonstrasi, bukan data pasar">
            Data simulasi
          </span>
          <div className="topbar__end">
            {ready ? <TimeBadge /> : null}
            <Link className="button button--primary topbar__cta" to="/positions#buat-draft" aria-label="Buat draft">
              <Plus />
              <span className="topbar__cta-label">Buat draft</span>
            </Link>
          </div>
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
          {ready ? (
            <>
              {/* The dashboard hosts the time machine as its own panel; every other page gets the strip. */}
              {location.pathname === '/dashboard' ? null : <TimeControls variant="bar" />}
              <Outlet />
            </>
          ) : null}
        </main>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite" data-testid="notice">
        {notice}
      </p>
    </div>
  );
}

/** Reference "Active Staking" list: shortcuts to the active positions. */
function SidebarPositions() {
  const snapshot = useSnapshot();
  const active = snapshot.positions.filter((v) => v.position.status === 'active');
  return (
    <section className="sidebar__section" aria-labelledby="sidebar-active-heading">
      <h2 id="sidebar-active-heading" className="sidebar__heading">
        <Layers />
        Posisi aktif
        <span className="count-badge">{active.length}</span>
      </h2>
      {active.length === 0 ? (
        <p className="sidebar__empty muted small">Belum ada posisi aktif.</p>
      ) : (
        <ul className="sidebar-positions">
          {active.slice(0, SIDEBAR_POSITION_LIMIT).map(({ position, asset }) => (
            <li key={position.id}>
              <Link className="sidebar-position" to={`/positions#position-${position.id}`}>
                <AssetIcon symbol={asset.symbol} size="sm" />
                <span className="sidebar-position__text">
                  <span className="sidebar-position__name">{asset.name}</span>
                  <span className="sidebar-position__amount">
                    <Amount units={BigInt(position.principalUnits)} symbol={asset.symbol} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {active.length > SIDEBAR_POSITION_LIMIT ? (
        <Link className="sidebar__more" to="/positions">
          +{active.length - SIDEBAR_POSITION_LIMIT} posisi lainnya
        </Link>
      ) : null}
    </section>
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
