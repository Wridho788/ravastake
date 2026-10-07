import { useState } from 'react';
import { Link } from 'react-router';
import { formatBps, formatDateTime, formatUsdCents } from '../../domain/format';
import { useSnapshot } from '../../app/store';
import { Amount } from '../../shared/Amount';
import { describeActivity } from '../activity/describeActivity';
import { XrayButton, XrayDrawer, type XrayTarget } from '../xray/Xray';

export function DashboardPage() {
  const snapshot = useSnapshot();
  const [xray, setXray] = useState<XrayTarget | null>(null);
  const active = snapshot.positions.filter((v) => v.position.status === 'active');
  const assets = snapshot.assets.map((a) => a.asset);

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">
          Saldo dihitung dari ledger lokal di browser ini. Estimasi reward belum masuk saldo sampai posisi ditutup. Tekan X-ray
          untuk melihat entri ledger di balik sebuah angka.
        </p>
      </header>

      <section aria-labelledby="total-heading" className="panel panel--highlight">
        <h2 id="total-heading" className="panel__eyebrow">
          Total nilai (turunan)
        </h2>
        <p className="big-number" data-testid="total-usd">
          {formatUsdCents(snapshot.totalUsdCents)}
        </p>
        <p className="muted small">(Saldo tersedia + principal aktif) × harga fixture per aset. Harga bukan data pasar.</p>
      </section>

      <section aria-labelledby="assets-heading">
        <h2 id="assets-heading">Aset</h2>
        <ul className="card-grid">
          {snapshot.assets.map(({ asset, provider, availableUnits, activePrincipalUnits, estimatedRewardUnits }) => (
            <li key={asset.id} className="card" data-testid={`asset-${asset.id}`}>
              <div className="card__head">
                <h3>
                  {asset.symbol} <span className="muted small">{asset.name}</span>
                </h3>
                <span className="pill pill--soft">APR {formatBps(provider.aprBps)}</span>
              </div>
              <dl className="stats">
                <div>
                  <dt>Saldo tersedia</dt>
                  <dd>
                    <Amount units={availableUnits} symbol={asset.symbol} testId={`available-${asset.id}`} />
                    <XrayButton
                      label={`saldo tersedia ${asset.symbol}`}
                      onOpen={() => setXray({ kind: 'available', assetId: asset.id, symbol: asset.symbol })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Principal aktif</dt>
                  <dd>
                    <Amount units={activePrincipalUnits} symbol={asset.symbol} testId={`active-principal-${asset.id}`} />
                    <XrayButton
                      label={`principal aktif ${asset.symbol}`}
                      onOpen={() => setXray({ kind: 'active-principal', assetId: asset.id, symbol: asset.symbol })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Estimasi reward (turunan)</dt>
                  <dd>
                    <Amount units={estimatedRewardUnits} symbol={asset.symbol} testId={`estimated-reward-${asset.id}`} />
                  </dd>
                </div>
                <div>
                  <dt>Harga fixture</dt>
                  <dd>{formatUsdCents(BigInt(asset.priceUsdCents))}</dd>
                </div>
              </dl>
              <Link className="small" to={`/assets?asset=${asset.id}`}>
                Detail {asset.symbol}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="active-heading" className="panel">
        <h2 id="active-heading">Posisi aktif</h2>
        {active.length === 0 ? (
          <p className="muted">Belum ada posisi aktif.</p>
        ) : (
          <ul className="plain-list" data-testid="dashboard-active">
            {active.map((v) => (
              <li key={v.position.id}>
                <Link to={`/positions#position-${v.position.id}`}>
                  <Amount units={BigInt(v.position.principalUnits)} symbol={v.asset.symbol} />
                </Link>{' '}
                · hari {v.elapsedDays}/{v.position.durationDays} · estimasi <Amount units={v.rewardUnits} symbol={v.asset.symbol} />
              </li>
            ))}
          </ul>
        )}
        <div className="card__actions">
          <Link className="button button--primary" to="/positions">
            Kelola posisi
          </Link>
          <Link className="button button--ghost" to="/calculator">
            Hitung reward
          </Link>
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="panel">
        <h2 id="activity-heading">Aktivitas terbaru</h2>
        {snapshot.activity.length === 0 ? (
          <p className="muted">Belum ada aktivitas.</p>
        ) : (
          <ol className="activity-list" data-testid="recent-activity">
            {snapshot.activity.slice(0, 8).map((record) => (
              <li key={record.id}>
                <span>{describeActivity(record, assets)}</span>
                <time className="muted small" dateTime={new Date(record.createdAtMs).toISOString()}>
                  {formatDateTime(record.createdAtMs)}
                </time>
              </li>
            ))}
          </ol>
        )}
        <Link className="small" to="/activity">
          Semua aktivitas
        </Link>
      </section>

      <XrayDrawer target={xray} onClose={() => setXray(null)} />
    </div>
  );
}
