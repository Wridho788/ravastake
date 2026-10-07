import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { MAX_NOTE_LENGTH } from '../../domain/constants';
import { unitsToInputString } from '../../domain/decimal';
import { formatBps, formatDate } from '../../domain/format';
import { daysToMaturity } from '../../domain/time';
import type { Position } from '../../domain/types';
import { DomainError } from '../../data/errors';
import type { PositionView, Snapshot } from '../../data/queries';
import {
  activatePosition,
  closePosition,
  closePreviewAt,
  createDraft,
  deleteDraft,
  newId,
  updateDraft,
  type DraftInput,
} from '../../data/useCases';
import { useAppData, useSnapshot } from '../../app/store';
import { Amount } from '../../shared/Amount';
import { Dialog } from '../../shared/Dialog';
import { XrayButton, XrayDrawer, type XrayTarget } from '../xray/Xray';

const STALE_CODES = new Set(['stale-time', 'stale-draft']);

export function PositionsPage() {
  const snapshot = useSnapshot();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [activatingId, setActivatingId] = useState<string | null>(() => params.get('activate'));
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [xray, setXray] = useState<XrayTarget | null>(null);

  // "Buka di tab kedua" opens /positions?activate=<draftId>; consume the parameter once.
  useEffect(() => {
    if (params.has('activate')) setParams({}, { replace: true });
  }, [params, setParams]);

  // Links from the activity page point at #position-<id>.
  useEffect(() => {
    if (!location.hash) return;
    const element = document.getElementById(location.hash.slice(1));
    if (element) {
      element.scrollIntoView({ block: 'center' });
      element.focus();
    }
  }, [location.hash]);

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

      <CreateDraftForm />

      <PositionSection title="Draft" emptyText="Belum ada draft." items={drafts} onXray={setXray}>
        {(view) => (
          <div className="card__actions">
            <button type="button" className="button button--primary" onClick={() => setActivatingId(view.position.id)}>
              Aktifkan
            </button>
            <button type="button" className="button button--ghost" onClick={() => setEditingId(view.position.id)}>
              Edit
            </button>
            <button type="button" className="button button--ghost" onClick={() => setDeletingId(view.position.id)}>
              Hapus
            </button>
          </div>
        )}
      </PositionSection>

      <PositionSection title="Aktif" emptyText="Belum ada posisi aktif." items={active} onXray={setXray}>
        {(view) => <ActiveActions view={view} onClose={() => setClosingId(view.position.id)} />}
      </PositionSection>

      <PositionSection title="Ditutup" emptyText="Belum ada posisi yang ditutup." items={closed} onXray={setXray} />

      {activatingId ? <ActivateDialog positionId={activatingId} onDone={() => setActivatingId(null)} /> : null}
      {closingId ? <CloseDialog positionId={closingId} onDone={() => setClosingId(null)} /> : null}
      {deletingId ? <DeleteDialog positionId={deletingId} onDone={() => setDeletingId(null)} /> : null}
      {editingId ? <EditDraftDialog positionId={editingId} onDone={() => setEditingId(null)} /> : null}
      <XrayDrawer target={xray} onClose={() => setXray(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft form (create + edit)
// ---------------------------------------------------------------------------

type DraftField = 'assetId' | 'principal' | 'duration' | 'note';
type DraftErrors = Partial<Record<DraftField | 'form', string>>;

function DraftFields({
  value,
  onChange,
  errors,
}: {
  value: DraftInput;
  onChange: (next: DraftInput) => void;
  errors: DraftErrors;
}) {
  const snapshot = useSnapshot();
  const ids = { asset: useId(), principal: useId(), duration: useId(), note: useId() };
  const selected = snapshot.assets.find((a) => a.asset.id === value.assetId);
  const invalid = (key: DraftField, id: string) =>
    errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};

  return (
    <>
      <div className="field">
        <label htmlFor={ids.asset}>Aset</label>
        <select id={ids.asset} value={value.assetId} onChange={(e) => onChange({ ...value, assetId: e.target.value })} {...invalid('assetId', ids.asset)}>
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
          value={value.principalInput}
          onChange={(e) => onChange({ ...value, principalInput: e.target.value })}
          {...invalid('principal', ids.principal)}
        />
        <FieldError id={`${ids.principal}-error`} message={errors.principal} />
      </div>
      <div className="field">
        <label htmlFor={ids.duration}>Durasi (hari, 1–365)</label>
        <input
          id={ids.duration}
          inputMode="numeric"
          value={value.durationInput}
          onChange={(e) => onChange({ ...value, durationInput: e.target.value })}
          {...invalid('duration', ids.duration)}
        />
        <FieldError id={`${ids.duration}-error`} message={errors.duration} />
      </div>
      <div className="field field--wide">
        <label htmlFor={ids.note}>Catatan (opsional, maks. {MAX_NOTE_LENGTH} karakter)</label>
        <textarea id={ids.note} rows={2} value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} {...invalid('note', ids.note)} />
        <FieldError id={`${ids.note}-error`} message={errors.note} />
      </div>
    </>
  );
}

function toDraftErrors(error: unknown, fallback: string): DraftErrors {
  if (error instanceof DomainError && error.field) return { [error.field]: error.message };
  return { form: error instanceof Error ? error.message : fallback };
}

function CreateDraftForm() {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [value, setValue] = useState<DraftInput>({
    assetId: snapshot.assets[0]?.asset.id ?? 'ETH',
    principalInput: '',
    durationInput: '30',
    note: '',
  });
  const [errors, setErrors] = useState<DraftErrors>({});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    try {
      await mutate((deps) => createDraft(deps, value));
      setValue((v) => ({ ...v, principalInput: '', note: '' }));
      setNotice('Draft disimpan. Saldo tidak berubah sampai draft diaktifkan.');
    } catch (error) {
      setErrors(toDraftErrors(error, 'Draft gagal disimpan.'));
    }
  }

  return (
    <section className="panel" aria-labelledby="draft-form-heading">
      <h2 id="draft-form-heading">Buat draft</h2>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <DraftFields value={value} onChange={setValue} errors={errors} />
        <div className="field field--wide">
          <button type="submit" className="button button--primary" disabled={pending}>
            Simpan draft
          </button>
          <FieldError id="draft-form-error" message={errors.form} />
        </div>
      </form>
    </section>
  );
}

