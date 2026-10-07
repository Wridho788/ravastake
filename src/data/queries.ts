import { usdCents } from '../domain/reward';
import { effectiveSimNow } from '../domain/time';
import type { ActivityRecord, Asset, LedgerEntry, Meta, Position, Provider } from '../domain/types';
import { ALL_STORES } from './db';
import { DomainError } from './errors';
import { activityRepo, assetsRepo, ledgerRepo, metadataRepo, positionsRepo, providersRepo, watchlistRepo } from './repositories';
import { closePreviewAt, type Deps } from './useCases';

export interface AssetView {
  asset: Asset;
  provider: Provider;
  watched: boolean;
  /** Σ ledger deltas for the asset. */
  availableUnits: bigint;
  /** Σ principal of active positions (= −Σ reserve entries of active positions). */
  activePrincipalUnits: bigint;
  /** Derived estimate, not part of the available balance. */
  estimatedRewardUnits: bigint;
  /** Derived: (available + active principal) × fixture price. */
  holdingsUsdCents: bigint;
}

export interface PositionView {
  position: Position;
  asset: Asset;
  /** Derived for active positions at the snapshot's simulated time. */
  elapsedDays: number;
  rewardUnits: bigint;
}

export interface Snapshot {
  meta: Meta;
  /** Simulated "now" used for every derived number in this snapshot. */
  simNowMs: number;
  assets: AssetView[];
  positions: PositionView[];
  activity: ActivityRecord[];
  totalUsdCents: bigint;
}

/** Reads everything the UI needs in one read-only transaction, so all numbers are mutually consistent. */
export async function loadSnapshot(deps: Deps): Promise<Snapshot> {
  return deps.coordinator.read(ALL_STORES, async (tx) => {
    const [meta, assets, providers, watchlist, positions, ledger, activity] = await Promise.all([
      metadataRepo.get(tx),
      assetsRepo.listAll(tx),
      providersRepo.listAll(tx),
      watchlistRepo.listAll(tx),
      positionsRepo.listAll(tx),
      ledgerRepo.listAll(tx),
      activityRepo.listAll(tx),
    ]);
    if (!meta) throw new DomainError('unsupported-schema', 'Metadata demo tidak ditemukan.');
    const simNowMs = effectiveSimNow(deps.realNow(), meta.simOffsetMs, meta.lastCommittedSimMs);
    const assetById = new Map(assets.map((a) => [a.id, a]));
    const watched = new Set(watchlist.map((w) => w.assetId));

    const positionViews: PositionView[] = positions
      .map((position) => {
        const asset = assetById.get(position.assetId);
        if (!asset) return undefined;
        if (position.status === 'active') {
          const preview = closePreviewAt(position, simNowMs);
          return { position, asset, elapsedDays: preview.elapsedDays, rewardUnits: BigInt(preview.rewardUnits) };
        }
        if (position.status === 'closed') {
          return {
            position,
            asset,
            elapsedDays: position.elapsedDaysSnapshot ?? 0,
            rewardUnits: BigInt(position.rewardUnitsSnapshot ?? '0'),
          };
        }
        return { position, asset, elapsedDays: 0, rewardUnits: 0n };
      })
      .filter((v): v is PositionView => v !== undefined)
      .sort((a, b) => b.position.updatedAtMs - a.position.updatedAtMs);

    const assetViews: AssetView[] = assets
      .map((asset) => {
        const provider = providers.find((p) => p.assetId === asset.id);
        if (!provider) return undefined;
        const availableUnits = sumDeltas(ledger.filter((e) => e.assetId === asset.id));
        const active = positionViews.filter((v) => v.asset.id === asset.id && v.position.status === 'active');
        const activePrincipalUnits = active.reduce((sum, v) => sum + BigInt(v.position.principalUnits), 0n);
        const estimatedRewardUnits = active.reduce((sum, v) => sum + v.rewardUnits, 0n);
        return {
          asset,
          provider,
          watched: watched.has(asset.id),
          availableUnits,
          activePrincipalUnits,
          estimatedRewardUnits,
          holdingsUsdCents: usdCents(availableUnits + activePrincipalUnits, asset.priceUsdCents),
        };
      })
      .filter((v): v is AssetView => v !== undefined)
      .sort((a, b) => b.asset.priceUsdCents - a.asset.priceUsdCents);

    return {
      meta,
      simNowMs,
      assets: assetViews,
      positions: positionViews,
      activity,
      totalUsdCents: assetViews.reduce((sum, v) => sum + v.holdingsUsdCents, 0n),
    };
  });
}

export function sumDeltas(entries: LedgerEntry[]): bigint {
  return entries.reduce((sum, e) => sum + BigInt(e.deltaUnits), 0n);
}

// ---------------------------------------------------------------------------
// Ledger X-ray (STK-15)
// ---------------------------------------------------------------------------

export interface XrayResult {
  entries: LedgerEntry[];
  /** Raw total that must equal the number on screen. */
  totalUnits: bigint;
}

/** Saldo tersedia aset A = Σ deltaUnits of every ledger entry for A. */
export async function xrayAvailable(deps: Deps, assetId: string): Promise<XrayResult> {
  return deps.coordinator.read(['ledger'], async (tx) => {
    const entries = sortEntries(await ledgerRepo.listByAsset(tx, assetId));
    return { entries, totalUnits: sumDeltas(entries) };
  });
}

/** Principal aktif aset A = −Σ reserve entries of positions that are still active. */
export async function xrayActivePrincipal(deps: Deps, assetId: string): Promise<XrayResult> {
  return deps.coordinator.read(['ledger', 'positions'], async (tx) => {
    const active = new Set((await positionsRepo.listByStatus(tx, 'active')).map((p) => p.id));
    const entries = sortEntries(
      (await ledgerRepo.listByAsset(tx, assetId)).filter(
        (e) => e.kind === 'reserve' && e.positionId !== undefined && active.has(e.positionId),
      ),
    );
    return { entries, totalUnits: -sumDeltas(entries) };
  });
}

export interface PositionXray {
  entries: LedgerEntry[];
  /** −Σ reserve (same sign convention for active and closed). */
  principalUnits: bigint;
  /** Σ return entries (closed only). */
  returnedUnits: bigint;
  /** Σ reward entries (closed only). */
  rewardUnits: bigint;
}

export async function xrayPosition(deps: Deps, positionId: string): Promise<PositionXray> {
  return deps.coordinator.read(['ledger'], async (tx) => {
    const entries = sortEntries(await ledgerRepo.listByPosition(tx, positionId));
    const of = (kind: LedgerEntry['kind']) => sumDeltas(entries.filter((e) => e.kind === kind));
    return { entries, principalUnits: -of('reserve'), returnedUnits: of('return'), rewardUnits: of('reward') };
  });
}

const KIND_ORDER: Record<LedgerEntry['kind'], number> = { seed: 0, reserve: 1, return: 2, reward: 3 };

/** Chronological; entries of one operation share a timestamp, so kind order breaks ties deterministically. */
function sortEntries(entries: LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort(
    (a, b) => a.createdAtMs - b.createdAtMs || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id),
  );
}
