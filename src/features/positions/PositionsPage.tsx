import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { MAX_NOTE_LENGTH } from '../../domain/constants';
import { formatBps, formatDate } from '../../domain/format';
import { daysToMaturity } from '../../domain/time';
import type { Position } from '../../domain/types';
import { DomainError } from '../../data/errors';
import type { PositionView } from '../../data/queries';
import { activatePosition, closePosition, closePreviewAt, createDraft, deleteDraft, newId } from '../../data/useCases';
import { useAppData, useSnapshot } from '../../app/store';
import { Amount } from '../../shared/Amount';
import { Dialog } from '../../shared/Dialog';

export function PositionsPage() {
  const snapshot = useSnapshot();
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const drafts = snapshot.positions.filter((v) => v.position.status === 'draft');
  const active = snapshot.positions.filter((v) => v.position.status === 'active');
  const closed = snapshot.positions.filter((v) => v.position.status === 'closed');

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Posisi staking simulasi</h1>
        <p className="muted">
          Draft tidak memesan saldo. Aktivasi memindahkan saldo tersedia ke posisi aktif; penutupan mengembalikan principal dan
          reward per hari penuh.
        </p>
      </header>

      <DraftForm />

      <PositionSection title="Draft" emptyText="Belum ada draft." items={drafts}>
        {(view) => (
          <div className="card__actions">
            <button type="button" className="button button--primary" onClick={() => setActivatingId(view.position.id)}>
              Aktifkan
            </button>
            <button type="button" className="button button--ghost" onClick={() => setDeletingId(view.position.id)}>
              Hapus
            </button>
          </div>
        )}
      </PositionSection>

      <PositionSection title="Aktif" emptyText="Belum ada posisi aktif." items={active}>
        {(view) => <ActiveActions view={view} onClose={() => setClosingId(view.position.id)} />}
      </PositionSection>

      <PositionSection title="Ditutup" emptyText="Belum ada posisi yang ditutup." items={closed} />

      {activatingId ? <ActivateDialog positionId={activatingId} onDone={() => setActivatingId(null)} /> : null}
      {closingId ? <CloseDialog positionId={closingId} onDone={() => setClosingId(null)} /> : null}
      {deletingId ? <DeleteDialog positionId={deletingId} onDone={() => setDeletingId(null)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function DraftForm() {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [assetId, setAssetId] = useState(snapshot.assets[0]?.asset.id ?? 'ETH');
  const [principal, setPrincipal] = useState('');
  const [duration, setDuration] = useState('30');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'assetId' | 'principal' | 'duration' | 'note' | 'form', string>>>({});
  const ids = { asset: useId(), principal: useId(), duration: useId(), note: useId() };
  const selected = snapshot.assets.find((a) => a.asset.id === assetId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    try {
      await mutate((deps) => createDraft(deps, { assetId, principalInput: principal, durationInput: duration, note }));
      setPrincipal('');
      setNote('');
      setNotice('Draft disimpan. Saldo tidak berubah sampai draft diaktifkan.');
    } catch (error) {
      if (error instanceof DomainError && error.field) setErrors({ [error.field]: error.message });
      else setErrors({ form: error instanceof Error ? error.message : 'Draft gagal disimpan.' });
    }
  }

  const errorProps = (key: 'assetId' | 'principal' | 'duration' | 'note', id: string) =>
    errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};

  return (
    <section className="panel" aria-labelledby="draft-form-heading">
      <h2 id="draft-form-heading">Buat draft</h2>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor={ids.asset}>Aset</label>
          <select id={ids.asset} value={assetId} onChange={(e) => setAssetId(e.target.value)} {...errorProps('assetId', ids.asset)}>
            {snapshot.assets.map(({ asset, provider }) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol} · {provider.name} · APR {formatBps(provider.aprBps)}
              </option>
            ))}
          </select>
          {selected ? (
            <p className="hint">
              Tersedia: <Amount units={selected.availableUnits} symbol={selected.asset.symbol} />
            </p>
          ) : null}
          <FieldError id={`${ids.asset}-error`} message={errors.assetId} />
        </div>
        <div className="field">
          <label htmlFor={ids.principal}>Jumlah (contoh: 1,5)</label>
          <input
            id={ids.principal}
            inputMode="decimal"
            autoComplete="off"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            {...errorProps('principal', ids.principal)}
          />
          <FieldError id={`${ids.principal}-error`} message={errors.principal} />
        </div>
        <div className="field">
          <label htmlFor={ids.duration}>Durasi (hari, 1–365)</label>
          <input
            id={ids.duration}
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            {...errorProps('duration', ids.duration)}
          />
          <FieldError id={`${ids.duration}-error`} message={errors.duration} />
        </div>
        <div className="field field--wide">
          <label htmlFor={ids.note}>Catatan (opsional, maks. {MAX_NOTE_LENGTH} karakter)</label>
          <textarea id={ids.note} rows={2} value={note} onChange={(e) => setNote(e.target.value)} {...errorProps('note', ids.note)} />
          <FieldError id={`${ids.note}-error`} message={errors.note} />
        </div>
        <div className="field field--wide">
          <button type="submit" className="button button--primary" disabled={pending}>
            Simpan draft
          </button>
          {errors.form ? (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------

function PositionSection({
  title,
  emptyText,
  items,
  children,
}: {
  title: string;
  emptyText: string;
  items: PositionView[];
  children?: (view: PositionView) => ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>
        {title} <span className="muted small">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <ul className="card-grid">
          {items.map((view) => (
            <li key={view.position.id} className="card" data-testid={`position-${view.position.id}`}>
              <PositionSummary view={view} />
              {children?.(view)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PositionSummary({ view }: { view: PositionView }) {
  const { position, asset } = view;
  const principal = BigInt(position.principalUnits);
  return (
    <>
      <div className="card__head">
        <h3>
          <Amount units={principal} symbol={asset.symbol} testId="principal" />
        </h3>
        <span className={`pill pill--status-${position.status}`}>{STATUS_LABEL[position.status]}</span>
      </div>
      <dl className="stats">
        <div>
          <dt>Durasi</dt>
          <dd>{position.durationDays} hari</dd>
        </div>
        {position.status !== 'draft' ? (
          <>
            <div>
              <dt>APR snapshot</dt>
              <dd>{formatBps(position.aprBpsSnapshot ?? 0)}</dd>
            </div>
            <div>
              <dt>Aktif sejak</dt>
              <dd>{formatDate(position.activatedAtMs ?? 0)}</dd>
            </div>
            <div>
              <dt>Hari berjalan</dt>
              <dd data-testid="elapsed-days">
                {view.elapsedDays} / {position.durationDays}
              </dd>
            </div>
            <div>
              <dt>{position.status === 'active' ? 'Estimasi reward (turunan)' : 'Reward diterima'}</dt>
              <dd>
                <Amount units={view.rewardUnits} symbol={asset.symbol} testId="reward" />
              </dd>
            </div>
          </>
        ) : null}
        {position.status === 'closed' ? (
          <div>
            <dt>Ditutup</dt>
            <dd>{formatDate(position.closedAtMs ?? 0)}</dd>
          </div>
        ) : null}
      </dl>
      {position.note ? <p className="muted small">{position.note}</p> : null}
    </>
  );
}

const STATUS_LABEL: Record<Position['status'], string> = { draft: 'Draft', active: 'Aktif', closed: 'Ditutup' };

function ActiveActions({ view, onClose }: { view: PositionView; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { requestAdvancePrefill } = useAppData();
  const remaining = daysToMaturity(view.position.activatedAtMs ?? 0, view.position.durationDays, snapshot.simNowMs);
  return (
    <div className="card__actions">
      <button type="button" className="button button--primary" onClick={onClose}>
        Tutup posisi
      </button>
      <button
        type="button"
        className="button button--ghost"
        disabled={remaining === 0}
        onClick={() => requestAdvancePrefill(remaining)}
        title={remaining === 0 ? undefined : `Isi "Majukan N hari" dengan ${remaining} hari`}
      >
        {remaining === 0 ? 'Sudah jatuh tempo' : 'Lompat ke jatuh tempo'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof DomainError ? error.message : fallback;
}

function ActivateDialog({ positionId, onDone }: { positionId: string; onDone: () => void }) {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [operationId] = useState(() => newId('op'));
  const [error, setError] = useState('');
  const view = snapshot.positions.find((v) => v.position.id === positionId);
  const assetView = view ? snapshot.assets.find((a) => a.asset.id === view.asset.id) : undefined;
  const isDraft = view?.position.status === 'draft';

  async function confirm() {
    if (!view || !assetView) return;
    setError('');
    try {
      await mutate((deps) =>
        activatePosition(deps, {
          operationId,
          positionId,
          expectedOffsetMs: snapshot.meta.simOffsetMs,
          preview: { principalUnits: view.position.principalUnits, aprBps: assetView.provider.aprBps },
        }),
      );
      setNotice(`Posisi ${assetView.asset.symbol} aktif.`);
      onDone();
    } catch (e) {
      setError(errorMessage(e, 'Aktivasi gagal; tidak ada perubahan yang disimpan.'));
    }
  }

  const principal = view ? BigInt(view.position.principalUnits) : 0n;
  return (
    <Dialog open title="Aktifkan staking simulasi?" onClose={onDone} busy={pending}>
      {view && assetView ? (
        <dl className="stats stats--dialog">
          <div>
            <dt>Jumlah</dt>
            <dd>
              <Amount units={principal} symbol={view.asset.symbol} />
            </dd>
          </div>
          <div>
            <dt>Durasi</dt>
            <dd>{view.position.durationDays} hari</dd>
          </div>
          <div>
            <dt>APR provider</dt>
            <dd>{formatBps(assetView.provider.aprBps)}</dd>
          </div>
          <div>
            <dt>Saldo tersedia</dt>
            <dd>
              <Amount units={assetView.availableUnits} symbol={view.asset.symbol} />
            </dd>
          </div>
          <div>
            <dt>Saldo setelah aktivasi</dt>
            <dd>
              <Amount units={assetView.availableUnits - principal} symbol={view.asset.symbol} />
            </dd>
          </div>
        </dl>
      ) : (
        <p>Draft ini tidak ditemukan lagi; mungkin dihapus atau data direset di tab lain.</p>
      )}
      {view && !isDraft ? <p className="field-error">Draft ini sudah diaktifkan di tab lain.</p> : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onDone} disabled={pending}>
          Batal
        </button>
        <button type="button" className="button button--primary" onClick={confirm} disabled={pending || !isDraft}>
          Konfirmasi aktivasi
        </button>
      </div>
    </Dialog>
  );
}

function CloseDialog({ positionId, onDone }: { positionId: string; onDone: () => void }) {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [operationId] = useState(() => newId('op'));
  const [error, setError] = useState('');
  const view = snapshot.positions.find((v) => v.position.id === positionId);
  const assetView = view ? snapshot.assets.find((a) => a.asset.id === view.asset.id) : undefined;
  const isActive = view?.position.status === 'active';
  const preview = view && isActive ? closePreviewAt(view.position, snapshot.simNowMs) : undefined;

  async function confirm() {
    if (!view || !preview) return;
    setError('');
    try {
      const result = await mutate((deps) =>
        closePosition(deps, { operationId, positionId, expectedOffsetMs: snapshot.meta.simOffsetMs, preview }),
      );
      setNotice(`Posisi ditutup. Reward ${result.rewardUnits === '0' ? '0' : 'masuk ke saldo'}.`);
      onDone();
    } catch (e) {
      setError(errorMessage(e, 'Penutupan gagal; tidak ada perubahan yang disimpan.'));
    }
  }

  const principal = view ? BigInt(view.position.principalUnits) : 0n;
  const reward = preview ? BigInt(preview.rewardUnits) : 0n;
  return (
    <Dialog open title="Tutup posisi simulasi?" onClose={onDone} busy={pending}>
      {view && preview && assetView ? (
        <dl className="stats stats--dialog">
          <div>
            <dt>Principal dikembalikan</dt>
            <dd>
              <Amount units={principal} symbol={view.asset.symbol} />
            </dd>
          </div>
          <div>
            <dt>Hari penuh berjalan</dt>
            <dd data-testid="close-elapsed">
              {preview.elapsedDays} / {view.position.durationDays}
            </dd>
          </div>
          <div>
            <dt>Reward</dt>
            <dd>
              <Amount units={reward} symbol={view.asset.symbol} testId="close-reward" />
            </dd>
          </div>
          <div>
            <dt>Saldo setelah penutupan</dt>
            <dd>
              <Amount units={assetView.availableUnits + principal + reward} symbol={view.asset.symbol} />
            </dd>
          </div>
        </dl>
      ) : (
        <p>{view ? 'Posisi ini sudah ditutup.' : 'Posisi tidak ditemukan; mungkin data direset di tab lain.'}</p>
      )}
      <p className="muted small">Reward dihitung per hari penuh dan dibulatkan ke bawah ke 8 desimal.</p>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onDone} disabled={pending}>
          Batal
        </button>
        <button type="button" className="button button--primary" onClick={confirm} disabled={pending || !preview}>
          Konfirmasi tutup
        </button>
      </div>
    </Dialog>
  );
}

function DeleteDialog({ positionId, onDone }: { positionId: string; onDone: () => void }) {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [error, setError] = useState('');
  const view = snapshot.positions.find((v) => v.position.id === positionId);

  async function confirm() {
    setError('');
    try {
      await mutate((deps) => deleteDraft(deps, positionId));
      setNotice('Draft dihapus.');
      onDone();
    } catch (e) {
      setError(errorMessage(e, 'Draft gagal dihapus.'));
    }
  }

  return (
    <Dialog open title="Hapus draft?" onClose={onDone} busy={pending}>
      {view ? (
        <p>
          Draft <Amount units={BigInt(view.position.principalUnits)} symbol={view.asset.symbol} /> akan dihapus. Saldo tidak
          berubah.
        </p>
      ) : (
        <p>Draft tidak ditemukan.</p>
      )}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onDone} disabled={pending}>
          Batal
        </button>
        <button type="button" className="button button--danger" onClick={confirm} disabled={pending || !view}>
          Hapus draft
        </button>
      </div>
    </Dialog>
  );
}
