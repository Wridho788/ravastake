import { DAY_MS, SCALE } from '../domain/constants';
import type { Asset, Meta, Provider } from '../domain/types';
import type { WriteTx } from './db';
import { activityRepo, assetsRepo, ledgerRepo, metadataRepo, operationsRepo, positionsRepo, providersRepo } from './repositories';

export const SEED_VERSION = 'stake-v1' as const;
export const SCHEMA_VERSION = 1 as const;
export const SEED_GRANTS_OPERATION_ID = 'seed-stake-v1-grants';
export const SEED_SOL_OPERATION_ID = 'seed-stake-v1-sol';
export const SEED_SOL_POSITION_ID = 'position-sol-seed';

/**
 * Deterministic daily series ending exactly at `price` (integer cents, no randomness per render).
 * A small integer LCG walks backwards from the price in steps of at most ±3%.
 */
function syntheticSeries(price: number, points: number, seed: number): number[] {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state;
  };
  const values = new Array<number>(points);
  values[points - 1] = price;
  for (let i = points - 2; i >= 0; i -= 1) {
    const stepBps = (next() % 601) - 300;
    values[i] = Math.max(1, Math.round(((values[i + 1] ?? price) * (10_000 - stepBps)) / 10_000));
  }
  return values;
}

function asset(id: string, name: string, priceUsdCents: number, seed: number): Asset {
  const chart30d = syntheticSeries(priceUsdCents, 30, seed);
  return { id, symbol: id, name, priceUsdCents, chart30d, chart7d: chart30d.slice(-7) };
}

export const FIXTURE_ASSETS: Asset[] = [
  asset('ETH', 'Ethereum (demo)', 200_000, 11),
  asset('SOL', 'Solana (demo)', 10_000, 29),
  asset('AVAX', 'Avalanche (demo)', 2_500, 47),
];

export const FIXTURE_PROVIDERS: Provider[] = [
  { id: 'provider-eth-demo', name: 'Rava Node ETH (demo)', assetId: 'ETH', aprBps: 500 },
  { id: 'provider-sol-demo', name: 'Rava Node SOL (demo)', assetId: 'SOL', aprBps: 700 },
  { id: 'provider-avax-demo', name: 'Rava Node AVAX (demo)', assetId: 'AVAX', aprBps: 600 },
];

export const OPENING_GRANTS: Record<string, bigint> = {
  ETH: 2n * SCALE,
  SOL: 50n * SCALE,
  AVAX: 100n * SCALE,
};

export const SEED_SOL_PRINCIPAL = 10n * SCALE;
export const SEED_SOL_DURATION_DAYS = 90;
export const SEED_SOL_AGE_DAYS = 30;

/**
 * Writes fixture stake-v1 into an empty database inside the caller's transaction.
 * Positions are placed relative to `nowMs` (database creation or reset time).
 */
export async function seedFixture(tx: WriteTx, nowMs: number): Promise<Meta> {
  for (const a of FIXTURE_ASSETS) await assetsRepo.put(tx, a);
  for (const p of FIXTURE_PROVIDERS) await providersRepo.put(tx, p);

  for (const a of FIXTURE_ASSETS) {
    await ledgerRepo.add(tx, {
      id: `ledger-seed-${a.id}`,
      operationId: SEED_GRANTS_OPERATION_ID,
      assetId: a.id,
      kind: 'seed',
      deltaUnits: (OPENING_GRANTS[a.id] ?? 0n).toString(),
      createdAtMs: nowMs,
    });
  }
  await operationsRepo.add(tx, {
    operationId: SEED_GRANTS_OPERATION_ID,
    kind: 'seed',
    resultSnapshot: { seedVersion: SEED_VERSION },
    createdAtMs: nowMs,
  });

  const activatedAtMs = nowMs - SEED_SOL_AGE_DAYS * DAY_MS;
  await positionsRepo.put(tx, {
    id: SEED_SOL_POSITION_ID,
    assetId: 'SOL',
    providerId: 'provider-sol-demo',
    principalUnits: SEED_SOL_PRINCIPAL.toString(),
    durationDays: SEED_SOL_DURATION_DAYS,
    note: 'Posisi contoh dari fixture',
    status: 'active',
    createdAtMs: activatedAtMs,
    updatedAtMs: activatedAtMs,
    aprBpsSnapshot: 700,
    activatedAtMs,
  });
  await ledgerRepo.add(tx, {
    id: 'ledger-seed-sol-reserve',
    operationId: SEED_SOL_OPERATION_ID,
    assetId: 'SOL',
    positionId: SEED_SOL_POSITION_ID,
    kind: 'reserve',
    deltaUnits: (-SEED_SOL_PRINCIPAL).toString(),
    createdAtMs: activatedAtMs,
  });
  await operationsRepo.add(tx, {
    operationId: SEED_SOL_OPERATION_ID,
    kind: 'activate',
    positionId: SEED_SOL_POSITION_ID,
    resultSnapshot: {
      positionId: SEED_SOL_POSITION_ID,
      assetId: 'SOL',
      principalUnits: SEED_SOL_PRINCIPAL.toString(),
      aprBps: 700,
      activatedAtMs,
    },
    createdAtMs: activatedAtMs,
  });
  await activityRepo.add(tx, {
    id: 'activity-seed-sol',
    operationId: SEED_SOL_OPERATION_ID,
    positionId: SEED_SOL_POSITION_ID,
    kind: 'activate',
    payload: { assetId: 'SOL', amountUnits: SEED_SOL_PRINCIPAL.toString() },
    createdAtMs: activatedAtMs,
  });

  const meta: Meta = {
    key: 'meta',
    schemaVersion: SCHEMA_VERSION,
    seedVersion: SEED_VERSION,
    seededAtMs: nowMs,
    simOffsetMs: 0,
    lastCommittedSimMs: nowMs,
    timeTravelAcknowledged: false,
  };
  await metadataRepo.put(tx, meta);
  return meta;
}
