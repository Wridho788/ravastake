import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SearchX, Star } from 'lucide-react';
import { formatBps, formatUsdCents } from '../../domain/format';
import { DomainError } from '../../data/errors';
import type { AssetView } from '../../data/queries';
import { toggleWatchlist } from '../../data/useCases';
import { useAppData, useSnapshot } from '../../app/store';
import { Amount } from '../../shared/Amount';
import { AssetIcon } from '../../shared/AssetIcon';
import { seriesChange } from '../../shared/chartGeometry';
import { Delta } from '../../shared/Delta';
import { PriceChart } from '../../shared/PriceChart';
import { Sparkline } from '../../shared/Sparkline';

type SortKey = 'price-desc' | 'price-asc' | 'apr-desc' | 'apr-asc';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'price-desc', label: 'Harga tertinggi' },
  { key: 'price-asc', label: 'Harga terendah' },
  { key: 'apr-desc', label: 'APR tertinggi' },
  { key: 'apr-asc', label: 'APR terendah' },
];

function sortAssets(assets: AssetView[], key: SortKey): AssetView[] {
  const sorted = [...assets];
  const byPrice = (a: AssetView, b: AssetView) => a.asset.priceUsdCents - b.asset.priceUsdCents;
  const byApr = (a: AssetView, b: AssetView) => a.provider.aprBps - b.provider.aprBps;
  switch (key) {
    case 'price-desc':
      return sorted.sort((a, b) => byPrice(b, a));
    case 'price-asc':
      return sorted.sort(byPrice);
    case 'apr-desc':
      return sorted.sort((a, b) => byApr(b, a));
    case 'apr-asc':
      return sorted.sort(byApr);
  }
}

