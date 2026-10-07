import {
  DAY_MS,
  MAX_ADVANCE_DAYS,
  MAX_DURATION_DAYS,
  MAX_NOTE_LENGTH,
  MAX_PRINCIPAL_UNITS,
  MIN_DURATION_DAYS,
} from '../domain/constants';
import { parseUnits, parseWholeDays } from '../domain/decimal';
import { formatUnits } from '../domain/format';
import { elapsedDays, rewardUnits } from '../domain/reward';
import { effectiveSimNow } from '../domain/time';
import type { Meta, Position } from '../domain/types';
import type { TransactionCoordinator } from './coordinator';
import { ALL_STORES, type ReadTx, type WriteTx } from './db';
import { DomainError, STALE_TIME_MESSAGE } from './errors';
import { SCHEMA_VERSION, SEED_VERSION, seedFixture } from './fixture';
import {
  activityRepo,
  assetsRepo,
  ledgerRepo,
  metadataRepo,
  operationsRepo,
  positionsRepo,
  providersRepo,
  watchlistRepo,
} from './repositories';

export interface Deps {
  coordinator: TransactionCoordinator;
  /** Real wall-clock time; simulated time is derived from it plus the stored offset. */
  realNow: () => number;
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function requireMeta(tx: ReadTx): Promise<Meta> {
  const meta = await metadataRepo.get(tx);
  if (!meta) throw new DomainError('unsupported-schema', 'Metadata demo tidak ditemukan. Reset demo untuk memulihkan data.');
  assertSupportedMeta(meta);
  return meta;
}

function assertSupportedMeta(meta: Meta): void {
  if (meta.schemaVersion !== SCHEMA_VERSION || meta.seedVersion !== SEED_VERSION) {
    throw new DomainError(
      'unsupported-schema',
      `Data tersimpan memakai versi yang tidak dikenali (schema ${String(meta.schemaVersion)}, seed ${String(meta.seedVersion)}). Data tidak diubah.`,
    );
  }
}

/** Captures asOf once per mutation and keeps lastCommittedSimMs monotonic (TRD "Waktu simulasi"). */
function captureAsOf(deps: Deps, meta: Meta): number {
  return effectiveSimNow(deps.realNow(), meta.simOffsetMs, meta.lastCommittedSimMs);
}

/** Opens the database contents for use: seeds stake-v1 once, or validates existing data. */
export async function ensureSeeded(deps: Deps): Promise<Meta> {
  return deps.coordinator.write(ALL_STORES, async (tx) => {
    const meta = await metadataRepo.get(tx);
    if (meta) {
      assertSupportedMeta(meta);
      return meta;
    }
    const [positions, ledger] = await Promise.all([positionsRepo.listAll(tx), ledgerRepo.listAll(tx)]);
    if (positions.length > 0 || ledger.length > 0) {
      throw new DomainError('unsupported-schema', 'Data tersimpan tidak dikenali (metadata hilang). Data tidak diubah; reset demo untuk memulihkan.');
    }
    return seedFixture(tx, deps.realNow());
  });
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export interface DraftInput {
  assetId: string;
  principalInput: string;
  durationInput: string;
  note: string;
}

interface ValidDraft {
  assetId: string;
  providerId: string;
  principalUnits: bigint;
  durationDays: number;
  note: string;
}

async function validateDraft(tx: ReadTx, input: DraftInput): Promise<ValidDraft> {
  const asset = await assetsRepo.get(tx, input.assetId);
  if (!asset) throw new DomainError('validation', 'Pilih aset yang tersedia.', 'assetId');
  const [provider] = await providersRepo.listByAsset(tx, asset.id);
  if (!provider) throw new DomainError('validation', 'Aset ini tidak punya provider demo.', 'assetId');
  const principal = parseUnits(input.principalInput, {
    maxUnits: MAX_PRINCIPAL_UNITS,
    maxLabel: `Maksimal 1.000.000 ${asset.symbol} per posisi.`,
  });
  if (!principal.ok) throw new DomainError('validation', principal.message, 'principal');
  const duration = parseWholeDays(input.durationInput, MIN_DURATION_DAYS, MAX_DURATION_DAYS);
  if (!duration.ok) throw new DomainError('validation', duration.message, 'duration');
  const note = input.note.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    throw new DomainError('validation', `Catatan maksimal ${MAX_NOTE_LENGTH} karakter.`, 'note');
  }
  return { assetId: asset.id, providerId: provider.id, principalUnits: principal.value, durationDays: duration.value, note };
}

export async function createDraft(deps: Deps, input: DraftInput): Promise<Position> {
  return deps.coordinator.write(['assets', 'providers', 'positions', 'metadata'], async (tx) => {
    const meta = await requireMeta(tx);
    const draft = await validateDraft(tx, input);
    const asOf = captureAsOf(deps, meta);
    const position: Position = {
      id: newId('position'),
      assetId: draft.assetId,
      providerId: draft.providerId,
      principalUnits: draft.principalUnits.toString(),
      durationDays: draft.durationDays,
      note: draft.note,
      status: 'draft',
      createdAtMs: asOf,
      updatedAtMs: asOf,
    };
    await positionsRepo.put(tx, position);
    await metadataRepo.put(tx, { ...meta, lastCommittedSimMs: asOf });
    return position;
  });
}

async function requireDraft(tx: ReadTx, positionId: string): Promise<Position> {
  const position = await positionsRepo.get(tx, positionId);
  if (!position) {
    throw new DomainError('not-found', 'Draft tidak ditemukan; mungkin sudah dihapus atau data direset di tab lain.');
  }
  if (position.status !== 'draft') {
    throw new DomainError(
      'invalid-transition',
      position.status === 'active' ? 'Draft ini sudah diaktifkan di tab lain.' : 'Posisi ini sudah ditutup.',
    );
  }
  return position;
}

export async function updateDraft(deps: Deps, positionId: string, input: DraftInput): Promise<Position> {
  return deps.coordinator.write(['assets', 'providers', 'positions', 'metadata'], async (tx) => {
    const meta = await requireMeta(tx);
    const existing = await requireDraft(tx, positionId);
    const draft = await validateDraft(tx, input);
    const asOf = captureAsOf(deps, meta);
    const updated: Position = {
      ...existing,
      assetId: draft.assetId,
      providerId: draft.providerId,
      principalUnits: draft.principalUnits.toString(),
      durationDays: draft.durationDays,
      note: draft.note,
      updatedAtMs: asOf,
    };
    await positionsRepo.put(tx, updated);
    await metadataRepo.put(tx, { ...meta, lastCommittedSimMs: asOf });
    return updated;
  });
}

export async function deleteDraft(deps: Deps, positionId: string): Promise<void> {
  await deps.coordinator.write(['positions', 'metadata'], async (tx) => {
    await requireMeta(tx);
    await requireDraft(tx, positionId);
    await positionsRepo.delete(tx, positionId);
  });
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export interface ActivateInput {
  operationId: string;
  positionId: string;
  expectedOffsetMs: number;
  preview: { principalUnits: string; aprBps: number };
}

export interface ActivateResult {
  positionId: string;
  assetId: string;
  principalUnits: string;
  aprBps: number;
  activatedAtMs: number;
  replayed: boolean;
}

const ACTIVATE_STORES = ['positions', 'providers', 'assets', 'ledger', 'operations', 'activity', 'metadata'] as const;

export async function activatePosition(deps: Deps, input: ActivateInput): Promise<ActivateResult> {
  return deps.coordinator.write([...ACTIVATE_STORES], async (tx) => {
    const previous = await operationsRepo.get(tx, input.operationId);
    if (previous) return replayResult<ActivateResult>(previous.kind, 'activate', previous.resultSnapshot);

    const meta = await requireMeta(tx);
    if (meta.simOffsetMs !== input.expectedOffsetMs) throw new DomainError('stale-time', STALE_TIME_MESSAGE);
    const asOf = captureAsOf(deps, meta);

    const position = await requireDraft(tx, input.positionId);
    const provider = await providersRepo.get(tx, position.providerId);
    const asset = await assetsRepo.get(tx, position.assetId);
    if (!provider || !asset || provider.assetId !== position.assetId) {
      throw new DomainError('validation', 'Provider atau aset draft tidak valid.');
    }
    if (position.principalUnits !== input.preview.principalUnits || provider.aprBps !== input.preview.aprBps) {
      throw new DomainError('stale-draft', 'Draft atau APR provider berubah sejak dialog dibuka. Periksa ulang nilai.');
    }

    const principal = BigInt(position.principalUnits);
    const available = await ledgerRepo.balanceByAsset(tx, position.assetId);
    if (available < principal) {
      throw new DomainError(
        'insufficient-balance',
        `Saldo ${asset.symbol} tidak cukup: tersedia ${formatUnits(available)}, dibutuhkan ${formatUnits(principal)}.`,
      );
    }

    const result: ActivateResult = {
      positionId: position.id,
      assetId: position.assetId,
      principalUnits: position.principalUnits,
      aprBps: provider.aprBps,
      activatedAtMs: asOf,
      replayed: false,
    };
    await positionsRepo.put(tx, {
      ...position,
      status: 'active',
      aprBpsSnapshot: provider.aprBps,
      activatedAtMs: asOf,
      updatedAtMs: asOf,
    });
    await ledgerRepo.add(tx, {
      id: newId('ledger'),
      operationId: input.operationId,
      assetId: position.assetId,
      positionId: position.id,
      kind: 'reserve',
      deltaUnits: (-principal).toString(),
      createdAtMs: asOf,
    });
    await operationsRepo.add(tx, {
      operationId: input.operationId,
      kind: 'activate',
      positionId: position.id,
      resultSnapshot: { ...result, replayed: false },
      createdAtMs: asOf,
    });
    await activityRepo.add(tx, {
      id: newId('activity'),
      operationId: input.operationId,
      positionId: position.id,
      kind: 'activate',
      payload: { assetId: position.assetId, amountUnits: position.principalUnits },
      createdAtMs: asOf,
    });
    await metadataRepo.put(tx, { ...meta, lastCommittedSimMs: asOf });
    return result;
  });
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

export interface ClosePreview {
  elapsedDays: number;
  rewardUnits: string;
}

export interface CloseInput {
  operationId: string;
  positionId: string;
  expectedOffsetMs: number;
  preview: ClosePreview;
}

export interface CloseResult {
  positionId: string;
  assetId: string;
  principalUnits: string;
  rewardUnits: string;
  elapsedDays: number;
  closedAtMs: number;
  replayed: boolean;
}

/** Reward a close would credit at `asOfMs`; shared by the dialog preview and the commit. */
export function closePreviewAt(position: Position, asOfMs: number): ClosePreview {
  const days = elapsedDays(position.activatedAtMs ?? asOfMs, asOfMs, position.durationDays);
  return {
    elapsedDays: days,
    rewardUnits: rewardUnits(BigInt(position.principalUnits), position.aprBpsSnapshot ?? 0, days).toString(),
  };
}

export async function closePosition(deps: Deps, input: CloseInput): Promise<CloseResult> {
  return deps.coordinator.write(['positions', 'ledger', 'operations', 'activity', 'metadata'], async (tx) => {
    const previous = await operationsRepo.get(tx, input.operationId);
    if (previous) return replayResult<CloseResult>(previous.kind, 'close', previous.resultSnapshot);

    const meta = await requireMeta(tx);
    if (meta.simOffsetMs !== input.expectedOffsetMs) throw new DomainError('stale-time', STALE_TIME_MESSAGE);
    const asOf = captureAsOf(deps, meta);

    const position = await positionsRepo.get(tx, input.positionId);
    if (!position) {
      throw new DomainError('not-found', 'Posisi tidak ditemukan; mungkin data direset di tab lain.');
    }
    if (position.status !== 'active') {
      throw new DomainError(
        'invalid-transition',
        position.status === 'closed' ? 'Posisi ini sudah ditutup.' : 'Hanya posisi aktif yang bisa ditutup.',
      );
    }

    const actual = closePreviewAt(position, asOf);
    if (actual.elapsedDays !== input.preview.elapsedDays || actual.rewardUnits !== input.preview.rewardUnits) {
      throw new DomainError('stale-time', STALE_TIME_MESSAGE);
    }

    const principal = BigInt(position.principalUnits);
    const result: CloseResult = {
      positionId: position.id,
      assetId: position.assetId,
      principalUnits: position.principalUnits,
      rewardUnits: actual.rewardUnits,
      elapsedDays: actual.elapsedDays,
      closedAtMs: asOf,
      replayed: false,
    };
    await ledgerRepo.add(tx, {
      id: newId('ledger'),
      operationId: input.operationId,
      assetId: position.assetId,
      positionId: position.id,
      kind: 'return',
      deltaUnits: principal.toString(),
      createdAtMs: asOf,
    });
    await ledgerRepo.add(tx, {
      id: newId('ledger'),
      operationId: input.operationId,
      assetId: position.assetId,
      positionId: position.id,
      kind: 'reward',
      deltaUnits: actual.rewardUnits,
      createdAtMs: asOf,
    });
    await positionsRepo.put(tx, {
      ...position,
      status: 'closed',
      closedAtMs: asOf,
      elapsedDaysSnapshot: actual.elapsedDays,
      rewardUnitsSnapshot: actual.rewardUnits,
      updatedAtMs: asOf,
    });
    await operationsRepo.add(tx, {
      operationId: input.operationId,
      kind: 'close',
      positionId: position.id,
      resultSnapshot: { ...result, replayed: false },
      createdAtMs: asOf,
    });
    await activityRepo.add(tx, {
      id: newId('activity'),
      operationId: input.operationId,
      positionId: position.id,
      kind: 'close',
      payload: {
        assetId: position.assetId,
        amountUnits: position.principalUnits,
        rewardUnits: actual.rewardUnits,
        elapsedDays: actual.elapsedDays,
      },
      createdAtMs: asOf,
    });
    await metadataRepo.put(tx, { ...meta, lastCommittedSimMs: asOf });
    return result;
  });
}

// ---------------------------------------------------------------------------
// Time machine
// ---------------------------------------------------------------------------

export interface AdvanceTimeInput {
  operationId: string;
  days: number;
  expectedOffsetMs: number;
}

export interface AdvanceTimeResult {
  previousOffsetMs: number;
  newOffsetMs: number;
  asOfMs: number;
  replayed: boolean;
}

/** Compare-and-set on simOffsetMs: N days are added to the offset, never subtracted. */
export async function advanceTime(deps: Deps, input: AdvanceTimeInput): Promise<AdvanceTimeResult> {
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_ADVANCE_DAYS) {
    throw new DomainError('validation', `Majukan 1–${MAX_ADVANCE_DAYS} hari.`, 'days');
  }
  return deps.coordinator.write(['metadata', 'operations', 'activity'], async (tx) => {
    const previous = await operationsRepo.get(tx, input.operationId);
    if (previous) return replayResult<AdvanceTimeResult>(previous.kind, 'time-advance', previous.resultSnapshot);

    const meta = await requireMeta(tx);
    if (meta.simOffsetMs !== input.expectedOffsetMs) throw new DomainError('stale-time', STALE_TIME_MESSAGE);

    const newOffsetMs = meta.simOffsetMs + input.days * DAY_MS;
    const asOf = effectiveSimNow(deps.realNow(), newOffsetMs, meta.lastCommittedSimMs);
    const result: AdvanceTimeResult = { previousOffsetMs: meta.simOffsetMs, newOffsetMs, asOfMs: asOf, replayed: false };

    await metadataRepo.put(tx, { ...meta, simOffsetMs: newOffsetMs, lastCommittedSimMs: asOf, timeTravelAcknowledged: true });
    await operationsRepo.add(tx, {
      operationId: input.operationId,
      kind: 'time-advance',
      resultSnapshot: { ...result, replayed: false },
      createdAtMs: asOf,
    });
    await activityRepo.add(tx, {
      id: newId('activity'),
      operationId: input.operationId,
      kind: 'time-advance',
      payload: { days: input.days, previousOffsetMs: meta.simOffsetMs, newOffsetMs },
      createdAtMs: asOf,
    });
    return result;
  });
}

// ---------------------------------------------------------------------------
// Watchlist and reset
// ---------------------------------------------------------------------------

/** Adds or removes an asset from the watchlist; returns the new state. */
export async function toggleWatchlist(deps: Deps, assetId: string): Promise<boolean> {
  return deps.coordinator.write(['assets', 'watchlist'], async (tx) => {
    if (!(await assetsRepo.get(tx, assetId))) throw new DomainError('not-found', 'Aset tidak ditemukan.');
    if (await watchlistRepo.get(tx, assetId)) {
      await watchlistRepo.delete(tx, assetId);
      return false;
    }
    await watchlistRepo.put(tx, { assetId, addedAtMs: deps.realNow() });
    return true;
  });
}

/** Clears every store and re-seeds stake-v1 in one transaction; simulated time returns to real time. */
export async function resetDemo(deps: Deps): Promise<Meta> {
  return deps.coordinator.write(ALL_STORES, async (tx: WriteTx) => {
    await Promise.all([
      assetsRepo.clear(tx),
      providersRepo.clear(tx),
      watchlistRepo.clear(tx),
      positionsRepo.clear(tx),
      ledgerRepo.clear(tx),
      operationsRepo.clear(tx),
      activityRepo.clear(tx),
      metadataRepo.clear(tx),
    ]);
    return seedFixture(tx, deps.realNow());
  });
}

function replayResult<T extends { replayed: boolean }>(
  storedKind: string,
  expectedKind: string,
  snapshot: Record<string, string | number | boolean>,
): T {
  if (storedKind !== expectedKind) {
    throw new DomainError('validation', 'Operation ID sudah dipakai untuk aksi lain.');
  }
  return { ...(snapshot as unknown as T), replayed: true };
}
