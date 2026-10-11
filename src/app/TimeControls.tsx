import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CalendarClock, Clock, FastForward, Hourglass } from 'lucide-react';
import { MAX_ADVANCE_DAYS } from '../domain/constants';
import { parseWholeDays } from '../domain/decimal';
import { formatDate } from '../domain/format';
import { offsetDays } from '../domain/time';
import { DomainError } from '../data/errors';
import { advanceTime, newId } from '../data/useCases';
import { BrandMark } from '../shared/BrandMark';
import { Dialog } from '../shared/Dialog';
import { useAppData, useSnapshot } from './store';

export function TimeBadge() {
  const snapshot = useSnapshot();
  const days = offsetDays(snapshot.meta.simOffsetMs);
  const simulated = days > 0;
  return (
    <p className={`time-badge ${simulated ? 'time-badge--sim' : ''}`} data-testid="time-badge" aria-live="polite">
      <Clock />
      <span className="time-badge__text">
        <span className="time-badge__label">{simulated ? 'Waktu simulasi' : 'Waktu nyata'}</span>
        <span className="time-badge__date">
          {formatDate(snapshot.simNowMs)}
          {simulated ? ` (+${days} hari)` : ''}
        </span>
      </span>
    </p>
  );
}

const QUICK_STEPS = [1, 7, 30] as const;

/**
 * The time machine. Exactly one instance is rendered per page (labels and test hooks rely on it):
 * `panel` on the dashboard, `bar` above the content everywhere else.
 */
export function TimeControls({ variant }: { variant: 'panel' | 'bar' }) {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice, advancePrefill } = useAppData();
  const [daysInput, setDaysInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmDays, setConfirmDays] = useState<number | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const inputId = useId();
  const errorId = useId();
  const headingId = useId();
  const days = offsetDays(snapshot.meta.simOffsetMs);

  useEffect(() => {
    if (!advancePrefill) return;
    setDaysInput(String(advancePrefill.days));
    setInputError('');
    submitRef.current?.focus();
  }, [advancePrefill]);

  async function commit(days: number) {
    // Guards against a double click before the pending state re-renders.
    if (submitting.current) return;
    submitting.current = true;
    setActionError('');
    try {
      await mutate((deps) =>
        advanceTime(deps, { operationId: newId('op'), days, expectedOffsetMs: snapshot.meta.simOffsetMs }),
      );
      setDaysInput('');
      setNotice(`Waktu simulasi maju ${days} hari.`);
    } catch (error) {
      setActionError(error instanceof DomainError ? error.message : 'Gagal memajukan waktu.');
    } finally {
      submitting.current = false;
    }
  }

  function request(days: number) {
    if (!snapshot.meta.timeTravelAcknowledged) {
      setConfirmDays(days);
      return;
    }
    void commit(days);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseWholeDays(daysInput, 1, MAX_ADVANCE_DAYS);
    if (!parsed.ok) {
      setInputError(parsed.message);
      return;
    }
    setInputError('');
    request(parsed.value);
  }

  const controls = (
    <>
      <div className="time-quick" role="group" aria-label="Majukan cepat">
        {QUICK_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            className={`button ${variant === 'panel' ? 'button--glass' : 'button--ghost'}`}
            disabled={pending}
            onClick={() => request(step)}
          >
            +{step} hari
          </button>
        ))}
      </div>
      <form className="time-form" onSubmit={onSubmit} noValidate>
        <label htmlFor={inputId}>Majukan N hari</label>
        <div className="time-form__row">
          <input
            id={inputId}
            name="advance-days"
            inputMode="numeric"
            placeholder="1–365"
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? errorId : undefined}
            size={5}
          />
          <button ref={submitRef} type="submit" className="button button--primary" disabled={pending}>
            <FastForward />
            Majukan
          </button>
        </div>
        {inputError ? (
          <span id={errorId} className="field-error" role="alert">
            {inputError}
          </span>
        ) : null}
      </form>
      {actionError ? (
        <p className="time-controls__error" role="alert">
          {actionError}
        </p>
      ) : null}
    </>
  );

  const dialog = (
    <Dialog open={confirmDays !== null} title="Majukan waktu simulasi?" onClose={() => setConfirmDays(null)} busy={pending}>
      <p>
        Waktu simulasi akan maju <strong>{confirmDays} hari</strong> untuk <strong>semua posisi</strong>. Estimasi reward
        bertambah dan posisi bisa jatuh tempo.
      </p>
      <p>Waktu hanya bisa maju. Satu-satunya cara kembali ke waktu nyata adalah reset demo.</p>
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={() => setConfirmDays(null)} disabled={pending}>
          Batal
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={pending}
          onClick={async () => {
            const days = confirmDays;
            if (days === null) return;
            await commit(days);
            setConfirmDays(null);
          }}
        >
          Ya, majukan {confirmDays} hari
        </button>
      </div>
    </Dialog>
  );

  if (variant === 'bar') {
    return (
      <section className="time-bar" aria-label="Mesin waktu">
        <div className="time-bar__intro">
          <Hourglass />
          <div>
            <strong>Mesin waktu</strong>
            <span>Majukan waktu simulasi untuk semua posisi.</span>
          </div>
        </div>
        {controls}
        {dialog}
      </section>
    );
  }

  return (
    <section className="time-panel" aria-labelledby={headingId}>
      <div className="time-panel__head">
        <BrandMark small />
        <span className="time-panel__brand">Mesin waktu</span>
        <span className={`chip ${days > 0 ? 'chip--accent' : ''}`}>{days > 0 ? `+${days} hari` : 'Hari ini'}</span>
      </div>
      <h2 id={headingId} className="time-panel__title">
        Lihat reward bertambah
      </h2>
      <p className="time-panel__lead">
        Majukan waktu simulasi tanpa menunggu. Waktu hanya maju untuk semua posisi; reset demo mengembalikannya.
      </p>
      <p className="time-panel__date">
        <CalendarClock />
        Tanggal simulasi: {formatDate(snapshot.simNowMs)}
      </p>
      <div className="time-panel__controls">{controls}</div>
      {dialog}
    </section>
  );
}
