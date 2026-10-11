import { useId, useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck, FastForward, Zap, type LucideIcon } from 'lucide-react';
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

const ICON: Record<ActivityKind, LucideIcon> = {
  activate: Zap,
  close: CircleCheck,
  'time-advance': FastForward,
};

/** Committed events only; history cannot be edited or deleted (STK-09). */
export function ActivityPage() {
  const snapshot = useSnapshot();
  const [filter, setFilter] = useState<Filter>('all');
  const groupName = useId();
  const assets = snapshot.assets.map((a) => a.asset);
  const records = snapshot.activity.filter((r) => filter === 'all' || r.kind === filter);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Aktivitas</p>
          <h1>Riwayat aktivitas</h1>
          <p className="page-head__lead">
            Riwayat event yang sudah committed, dengan waktu simulasi. Riwayat tidak bisa diedit atau dihapus satu per satu; hanya
            reset demo yang menghapus semuanya.
          </p>
        </div>
      </header>

      <fieldset className="filter-group">
        <legend>Filter jenis</legend>
        {FILTERS.map((f) => (
          <label key={f.key} className="radio">
            <input type="radio" name={groupName} value={f.key} checked={filter === f.key} onChange={() => setFilter(f.key)} />
            {f.label}
          </label>
        ))}
      </fieldset>

      <section className="panel" aria-labelledby="activity-list-heading">
        <div className="panel__head">
          <h2 id="activity-list-heading">
            Event <span className="count-badge">{records.length}</span>
          </h2>
        </div>
        {records.length === 0 ? (
          <p className="muted">Belum ada event untuk filter ini.</p>
        ) : (
          <ol className="activity-feed" data-testid="activity-list">
            {records.map((record) => {
              const Icon = ICON[record.kind];
              return (
                <li key={record.id} data-kind={record.kind}>
                  <span className={`activity-feed__icon activity-feed__icon--${record.kind}`} aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="activity-feed__text">
                    {describeActivity(record, assets)}
                    {record.positionId ? (
                      <>
                        {' · '}
                        <Link className="activity-feed__link" to={`/positions#position-${record.positionId}`}>
                          Lihat posisi
                        </Link>
                      </>
                    ) : null}
                  </span>
                  <time dateTime={new Date(record.createdAtMs).toISOString()}>{formatDateTime(record.createdAtMs)}</time>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
