import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowUpRight,
  Calculator,
  CircleCheck,
  Clock,
  FastForward,
  Layers,
  Plus,
  Sparkles,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  formatBps,
  formatDate,
  formatDateTime,
  formatSharePercent,
  formatSignedUsdCents,
  formatUsdCents,
} from '../../domain/format';
import { maturityMs, rewardUnits, usdCents } from '../../domain/reward';
import { daysToMaturity } from '../../domain/time';
import type { ActivityKind } from '../../domain/types';
import type { AssetView, PositionView } from '../../data/queries';
import { useAppData, useSnapshot } from '../../app/store';
import { TimeControls } from '../../app/TimeControls';
import { Amount } from '../../shared/Amount';
import { AssetIcon, assetColors } from '../../shared/AssetIcon';
import { seriesChange } from '../../shared/chartGeometry';
import { Delta } from '../../shared/Delta';
import { Sparkline } from '../../shared/Sparkline';
import { TickSlider } from '../../shared/TickSlider';
import { describeActivity } from '../activity/describeActivity';
import { CloseDialog, JumpToMaturityButton } from '../positions/PositionsPage';
import { XrayButton, XrayDrawer, type XrayTarget } from '../xray/Xray';

type SortKey = 'apr' | 'price';

export function DashboardPage() {
  const snapshot = useSnapshot();
  const [xray, setXray] = useState<XrayTarget | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('apr');
  const active = snapshot.positions.filter((v) => v.position.status === 'active');
  const sorted = [...snapshot.assets].sort((a, b) =>
    sort === 'apr' ? b.provider.aprBps - a.provider.aprBps : b.asset.priceUsdCents - a.asset.priceUsdCents,
  );

  return (
    <div className="dashboard">
      <div className="dashboard__top">
        <section aria-labelledby="assets-heading">
          <header className="section-head">
            <div>
              <p className="eyebrow">
                <Sparkles />
                Dashboard · harga dan APR fixture
                <span className="chip">{snapshot.assets.length} aset</span>
              </p>
              <h1 id="assets-heading">Aset staking</h1>
            </div>
            <div className="chip-group" role="group" aria-label="Urutkan kartu aset">
              <button type="button" className="chip-button" aria-pressed={sort === 'apr'} onClick={() => setSort('apr')}>
                APR tertinggi
              </button>
              <button type="button" className="chip-button" aria-pressed={sort === 'price'} onClick={() => setSort('price')}>
                Harga tertinggi
              </button>
            </div>
          </header>
          <ul className="asset-cards">
            {sorted.map((view) => (
              <AssetCard key={view.asset.id} view={view} />
            ))}
          </ul>
        </section>

        <TimeControls variant="panel" />
      </div>

      <ActivePositionsPanel active={active} onXray={setXray} onClose={setClosingId} />

      <div className="dashboard__bottom">
        <HoldingsPanel onXray={setXray} />
        <RecentActivity />
      </div>

      <XrayDrawer target={xray} onClose={() => setXray(null)} />
      {closingId ? <CloseDialog positionId={closingId} onDone={() => setClosingId(null)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset cards (reference "Top Staking Assets")
// ---------------------------------------------------------------------------

function AssetCard({ view }: { view: AssetView }) {
  const { asset, provider } = view;
  const series = asset.chart7d;
  const first = series[0] ?? asset.priceUsdCents;
  const rate = formatBps(provider.aprBps).replace(/%$/, '');
  const title = asset.name.replace(/\s*\(demo\)$/, '');

  return (
    <li className="asset-card" data-testid={`asset-${asset.id}`}>
      <div className="asset-card__head">
        <AssetIcon symbol={asset.symbol} />
        <Link className="icon-button" to={`/assets?asset=${asset.id}`} aria-label={`Detail ${asset.symbol}`} title={`Detail ${asset.symbol}`}>
          <ArrowUpRight />
        </Link>
      </div>
      <div className="asset-card__title">
        <span className="asset-card__provider">{provider.name}</span>
        <h2 className="asset-card__name">
          {title} ({asset.symbol})
        </h2>
      </div>
      <p className="asset-card__label">APR provider</p>
      <p className="asset-card__rate">
        {rate}
        <span className="asset-card__unit">%</span>
      </p>
      <p className="delta-line">
        <Delta ratio={seriesChange(series)} period="harga 7 hari" />
      </p>
      <p className="asset-card__price">
        Harga fixture <strong>{formatUsdCents(BigInt(asset.priceUsdCents))}</strong>
      </p>
      <Sparkline
        className="asset-card__spark"
        series={series}
        bubble={formatSignedUsdCents(BigInt(asset.priceUsdCents - first))}
      />
    </li>
  );
}

// ---------------------------------------------------------------------------
// Active positions (reference "Your active stakings")
// ---------------------------------------------------------------------------

function ActivePositionsPanel({
  active,
  onXray,
  onClose,
}: {
  active: PositionView[];
  onXray: (target: XrayTarget) => void;
  onClose: (positionId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = active.find((v) => v.position.id === selectedId) ?? active[0];

  return (
    <section className="panel panel--grid stake-panel" aria-labelledby="active-heading">
      <header className="stake-panel__bar">
        <h2 id="active-heading">
          Posisi aktif Anda <span className="count-badge">{active.length}</span>
        </h2>
        <div className="stake-panel__tools">
          <Link className="icon-button" to="/calculator" aria-label="Hitung reward" title="Hitung reward">
            <Calculator />
          </Link>
          <Link className="icon-button" to="/positions" aria-label="Kelola posisi" title="Kelola posisi">
            <Layers />
          </Link>
        </div>
      </header>

      {selected ? (
        <div className="stake-panel__body" data-testid="dashboard-active">
          {active.length > 1 ? (
            <div className="chip-group" role="group" aria-label="Pilih posisi aktif">
              {active.map((v) => (
                <button
                  key={v.position.id}
                  type="button"
                  className="chip-button"
                  aria-pressed={v.position.id === selected.position.id}
                  onClick={() => setSelectedId(v.position.id)}
                >
                  <AssetIcon symbol={v.asset.symbol} size="sm" />
                  <Amount units={BigInt(v.position.principalUnits)} symbol={v.asset.symbol} />
                </button>
              ))}
            </div>
          ) : null}
          <StakeHero view={selected} onXray={onXray} onClose={onClose} />
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">
            <Layers />
          </span>
          <p className="muted">Belum ada posisi aktif. Buat draft lalu aktifkan untuk mulai mengumpulkan reward simulasi.</p>
          <div className="card__actions">
            <Link className="button button--primary" to="/positions#buat-draft">
              <Plus />
              Buat draft
            </Link>
            <Link className="button button--ghost" to="/calculator">
              Hitung reward
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function StakeHero({
  view,
  onXray,
  onClose,
}: {
  view: PositionView;
  onXray: (target: XrayTarget) => void;
  onClose: (positionId: string) => void;
}) {
  const snapshot = useSnapshot();
  const { requestAdvancePrefill } = useAppData();
  const { position, asset } = view;
  const principal = BigInt(position.principalUnits);
  const apr = position.aprBpsSnapshot ?? 0;
  const activatedAt = position.activatedAtMs ?? 0;
  const remaining = daysToMaturity(activatedAt, position.durationDays, snapshot.simNowMs);
  const atMaturity = rewardUnits(principal, apr, position.durationDays);
  const title = asset.name.replace(/\s*\(demo\)$/, '');

  return (
    <>
      <div className="stake-hero">
        <div>
          <p className="stake-hero__meta">
            <Clock />
            Aktif sejak {formatDate(activatedAt)} · per {formatDate(snapshot.simNowMs)}
          </p>
          <div className="stake-hero__title-row">
            <h3 className="stake-hero__title">
              Stake {title} ({asset.symbol})
            </h3>
            <AssetIcon symbol={asset.symbol} size="sm" />
            <Link className="button button--ghost" to={`/positions#position-${position.id}`}>
              Detail posisi
              <ArrowUpRight />
            </Link>
          </div>
          <p className="stake-hero__label">Estimasi reward saat ini (turunan), {asset.symbol}</p>
          <div className="stake-hero__value-row">
            <p className="display-number">
              <Amount units={view.rewardUnits} />
            </p>
            <div className="stake-hero__actions">
              <button type="button" className="button button--primary" onClick={() => onClose(position.id)}>
                <CircleCheck />
                Tutup posisi
              </button>
              <JumpToMaturityButton remaining={remaining} onJump={() => requestAdvancePrefill(remaining)} />
            </div>
          </div>
        </div>

        <div className="period-card">
          <div className="period-card__head">
            <div>
              <h4>Periode staking</h4>
              <p className="muted small">Hari penuh berjalan dari durasi</p>
            </div>
            <span className="chip">{position.durationDays} hari</span>
          </div>
          <TickSlider
            min={0}
            max={position.durationDays}
            value={view.elapsedDays}
            bubble={`Hari ${view.elapsedDays}`}
            scale={['0', `${position.durationDays}`]}
            progress={{ label: `Periode staking ${asset.symbol}`, valueText: `Hari ${view.elapsedDays} dari ${position.durationDays}` }}
          />
          <p className="period-card__foot">
            Jatuh tempo {formatDate(maturityMs(activatedAt, position.durationDays))}
            {remaining > 0 ? ` · ${remaining} hari lagi` : ' · sudah jatuh tempo'}
          </p>
        </div>
      </div>

      <ul className="mini-stats">
        <li className="mini-stat">
          <span className="mini-stat__head">
            Principal
            <XrayButton label={`principal posisi ${asset.symbol}`} onOpen={() => onXray({ kind: 'position', positionId: position.id, symbol: asset.symbol })} />
          </span>
          <p className="mini-stat__value">
            <Amount units={principal} symbol={asset.symbol} />
          </p>
        </li>
        <li className="mini-stat">
          <span className="mini-stat__head">
            APR <span className="chip">snapshot</span>
          </span>
          <p className="mini-stat__value">{formatBps(apr)}</p>
        </li>
        <li className="mini-stat">
          <span className="mini-stat__head">
            Nilai principal <span className="chip">turunan</span>
          </span>
          <p className="mini-stat__value">{formatUsdCents(usdCents(principal, asset.priceUsdCents))}</p>
        </li>
        <li className="mini-stat">
          <span className="mini-stat__head">
            Reward saat jatuh tempo <span className="chip">turunan</span>
          </span>
          <p className="mini-stat__value">
            <Amount units={atMaturity} symbol={asset.symbol} />
          </p>
        </li>
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// Balances per asset + total value, and recent activity
// ---------------------------------------------------------------------------

function HoldingsPanel({ onXray }: { onXray: (target: XrayTarget) => void }) {
  const snapshot = useSnapshot();
  const total = snapshot.totalUsdCents;

  return (
    <section className="panel total-card holdings-panel" aria-labelledby="total-heading">
      <div className="panel__head">
        <h2 id="total-heading">
          <span className="panel__title-icon" aria-hidden="true">
            <Wallet />
          </span>
          Saldo per aset
        </h2>
      </div>
      <div className="holdings-panel__body">
        <div>
          <p className="panel__eyebrow">Total nilai (turunan)</p>
          <p className="display-number display-number--md" data-testid="total-usd">
            {formatUsdCents(total)}
          </p>
          <p className="muted small">(Saldo tersedia + principal aktif) × harga fixture per aset. Harga bukan data pasar.</p>

          <ul className="allocation" aria-label="Komposisi nilai per aset">
            {snapshot.assets.map(({ asset, holdingsUsdCents }) => {
              const share = total === 0n ? 0 : Number((holdingsUsdCents * 10_000n) / total) / 10_000;
              return (
                <li key={asset.id} style={assetColors(asset.symbol)}>
                  <AssetIcon symbol={asset.symbol} size="sm" />
                  <span className="allocation__bar" aria-hidden="true">
                    <span style={{ width: `${share * 100}%` }} />
                  </span>
                  <span className="allocation__share">
                    {asset.symbol} {formatSharePercent(share)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="table-scroll">
          <table className="holdings">
            <thead>
              <tr>
                <th scope="col">Aset</th>
                <th scope="col">Saldo tersedia</th>
                <th scope="col">Principal aktif</th>
                <th scope="col">Estimasi reward (turunan)</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.assets.map(({ asset, availableUnits, activePrincipalUnits, estimatedRewardUnits }) => (
                <tr key={asset.id}>
                  <th scope="row">
                    <span className="holdings__asset">
                      <AssetIcon symbol={asset.symbol} size="sm" />
                      <span>
                        {asset.symbol}
                        <small>{asset.name}</small>
                      </span>
                    </span>
                  </th>
                  <td data-label="Saldo tersedia">
                    <span className="holdings__value">
                      <Amount units={availableUnits} symbol={asset.symbol} testId={`available-${asset.id}`} />
                      <XrayButton
                        label={`saldo tersedia ${asset.symbol}`}
                        onOpen={() => onXray({ kind: 'available', assetId: asset.id, symbol: asset.symbol })}
                      />
                    </span>
                  </td>
                  <td data-label="Principal aktif">
                    <span className="holdings__value">
                      <Amount units={activePrincipalUnits} symbol={asset.symbol} testId={`active-principal-${asset.id}`} />
                      <XrayButton
                        label={`principal aktif ${asset.symbol}`}
                        onOpen={() => onXray({ kind: 'active-principal', assetId: asset.id, symbol: asset.symbol })}
                      />
                    </span>
                  </td>
                  <td data-label="Estimasi reward (turunan)">
                    <Amount units={estimatedRewardUnits} symbol={asset.symbol} testId={`estimated-reward-${asset.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  activate: Zap,
  close: CircleCheck,
  'time-advance': FastForward,
};

function RecentActivity() {
  const snapshot = useSnapshot();
  const assets = snapshot.assets.map((a) => a.asset);
  return (
    <section className="panel" aria-labelledby="activity-heading">
      <div className="panel__head">
        <h2 id="activity-heading">Aktivitas terbaru</h2>
        <Link className="panel__link" to="/activity">
          Semua aktivitas
          <ArrowUpRight />
        </Link>
      </div>
      {snapshot.activity.length === 0 ? (
        <p className="muted">Belum ada aktivitas.</p>
      ) : (
        <ol className="activity-feed" data-testid="recent-activity">
          {snapshot.activity.slice(0, 6).map((record) => {
            const Icon = ACTIVITY_ICON[record.kind];
            return (
              <li key={record.id}>
                <span className={`activity-feed__icon activity-feed__icon--${record.kind}`} aria-hidden="true">
                  <Icon />
                </span>
                <span className="activity-feed__text">{describeActivity(record, assets)}</span>
                <time dateTime={new Date(record.createdAtMs).toISOString()}>{formatDateTime(record.createdAtMs)}</time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