function EditDraftDialog({ positionId, onDone }: { positionId: string; onDone: () => void }) {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const view = snapshot.positions.find((v) => v.position.id === positionId);
  const [value, setValue] = useState<DraftInput>(() => ({
    assetId: view?.position.assetId ?? 'ETH',
    principalInput: view ? unitsToInputString(BigInt(view.position.principalUnits)) : '',
    durationInput: view ? String(view.position.durationDays) : '30',
    note: view?.position.note ?? '',
  }));
  const [errors, setErrors] = useState<DraftErrors>({});
  const isDraft = view?.position.status === 'draft';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    try {
      await mutate((deps) => updateDraft(deps, positionId, value));
      setNotice('Draft diperbarui. Saldo tidak berubah.');
      onDone();
    } catch (error) {
      setErrors(toDraftErrors(error, 'Draft gagal diperbarui.'));
    }
  }

  return (
    <Dialog open title="Edit draft" onClose={onDone} busy={pending}>
      {isDraft ? (
        <form className="form-grid" onSubmit={onSubmit} noValidate>
          <DraftFields value={value} onChange={setValue} errors={errors} />
          <FieldError id="edit-form-error" message={errors.form} />
          <div className="dialog__actions field--wide">
            <button type="button" className="button button--ghost" onClick={onDone} disabled={pending}>
              Batal
            </button>
            <button type="submit" className="button button--primary" disabled={pending}>
              Simpan perubahan
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>{view ? 'Draft ini sudah diaktifkan di tab lain.' : 'Draft tidak ditemukan; mungkin sudah dihapus.'}</p>
          <div className="dialog__actions">
            <button type="button" className="button button--ghost" onClick={onDone}>
              Tutup
            </button>
          </div>
        </>
      )}
    </Dialog>
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
// Position cards
// ---------------------------------------------------------------------------

function PositionSection({
  title,
  emptyText,
  items,
  onXray,
  children,
}: {
  title: string;
  emptyText: string;
  items: PositionView[];
  onXray: (target: XrayTarget) => void;
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
            <li key={view.position.id} id={`position-${view.position.id}`} tabIndex={-1} className="card" data-testid={`position-${view.position.id}`}>
              <PositionSummary view={view} onXray={onXray} />
              {children?.(view)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const STATUS_LABEL: Record<Position['status'], string> = { draft: 'Draft', active: 'Aktif', closed: 'Ditutup' };

function PositionSummary({ view, onXray }: { view: PositionView; onXray: (target: XrayTarget) => void }) {
  const { position, asset } = view;
  const principal = BigInt(position.principalUnits);
  const openXray = () => onXray({ kind: 'position', positionId: position.id, symbol: asset.symbol });
  return (
    <>
      <div className="card__head">
        <h3>
          <Amount units={principal} symbol={asset.symbol} testId="principal" />
          {position.status !== 'draft' ? <XrayButton label={`principal posisi ${asset.symbol}`} onOpen={openXray} /> : null}
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
      {position.note ? <p className="muted small note">{position.note}</p> : null}
    </>
  );
}

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
// Dialogs with a frozen preview
// ---------------------------------------------------------------------------

/**
 * Keeps the snapshot from the moment a dialog opened, so the values the user confirms are
 * exactly the values sent for verification. After a stale-time/stale-draft rejection the
 * preview is refreshed from the latest data and the user confirms again (TRD "Verifikasi preview").
 */
function useFrozenSnapshot(): [Snapshot, () => void] {
  const live = useSnapshot();
  const [frozen, setFrozen] = useState(live);
  const [refreezeRequested, setRefreezeRequested] = useState(false);
  useEffect(() => {
    if (!refreezeRequested) return;
    setFrozen(live);
    setRefreezeRequested(false);
  }, [refreezeRequested, live]);
  return [frozen, () => setRefreezeRequested(true)];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof DomainError ? error.message : fallback;
}

function ActivateDialog({ positionId, onDone }: { positionId: string; onDone: () => void }) {
  const live = useSnapshot();
  const [frozen, refreeze] = useFrozenSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [operationId] = useState(() => newId('op'));
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const liveView = live.positions.find((v) => v.position.id === positionId);
  const view = frozen.positions.find((v) => v.position.id === positionId);
  const assetView = view ? frozen.assets.find((a) => a.asset.id === view.asset.id) : undefined;
  const isDraft = liveView?.position.status === 'draft';

  async function confirm() {
    if (!view || !assetView || submitting.current) return;
    submitting.current = true;
    setError('');
    try {
      await mutate((deps) =>
        activatePosition(deps, {
          operationId,
          positionId,
          expectedOffsetMs: frozen.meta.simOffsetMs,
          preview: { principalUnits: view.position.principalUnits, aprBps: assetView.provider.aprBps },
        }),
      );
      setNotice(`Posisi ${assetView.asset.symbol} aktif.`);
      onDone();
    } catch (e) {
      setError(errorMessage(e, 'Aktivasi gagal; tidak ada perubahan yang disimpan.'));
      if (e instanceof DomainError && STALE_CODES.has(e.code)) refreeze();
    } finally {
      submitting.current = false;
    }
  }

  const principal = view ? BigInt(view.position.principalUnits) : 0n;
  const after = assetView ? assetView.availableUnits - principal : 0n;
  return (
    <Dialog open title="Aktifkan staking simulasi?" onClose={onDone} busy={pending}>
      {view && assetView && liveView ? (
        <dl className="stats stats--dialog">
          <div>
            <dt>Jumlah</dt>
            <dd>
              <Amount units={principal} symbol={view.asset.symbol} testId="activate-principal" />
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
              <Amount units={after} symbol={view.asset.symbol} />
            </dd>
          </div>
        </dl>
      ) : (
        <p>Draft ini tidak ditemukan lagi; mungkin dihapus atau data direset di tab lain.</p>
      )}
      {after < 0n && isDraft ? <p className="field-error">Saldo tersedia lebih kecil dari jumlah draft.</p> : null}
      {liveView && !isDraft ? (
        <p className="field-error" role="alert">
          Draft ini sudah diaktifkan di tab lain.
        </p>
      ) : null}
      {error ? (
        <p className="field-error" role="alert" data-testid="dialog-error">
          {error}
        </p>
      ) : null}
      {isDraft ? (
        <p className="small">
          <a href={`/positions?activate=${encodeURIComponent(positionId)}`} target="_blank" rel="noopener">
            Buka di tab kedua
          </a>{' '}
          <span className="muted">untuk mencoba mengaktifkan draft yang sama dua kali; hanya satu yang berhasil.</span>
        </p>
      ) : null}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onDone} disabled={pending}>
          Batal
        </button>
        <button type="button" className="button button--primary" onClick={() => void confirm()} disabled={pending || !isDraft}>
          Konfirmasi aktivasi
        </button>
      </div>
    </Dialog>
  );
}

function CloseDialog({ positionId, onDone }: { positionId: string; onDone: () => void }) {
  const live = useSnapshot();
  const [frozen, refreeze] = useFrozenSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [operationId] = useState(() => newId('op'));
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const liveView = live.positions.find((v) => v.position.id === positionId);
  const view = frozen.positions.find((v) => v.position.id === positionId);
  const assetView = view ? frozen.assets.find((a) => a.asset.id === view.asset.id) : undefined;
  const isActive = liveView?.position.status === 'active';
  const preview = view && view.position.status === 'active' ? closePreviewAt(view.position, frozen.simNowMs) : undefined;

  async function confirm() {
    if (!preview || submitting.current) return;
    submitting.current = true;
    setError('');
    try {
      const result = await mutate((deps) =>
        closePosition(deps, { operationId, positionId, expectedOffsetMs: frozen.meta.simOffsetMs, preview }),
      );
      setNotice(`Posisi ditutup. Reward ${result.rewardUnits === '0' ? '0' : 'masuk ke saldo'}.`);
      onDone();
    } catch (e) {
      setError(errorMessage(e, 'Penutupan gagal; tidak ada perubahan yang disimpan.'));
      if (e instanceof DomainError && STALE_CODES.has(e.code)) refreeze();
    } finally {
      submitting.current = false;
    }
  }

  const principal = view ? BigInt(view.position.principalUnits) : 0n;
  const reward = preview ? BigInt(preview.rewardUnits) : 0n;
  return (
    <Dialog open title="Tutup posisi simulasi?" onClose={onDone} busy={pending}>
      {view && preview && assetView && isActive ? (
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
        <p role="alert">{liveView ? 'Posisi ini sudah ditutup.' : 'Posisi tidak ditemukan; mungkin data direset di tab lain.'}</p>
      )}
      <p className="muted small">Reward dihitung per hari penuh dan dibulatkan ke bawah ke 8 desimal.</p>
      {error ? (
        <p className="field-error" role="alert" data-testid="dialog-error">
          {error}
        </p>
      ) : null}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onDone} disabled={pending}>
          Batal
        </button>
        <button type="button" className="button button--primary" onClick={() => void confirm()} disabled={pending || !preview || !isActive}>
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
        <button type="button" className="button button--danger" onClick={() => void confirm()} disabled={pending || !view}>
          Hapus draft
        </button>
      </div>
    </Dialog>
  );
}
