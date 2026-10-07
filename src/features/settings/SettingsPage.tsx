import { useState } from 'react';
import { formatDateTime } from '../../domain/format';
import { offsetDays } from '../../domain/time';
import { DomainError } from '../../data/errors';
import { resetDemo } from '../../data/useCases';
import { useAppData, useSnapshot } from '../../app/store';
import { Dialog } from '../../shared/Dialog';

export function SettingsPage() {
  const snapshot = useSnapshot();
  const { mutate, pending, setNotice } = useAppData();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const { meta } = snapshot;

  async function confirmReset() {
    setError('');
    try {
      await mutate((deps) => resetDemo(deps));
      setConfirming(false);
      setNotice('Demo direset. Fixture stake-v1 dipulihkan dan waktu kembali ke waktu nyata.');
    } catch (e) {
      setError(e instanceof DomainError ? e.message : 'Reset gagal; data tidak berubah.');
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Pengaturan</h1>
      </header>

      <section className="panel" aria-labelledby="local-data-heading">
        <h2 id="local-data-heading">Data lokal</h2>
        <p>
          Semua data RavaStake tersimpan di IndexedDB browser ini saja: tidak ada akun, server, wallet, atau koneksi blockchain. Data
          tidak tersinkron ke perangkat lain, dan menghapus data situs di browser akan menghapusnya.
        </p>
        <dl className="stats" data-testid="data-status">
          <div>
            <dt>Versi schema</dt>
            <dd>{meta.schemaVersion}</dd>
          </div>
          <div>
            <dt>Fixture</dt>
            <dd>{meta.seedVersion}</dd>
          </div>
          <div>
            <dt>Dibuat / direset</dt>
            <dd>{formatDateTime(meta.seededAtMs)}</dd>
          </div>
          <div>
            <dt>Offset waktu simulasi</dt>
            <dd>+{offsetDays(meta.simOffsetMs)} hari</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="reset-heading">
        <h2 id="reset-heading">Reset demo</h2>
        <p>
          Menghapus semua draft, posisi, ledger, aktivitas, dan watchlist, lalu memulihkan fixture awal. Waktu simulasi kembali ke
          waktu nyata.
        </p>
        <button type="button" className="button button--danger" onClick={() => setConfirming(true)} disabled={pending}>
          Reset demo
        </button>
      </section>

      <Dialog open={confirming} title="Reset demo?" onClose={() => setConfirming(false)} busy={pending}>
        <p>Semua perubahan lokal akan hilang dan fixture awal dipulihkan dalam satu transaksi. Tindakan ini tidak bisa dibatalkan.</p>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={() => setConfirming(false)} disabled={pending}>
            Batal
          </button>
          <button type="button" className="button button--danger" onClick={() => void confirmReset()} disabled={pending}>
            Ya, reset demo
          </button>
        </div>
      </Dialog>
    </div>
  );
}