export function AssetsPage() {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [watchOnly, setWatchOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('price-desc');
  const [error, setError] = useState('');
  const ids = { search: useId(), sort: useId(), watch: useId() };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = snapshot.assets.filter(
      (v) =>
        (q === '' || v.asset.symbol.toLowerCase().includes(q) || v.asset.name.toLowerCase().includes(q)) &&
        (!watchOnly || v.watched),
    );
    return sortAssets(filtered, sort);
  }, [snapshot.assets, query, watchOnly, sort]);

  const selectedId = params.get('asset') ?? snapshot.assets[0]?.asset.id;
  const selected = snapshot.assets.find((v) => v.asset.id === selectedId);

  async function onToggle(view: AssetView) {
    setError('');
    try {
      const watched = await mutate((deps) => toggleWatchlist(deps, view.asset.id));
      setNotice(watched ? `${view.asset.symbol} ditambahkan ke watchlist.` : `${view.asset.symbol} dihapus dari watchlist.`);
    } catch (e) {
      setError(e instanceof DomainError ? e.message : 'Watchlist gagal diperbarui.');
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            Aset <span className="chip">{snapshot.assets.length} aset</span>
          </p>
          <h1>Jelajahi aset</h1>
          <p className="page-head__lead">Harga, APR, dan grafik adalah fixture tetap untuk demonstrasi, bukan data pasar.</p>
        </div>
      </header>

      <section className="panel toolbar" aria-label="Pencarian dan urutan">
        <div className="field">
          <label htmlFor={ids.search}>Cari aset</label>
          <div className="input-icon">
            <Search aria-hidden="true" />
            <input id={ids.search} type="search" placeholder="Simbol atau nama" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={ids.sort}>Urutkan</label>
          <select id={ids.sort} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--check">
          <input id={ids.watch} type="checkbox" checked={watchOnly} onChange={(e) => setWatchOnly(e.target.checked)} />
          <label htmlFor={ids.watch}>Hanya watchlist</label>
        </div>
      </section>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="split">
        <section aria-labelledby="asset-list-heading">
          <h2 id="asset-list-heading">Daftar aset</h2>
          {visible.length === 0 ? (
            <div className="panel empty-state" data-testid="assets-empty">
              <span className="empty-state__icon" aria-hidden="true">
                <SearchX />
              </span>
              <p>{watchOnly && query.trim() === '' ? 'Watchlist masih kosong.' : 'Tidak ada aset yang cocok.'}</p>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setQuery('');
                  setWatchOnly(false);
                }}
              >
                Hapus pencarian dan filter
              </button>
            </div>
          ) : (
            <ul className="asset-list" data-testid="asset-list">
              {visible.map((view) => (
                <li key={view.asset.id} className={`asset-row ${view.asset.id === selected?.asset.id ? 'asset-row--selected' : ''}`} data-testid={`asset-row-${view.asset.id}`}>
                  <button
                    type="button"
                    className="asset-row__main"
                    aria-pressed={view.asset.id === selected?.asset.id}
                    onClick={() => setParams({ asset: view.asset.id }, { replace: true })}
                  >
                    <AssetIcon symbol={view.asset.symbol} />
                    <span className="asset-row__id">
                      <span className="asset-row__symbol">{view.asset.symbol}</span>
                      <span className="muted small">
                        {view.asset.name} · APR {formatBps(view.provider.aprBps)}
                      </span>
                    </span>
                    <Sparkline className="asset-row__spark" series={view.asset.chart7d} />
                    <span className="asset-row__figures">
                      <span className="asset-row__price">{formatUsdCents(BigInt(view.asset.priceUsdCents))}</span>
                      <Delta ratio={seriesChange(view.asset.chart7d)} period="7H" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`icon-button watch-toggle ${view.watched ? 'watch-toggle--on' : ''}`}
                    aria-pressed={view.watched}
                    aria-label={view.watched ? `Hapus ${view.asset.symbol} dari watchlist` : `Tambah ${view.asset.symbol} ke watchlist`}
                    title={view.watched ? 'Hapus dari watchlist' : 'Tambah ke watchlist'}
                    disabled={pending}
                    onClick={() => void onToggle(view)}
                  >
                    <Star fill={view.watched ? 'currentColor' : 'none'} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selected ? <AssetDetail view={selected} /> : null}
      </div>
    </div>
  );
}

function AssetDetail({ view }: { view: AssetView }) {
  const [range, setRange] = useState<'7d' | '30d'>('30d');
  const { asset, provider } = view;
  const series = range === '7d' ? asset.chart7d : asset.chart30d;
  return (
    <section className="panel" aria-labelledby="asset-detail-heading" data-testid="asset-detail">
      <div className="asset-detail__head">
        <AssetIcon symbol={asset.symbol} size="lg" />
        <h2 id="asset-detail-heading">
          Detail {asset.symbol} <span className="muted small">{asset.name}</span>
        </h2>
      </div>
      <p className="panel__eyebrow">Harga fixture</p>
      <div className="asset-detail__price">
        <p className="display-number display-number--md">{formatUsdCents(BigInt(asset.priceUsdCents))}</p>
        <Delta ratio={seriesChange(series)} period={range === '7d' ? '7 hari' : '30 hari'} />
      </div>
      <dl className="stats">
        <div>
          <dt>APR provider</dt>
          <dd>
            {formatBps(provider.aprBps)} · {provider.name}
          </dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>8 desimal (1 {asset.symbol} = 100.000.000 unit)</dd>
        </div>
        <div>
          <dt>Saldo tersedia</dt>
          <dd>
            <Amount units={view.availableUnits} symbol={asset.symbol} />
          </dd>
        </div>
      </dl>
      <div className="segmented" role="group" aria-label="Rentang grafik">
        {(['7d', '30d'] as const).map((r) => (
          <button key={r} type="button" className="button button--ghost" aria-pressed={range === r} onClick={() => setRange(r)}>
            {r === '7d' ? 'Grafik 7 hari' : 'Grafik 30 hari'}
          </button>
        ))}
      </div>
      <PriceChart series={series} label={`Harga ${asset.symbol} ${range === '7d' ? '7' : '30'} hari`} />
    </section>
  );
}
