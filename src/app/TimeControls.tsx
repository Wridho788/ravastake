import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { MAX_ADVANCE_DAYS } from '../domain/constants';
import { parseWholeDays } from '../domain/decimal';
import { formatDate } from '../domain/format';
import { offsetDays } from '../domain/time';
import { DomainError } from '../data/errors';
import { advanceTime, newId } from '../data/useCases';
import { Dialog } from '../shared/Dialog';
import { useAppData, useSnapshot } from './store';

export function TimeBadge() {
  const snapshot = useSnapshot();
  const days = offsetDays(snapshot.meta.simOffsetMs);
  const simulated = days > 0;
  return (
    <p className={`time-badge ${simulated ? 'time-badge--sim' : ''}`} data-testid="time-badge" aria-live="polite">
      <span className="time-badge__label">{simulated ? 'Waktu simulasi' : 'Waktu nyata'}</span>
      <span className="time-badge__date">
        {formatDate(snapshot.simNowMs)}
        {simulated ? ` (+${days} hari)` : ''}
      </span>
    </p>
  );
}

const QUICK_STEPS = [1, 7, 30] as const;

export function TimeControls() {
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

  return (
    <section className="time-controls" aria-label="Mesin waktu">
      <div className="time-controls__quick" role="group" aria-label="Majukan cepat">
        {QUICK_STEPS.map((step) => (
          <button key={step} type="button" className="button button--ghost" disabled={pending} onClick={() => request(step)}>
            +{step} hari
          </button>
        ))}
      </div>
      <form className="time-controls__form" onSubmit={onSubmit} noValidate>
        <label htmlFor={inputId}>Majukan N hari</label>
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
          Majukan
        </button>
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
    </section>
  );
}
