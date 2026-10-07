import { Link } from 'react-router';
import { formatBps, formatDateTime, formatUsdCents } from '../../domain/format';
import { useSnapshot } from '../../app/store';
import { Amount } from '../../shared/Amount';
import { describeActivity } from '../activity/describeActivity';

export function DashboardPage() {
  const snapshot = useSnapshot();

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">
          Saldo dihitung dari ledger lokal di browser ini. Estimasi reward belum masuk saldo sampai posisi ditutup.
        </p>
      </header>

      <section aria-labelledby="total-heading" className="panel panel--highlight">
        <h2 id="total-heading" className="panel__eyebrow">
          Total nilai (turunan)
        </h2>
        <p className="big-number" data-testid="total-usd">
          {formatUsdCents(snapshot.totalUsdCents)}
        </p>
        <p className="muted small">
          (Saldo tersedia + principal aktif) × harga fixture per aset. Harga bukan data pasar.
        </p>
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
                  </dd>
                </div>
                <div>
                  <dt>Principal aktif</dt>
                  <dd>
                    <Amount units={activePrincipalUnits} symbol={asset.symbol} testId={`active-principal-${asset.id}`} />
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
            </li>
          ))}
        </ul>
        <Link className="button button--primary" to="/positions">
          Kelola posisi
        </Link>
      </section>

      <section aria-labelledby="activity-heading" className="panel">
        <h2 id="activity-heading">Aktivitas terbaru</h2>
        {snapshot.activity.length === 0 ? (
          <p className="muted">Belum ada aktivitas.</p>
        ) : (
          <ol className="activity-list" data-testid="recent-activity">
            {snapshot.activity.slice(0, 8).map((record) => (
              <li key={record.id}>
                <span>{describeActivity(record, snapshot.assets.map((a) => a.asset))}</span>
                <time className="muted small" dateTime={new Date(record.createdAtMs).toISOString()}>
                  {formatDateTime(record.createdAtMs)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
