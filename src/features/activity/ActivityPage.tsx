import { useId, useState } from 'react';
import { Link } from 'react-router';
import { formatDateTime } from '../../domain/format';
import type { ActivityKind } from '../../domain/types';
import { useSnapshot } from '../../app/store';
import { describeActivity } from './describeActivity';

type Filter = 'all' | ActivityKind;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'activate', label: 'Aktivasi' },
  { key: 'close', label: 'Penutupan' },
  { key: 'time-advance', label: 'Lompatan waktu' },
];

/** Committed events only; history cannot be edited or deleted (STK-09). */
export function ActivityPage() {
  const snapshot = useSnapshot();
  const [filter, setFilter] = useState<Filter>('all');
  const groupName = useId();
  const assets = snapshot.assets.map((a) => a.asset);
  const records = snapshot.activity.filter((r) => filter === 'all' || r.kind === filter);

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Aktivitas</h1>
        <p className="muted">
          Riwayat event yang sudah committed, dengan waktu simulasi. Riwayat tidak bisa diedit atau dihapus satu per satu; hanya
          reset demo yang menghapus semuanya.
        </p>
      </header>

      <fieldset className="panel filter-group">
        <legend>Filter jenis</legend>
        {FILTERS.map((f) => (
          <label key={f.key} className="radio">
            <input type="radio" name={groupName} value={f.key} checked={filter === f.key} onChange={() => setFilter(f.key)} />
            {f.label}
          </label>
        ))}
      </fieldset>

      <section aria-labelledby="activity-list-heading">
        <h2 id="activity-list-heading">
          Event <span className="muted small">({records.length})</span>
        </h2>
        {records.length === 0 ? (
          <p className="muted">Belum ada event untuk filter ini.</p>
        ) : (
          <ol className="activity-list" data-testid="activity-list">
            {records.map((record) => (
              <li key={record.id} data-kind={record.kind}>
                <span>
                  {describeActivity(record, assets)}
                  {record.positionId ? (
                    <>
                      {' · '}
                      <Link to={`/positions#position-${record.positionId}`}>Lihat posisi</Link>
                    </>
                  ) : null}
                </span>
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
