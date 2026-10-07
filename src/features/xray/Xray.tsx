import { useEffect, useState } from 'react';
import { formatBps, formatDateTime } from '../../domain/format';
import type { LedgerEntry, Position } from '../../domain/types';
import { DomainError } from '../../data/errors';
import { xrayActivePrincipal, xrayAvailable, xrayPosition, type PositionXray, type XrayResult } from '../../data/queries';
import { closePreviewAt } from '../../data/useCases';
import { useDeps, useSnapshot } from '../../app/store';
import { Amount } from '../../shared/Amount';
import { Dialog } from '../../shared/Dialog';

export type XrayTarget =
  | { kind: 'available'; assetId: string; symbol: string }
  | { kind: 'active-principal'; assetId: string; symbol: string }
  | { kind: 'position'; positionId: string; symbol: string };

const KIND_LABEL: Record<LedgerEntry['kind'], string> = {
  seed: 'Saldo awal',
  reserve: 'Reserve (aktivasi)',
  return: 'Pengembalian principal',
  reward: 'Reward',
};

function title(target: XrayTarget): string {
  switch (target.kind) {
    case 'available':
      return `Ledger X-ray · Saldo tersedia ${target.symbol}`;
    case 'active-principal':
      return `Ledger X-ray · Principal aktif ${target.symbol}`;
    case 'position':
      return `Ledger X-ray · Posisi ${target.symbol}`;
  }
}

/** Small trigger placed next to a traceable number. */
export function XrayButton({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button type="button" className="xray-button" onClick={onOpen} aria-label={`X-ray ${label}`} title="Lihat entri ledger">
      X-ray
    </button>
  );
}

export function XrayDrawer({ target, onClose }: { target: XrayTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} title={target ? title(target) : 'Ledger X-ray'} onClose={onClose} variant="drawer">
      {target ? <XrayContent target={target} /> : null}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>
          Tutup
        </button>
      </div>
    </Dialog>
  );
}

type Loaded =
  | { kind: 'sum'; result: XrayResult }
  | { kind: 'position'; result: PositionXray; position: Position | undefined };

function XrayContent({ target }: { target: XrayTarget }) {
  const deps = useDeps();
  const snapshot = useSnapshot();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<Loaded> => {
      if (target.kind === 'available') return { kind: 'sum', result: await xrayAvailable(deps, target.assetId) };
      if (target.kind === 'active-principal') return { kind: 'sum', result: await xrayActivePrincipal(deps, target.assetId) };
      const position = snapshot.positions.find((v) => v.position.id === target.positionId)?.position;
      return { kind: 'position', result: await xrayPosition(deps, target.positionId), position };
    };
    load().then(
      (value) => !cancelled && setLoaded(value),
      (e: unknown) => !cancelled && setError(e instanceof DomainError ? e.message : 'X-ray gagal dimuat.'),
    );
    return () => {
      cancelled = true;
    };
  }, [deps, snapshot, target]);

  if (error) return <p className="field-error">{error}</p>;
  if (!loaded) return <p className="muted">Memuat ledger…</p>;
  const { symbol } = target;

  return (
    <div className="xray">
      <p className="muted small">
        Setiap angka saldo adalah jumlah entri ledger yang tidak bisa diubah. Unit mentah memakai 8 desimal (1 {symbol} =
        100.000.000 unit).
      </p>
      <LedgerTable entries={loaded.result.entries} symbol={symbol} />
      {loaded.kind === 'sum' ? (
        <dl className="xray__totals">
          <div>
            <dt>{target.kind === 'active-principal' ? 'Total principal aktif (−Σ reserve)' : 'Total saldo tersedia (Σ delta)'}</dt>
            <dd>
              <Amount units={loaded.result.totalUnits} symbol={symbol} testId="xray-total" />
            </dd>
          </div>
        </dl>
      ) : (
        <PositionTotals loaded={loaded} symbol={symbol} simNowMs={snapshot.simNowMs} />
      )}
      {target.kind === 'active-principal' ? (
        <p className="muted small">
          Entri reserve bernilai negatif karena memindahkan saldo ke posisi; tandanya dibalik untuk principal aktif. Reserve
          milik posisi yang sudah ditutup tidak dihitung.
        </p>
      ) : null}
    </div>
  );
}

function PositionTotals({
  loaded,
  symbol,
  simNowMs,
}: {
  loaded: Extract<Loaded, { kind: 'position' }>;
  symbol: string;
  simNowMs: number;
}) {
  const { result, position } = loaded;
  const preview = position?.status === 'active' ? closePreviewAt(position, simNowMs) : undefined;
  return (
    <>
      <dl className="xray__totals">
        <div>
          <dt>Principal (−Σ reserve)</dt>
          <dd>
            <Amount units={result.principalUnits} symbol={symbol} testId="xray-principal" />
          </dd>
        </div>
        {position?.status === 'closed' ? (
          <>
            <div>
              <dt>Principal dikembalikan (Σ return)</dt>
              <dd>
                <Amount units={result.returnedUnits} symbol={symbol} testId="xray-returned" />
              </dd>
            </div>
            <div>
              <dt>Reward diterima (Σ reward)</dt>
              <dd>
                <Amount units={result.rewardUnits} symbol={symbol} testId="xray-reward" />
              </dd>
            </div>
          </>
        ) : null}
      </dl>
      {position && preview ? (
        <p className="xray__derived" data-testid="xray-derived">
          <span className="pill pill--soft">turunan</span> Estimasi reward = floor({position.principalUnits} ×{' '}
          {position.aprBpsSnapshot ?? 0} bps ({formatBps(position.aprBpsSnapshot ?? 0)}) × {preview.elapsedDays} hari ÷ 3.650.000) ={' '}
          <Amount units={BigInt(preview.rewardUnits)} symbol={symbol} /> pada {formatDateTime(simNowMs)}. Belum masuk ledger
          sampai posisi ditutup.
        </p>
      ) : null}
    </>
  );
}

function LedgerTable({ entries, symbol }: { entries: LedgerEntry[]; symbol: string }) {
  if (entries.length === 0) return <p className="muted">Belum ada entri ledger.</p>;
  return (
    <div className="table-scroll">
      <table className="ledger-table" data-testid="xray-entries">
        <thead>
          <tr>
            <th scope="col">Jenis</th>
            <th scope="col">Delta</th>
            <th scope="col">Waktu simulasi</th>
            <th scope="col">Operation ID</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{KIND_LABEL[entry.kind]}</td>
              <td>
                <Amount units={BigInt(entry.deltaUnits)} symbol={symbol} />
                <span className="muted small"> ({entry.deltaUnits} unit)</span>
              </td>
              <td>{formatDateTime(entry.createdAtMs)}</td>
              <td>
                <code className="op-id">{entry.operationId}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
