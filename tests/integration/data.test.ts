import { openDB } from 'idb';
import { afterEach, describe, expect, test } from 'vitest';
import { DAY_MS, SCALE } from '../../src/domain/constants';
import { TransactionCoordinator } from '../../src/data/coordinator';
import { openRavaDb, type RavaDb } from '../../src/data/db';
import { DomainError } from '../../src/data/errors';
import { armWriteFault, clearWriteFaults } from '../../src/data/faults';
import { loadSnapshot, xrayActivePrincipal, xrayAvailable, xrayPosition } from '../../src/data/queries';
import {
  activatePosition,
  advanceTime,
  closePosition,
  closePreviewAt,
  createDraft,
  deleteDraft,
  ensureSeeded,
  resetDemo,
  toggleWatchlist,
  updateDraft,
  type Deps,
} from '../../src/data/useCases';

const T0 = Date.UTC(2026, 9, 1);
const ONE = SCALE;
const opened: { db: RavaDb; name: string }[] = [];

interface Harness {
  name: string;
  deps: Deps;
  clock: { now: number };
  /** A second connection to the same database, as another tab would have. */
  secondTab(): Promise<Deps>;
}

async function setup(startMs = T0): Promise<Harness> {
  const name = `ravastake-test-${crypto.randomUUID()}`;
  const clock = { now: startMs };
  const db = await openRavaDb(name);
  opened.push({ db, name });
  const deps: Deps = { coordinator: new TransactionCoordinator(db), realNow: () => clock.now };
  await ensureSeeded(deps);
  return {
    name,
    deps,
    clock,
    async secondTab() {
      const db2 = await openRavaDb(name);
      opened.push({ db: db2, name });
      return { coordinator: new TransactionCoordinator(db2), realNow: () => clock.now };
    },
  };
}

afterEach(async () => {
  clearWriteFaults();
  for (const { db } of opened) db.close();
  await Promise.all([...new Set(opened.map((o) => o.name))].map((name) => indexedDB.deleteDatabase(name)));
  opened.length = 0;
});

async function view(deps: Deps, assetId: string) {
  const snap = await loadSnapshot(deps);
  const asset = snap.assets.find((a) => a.asset.id === assetId);
  if (!asset) throw new Error(`asset ${assetId} missing`);
  return { snap, asset };
}

async function counts(deps: Deps) {
  return deps.coordinator.read(['ledger', 'activity', 'operations'], async (tx) => ({
    ledger: (await tx.objectStore('ledger').getAll()).length,
    activity: (await tx.objectStore('activity').getAll()).length,
    operations: (await tx.objectStore('operations').getAll()).length,
  }));
}

async function draft(deps: Deps, principal: string, duration = '365', assetId = 'ETH') {
  return createDraft(deps, { assetId, principalInput: principal, durationInput: duration, note: '' });
}

async function activate(deps: Deps, positionId: string, operationId = crypto.randomUUID()) {
  const snap = await loadSnapshot(deps);
  const pos = snap.positions.find((p) => p.position.id === positionId);
  if (!pos) throw new Error('position missing');
  const provider = snap.assets.find((a) => a.asset.id === pos.asset.id)?.provider;
  return activatePosition(deps, {
    operationId,
    positionId,
    expectedOffsetMs: snap.meta.simOffsetMs,
    preview: { principalUnits: pos.position.principalUnits, aprBps: provider?.aprBps ?? 0 },
  });
}

async function close(deps: Deps, positionId: string, operationId = crypto.randomUUID()) {
  const snap = await loadSnapshot(deps);
  const pos = snap.positions.find((p) => p.position.id === positionId);
  if (!pos) throw new Error('position missing');
  return closePosition(deps, {
    operationId,
    positionId,
    expectedOffsetMs: snap.meta.simOffsetMs,
    preview: closePreviewAt(pos.position, snap.simNowMs),
  });
}

async function advance(deps: Deps, days: number, operationId = crypto.randomUUID()) {
  const snap = await loadSnapshot(deps);
  return advanceTime(deps, { operationId, days, expectedOffsetMs: snap.meta.simOffsetMs });
}

async function expectCode(promise: Promise<unknown>, code: DomainError['code']) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
}

describe('seed stake-v1', () => {
  test('saldo awal sesuai fixture dan seed tidak diulang (E01)', async () => {
    const h = await setup();
    await ensureSeeded(h.deps);
    const snap = await loadSnapshot(h.deps);
    const by = (id: string) => snap.assets.find((a) => a.asset.id === id);
    expect(by('ETH')?.availableUnits).toBe(2n * ONE);
    expect(by('SOL')?.availableUnits).toBe(40n * ONE);
    expect(by('SOL')?.activePrincipalUnits).toBe(10n * ONE);
    expect(by('AVAX')?.availableUnits).toBe(100n * ONE);
    // Oracle 7: seed SOL reward at T0.
    expect(by('SOL')?.estimatedRewardUnits).toBe(5_753_424n);
    expect(await counts(h.deps)).toEqual({ ledger: 4, activity: 1, operations: 2 });
    expect(snap.meta.simOffsetMs).toBe(0);
    for (const a of snap.assets) {
      expect(a.asset.chart30d.at(-1)).toBe(a.asset.priceUsdCents);
      expect(a.asset.chart7d).toEqual(a.asset.chart30d.slice(-7));
    }
  });

  test('metadata dengan schema masa depan ditolak tanpa reset (unsupported-schema)', async () => {
    const h = await setup();
    await h.deps.coordinator.write(['metadata'], async (tx) => {
      const meta = await tx.objectStore('metadata').get('meta');
      await tx.objectStore('metadata').put({ ...meta!, schemaVersion: 2 as unknown as 1 });
    });
    await expectCode(ensureSeeded(h.deps), 'unsupported-schema');
    expect((await counts(h.deps)).ledger).toBe(4);
  });

  test('database versi lebih baru dipetakan ke unsupported-schema', async () => {
    const name = `ravastake-test-${crypto.randomUUID()}`;
    const future = await openDB(name, 5, { upgrade: (db) => db.createObjectStore('x') });
    future.close();
    opened.push({ db: { close() {} } as RavaDb, name });
    await expectCode(openRavaDb(name), 'unsupported-schema');
  });
});

describe('draft, aktivasi, tutup (oracle 1-5)', () => {
  test('draft tidak mengubah saldo; edit dan hapus hanya untuk draft (E06)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    expect((await view(h.deps, 'ETH')).asset.availableUnits).toBe(2n * ONE);
    const edited = await updateDraft(h.deps, d.id, { assetId: 'ETH', principalInput: '1,5', durationInput: '30', note: ' catatan ' });
    expect(edited.principalUnits).toBe((150_000_000n).toString());
    expect(edited.note).toBe('catatan');
    await deleteDraft(h.deps, d.id);
    expect((await loadSnapshot(h.deps)).positions.some((p) => p.position.id === d.id)).toBe(false);
    await expectCode(deleteDraft(h.deps, 'position-sol-seed'), 'invalid-transition');
  });

  test('validasi draft per field (E05)', async () => {
    const h = await setup();
    for (const [principal, duration, field] of [
      ['-1', '365', 'principal'],
      ['0', '365', 'principal'],
      ['1,123456789', '365', 'principal'],
      ['1e3', '365', 'principal'],
      ['1', '0', 'duration'],
      ['1', '366', 'duration'],
    ] as const) {
      const error = await draft(h.deps, principal, duration).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).field).toBe(field);
    }
    const tooLong = await createDraft(h.deps, { assetId: 'ETH', principalInput: '1', durationInput: '1', note: 'x'.repeat(201) }).catch((e: unknown) => e);
    expect((tooLong as DomainError).field).toBe('note');
    expect((await loadSnapshot(h.deps)).positions).toHaveLength(1);
  });

  test('aktivasi T0, maju 73 hari, tutup: saldo 2,01 ETH (E07, E10, oracle 2-5)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    const activated = await activate(h.deps, d.id);
    expect(activated.activatedAtMs).toBe(T0);
    let eth = (await view(h.deps, 'ETH')).asset;
    expect(eth.availableUnits).toBe(1n * ONE);
    expect(eth.activePrincipalUnits).toBe(1n * ONE);

    await advance(h.deps, 73);
    eth = (await view(h.deps, 'ETH')).asset;
    expect(eth.estimatedRewardUnits).toBe(1_000_000n);

    const closed = await close(h.deps, d.id);
    expect(closed).toMatchObject({ rewardUnits: '1000000', elapsedDays: 73, closedAtMs: T0 + 73 * DAY_MS });
    const after = await view(h.deps, 'ETH');
    expect(after.asset.availableUnits).toBe(201_000_000n);
    expect(after.asset.activePrincipalUnits).toBe(0n);

    // Oracle 4: closed snapshot does not move when time advances again.
    await advance(h.deps, 30);
    const closedView = (await loadSnapshot(h.deps)).positions.find((p) => p.position.id === d.id);
    expect(closedView?.rewardUnits).toBe(1_000_000n);

    // Oracle 5: closing again changes nothing.
    const before = await counts(h.deps);
    await expectCode(close(h.deps, d.id), 'invalid-transition');
    expect(await counts(h.deps)).toEqual(before);
    expect((await view(h.deps, 'ETH')).asset.availableUnits).toBe(201_000_000n);
  });

  test('saldo kurang ditolak tanpa tulisan (E08)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '3');
    const before = await counts(h.deps);
    await expectCode(activate(h.deps, d.id), 'insufficient-balance');
    expect(await counts(h.deps)).toEqual(before);
    expect((await loadSnapshot(h.deps)).positions.find((p) => p.position.id === d.id)?.position.status).toBe('draft');
  });

  test('replay operation ID yang sama mengembalikan hasil lama sebagai sukses (E09)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    const opId = crypto.randomUUID();
    const first = await activate(h.deps, d.id, opId);
    const replay = await activatePosition(h.deps, {
      operationId: opId,
      positionId: d.id,
      expectedOffsetMs: 999,
      preview: { principalUnits: 'ignored', aprBps: 0 },
    });
    expect(replay).toEqual({ ...first, replayed: true });
    expect((await view(h.deps, 'ETH')).asset.availableUnits).toBe(1n * ONE);
    expect((await counts(h.deps)).ledger).toBe(5);
  });

  test('reward dibatasi durasi (E12)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1', '73');
    await activate(h.deps, d.id);
    await advance(h.deps, 100);
    expect((await view(h.deps, 'ETH')).asset.estimatedRewardUnits).toBe(1_000_000n);
  });

  test('jam perangkat mundur: elapsed 0 dan timestamp tidak mundur (E12)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    h.clock.now = T0 - 2 * DAY_MS;
    const activated = await activate(h.deps, d.id);
    expect(activated.activatedAtMs).toBe(T0);
    expect((await view(h.deps, 'ETH')).asset.estimatedRewardUnits).toBe(0n);
  });
});

describe('konkurensi dua tab', () => {
  test('dua draft 1,5 ETH diaktifkan bersamaan: tepat satu sukses (E14, oracle 8)', async () => {
    const h = await setup();
    const tab2 = await h.secondTab();
    const a = await draft(h.deps, '1,5');
    const b = await draft(h.deps, '1,5');
    const results = await Promise.allSettled([activate(h.deps, a.id), activate(tab2, b.id)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect((rejected?.reason as DomainError).code).toBe('insufficient-balance');
    expect((await view(h.deps, 'ETH')).asset.availableUnits).toBe(50_000_000n);
  });

  test('dua tab memajukan +30 hari dari offset yang sama: satu sukses, offset +30 (E21b, oracle 10)', async () => {
    const h = await setup();
    const tab2 = await h.secondTab();
    const results = await Promise.allSettled([
      advanceTime(h.deps, { operationId: crypto.randomUUID(), days: 30, expectedOffsetMs: 0 }),
      advanceTime(tab2, { operationId: crypto.randomUUID(), days: 30, expectedOffsetMs: 0 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect((rejected?.reason as DomainError).code).toBe('stale-time');
    const meta = (await loadSnapshot(h.deps)).meta;
    expect(meta.simOffsetMs).toBe(30 * DAY_MS);
    expect(meta.timeTravelAcknowledged).toBe(true);
  });

  test('dialog tutup basi setelah waktu maju di tab lain ditolak (E21c)', async () => {
    const h = await setup();
    const tab2 = await h.secondTab();
    const d = await draft(h.deps, '1');
    await activate(h.deps, d.id);
    const stale = await loadSnapshot(h.deps);
    const pos = stale.positions.find((p) => p.position.id === d.id)!.position;
    await advance(tab2, 30);
    await expectCode(
      closePosition(h.deps, {
        operationId: crypto.randomUUID(),
        positionId: d.id,
        expectedOffsetMs: stale.meta.simOffsetMs,
        preview: closePreviewAt(pos, stale.simNowMs),
      }),
      'stale-time',
    );
  });

  test('batas hari terlewati saat dialog terbuka: commit ditolak (E21d)', async () => {
    const h = await setup(T0 + DAY_MS - 1000);
    const d = await draft(h.deps, '1');
    await activate(h.deps, d.id);
    await advance(h.deps, 10);
    const snap = await loadSnapshot(h.deps);
    const pos = snap.positions.find((p) => p.position.id === d.id)!.position;
    const preview = closePreviewAt(pos, snap.simNowMs);
    expect(preview.elapsedDays).toBe(10);
    h.clock.now += DAY_MS;
    await expectCode(
      closePosition(h.deps, { operationId: crypto.randomUUID(), positionId: d.id, expectedOffsetMs: snap.meta.simOffsetMs, preview }),
      'stale-time',
    );
  });

  test('draft berubah sejak dialog dibuka: stale-draft', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    await expectCode(
      activatePosition(h.deps, {
        operationId: crypto.randomUUID(),
        positionId: d.id,
        expectedOffsetMs: 0,
        preview: { principalUnits: (2n * ONE).toString(), aprBps: 500 },
      }),
      'stale-draft',
    );
  });
});

describe('fault injection, reset, watchlist, X-ray', () => {
  test('fault saat aktivasi: rollback utuh, retry satu hasil (E13)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    const before = await counts(h.deps);
    const opId = crypto.randomUUID();
    armWriteFault('activity');
    await expectCode(activate(h.deps, d.id, opId), 'write-failed');
    expect(await counts(h.deps)).toEqual(before);
    expect((await loadSnapshot(h.deps)).positions.find((p) => p.position.id === d.id)?.position.status).toBe('draft');
    expect((await view(h.deps, 'ETH')).asset.availableUnits).toBe(2n * ONE);

    await activate(h.deps, d.id, opId);
    const after = await counts(h.deps);
    expect(after.ledger).toBe(before.ledger + 1);
    expect(after.activity).toBe(before.activity + 1);
  });

  test('fault kuota saat tutup dipetakan ke quota tanpa tulisan parsial (E13, E16)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    await activate(h.deps, d.id);
    await advance(h.deps, 73);
    const before = await counts(h.deps);
    armWriteFault('positions', 'QuotaExceededError');
    await expectCode(close(h.deps, d.id), 'quota');
    expect(await counts(h.deps)).toEqual(before);
    expect((await view(h.deps, 'ETH')).asset.availableUnits).toBe(1n * ONE);
  });

  test('reset mengembalikan fixture dan waktu nyata (E17)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    await activate(h.deps, d.id);
    await advance(h.deps, 73);
    await toggleWatchlist(h.deps, 'ETH');
    h.clock.now = T0 + 5 * DAY_MS;
    await resetDemo(h.deps);
    const snap = await loadSnapshot(h.deps);
    expect(snap.meta).toMatchObject({ simOffsetMs: 0, lastCommittedSimMs: T0 + 5 * DAY_MS, timeTravelAcknowledged: false });
    expect(snap.positions.map((p) => p.position.id)).toEqual(['position-sol-seed']);
    expect(snap.assets.find((a) => a.asset.id === 'ETH')?.availableUnits).toBe(2n * ONE);
    expect(snap.assets.some((a) => a.watched)).toBe(false);
    expect(await counts(h.deps)).toEqual({ ledger: 4, activity: 1, operations: 2 });
  });

  test('watchlist tanpa duplikat (E03)', async () => {
    const h = await setup();
    expect(await toggleWatchlist(h.deps, 'ETH')).toBe(true);
    expect(await toggleWatchlist(h.deps, 'ETH')).toBe(false);
    expect(await toggleWatchlist(h.deps, 'ETH')).toBe(true);
    const snap = await loadSnapshot(h.deps);
    expect(snap.assets.filter((a) => a.watched).map((a) => a.asset.id)).toEqual(['ETH']);
    await expectCode(toggleWatchlist(h.deps, 'DOGE'), 'not-found');
  });

  test('X-ray: total sama dengan angka di dashboard dan detail posisi (E22)', async () => {
    const h = await setup();
    const d = await draft(h.deps, '1');
    await activate(h.deps, d.id);
    const active = await view(h.deps, 'ETH');
    expect((await xrayAvailable(h.deps, 'ETH')).totalUnits).toBe(active.asset.availableUnits);
    expect((await xrayActivePrincipal(h.deps, 'ETH')).totalUnits).toBe(active.asset.activePrincipalUnits);
    expect((await xrayActivePrincipal(h.deps, 'SOL')).totalUnits).toBe(10n * ONE);

    await advance(h.deps, 73);
    await close(h.deps, d.id);
    const closedX = await xrayPosition(h.deps, d.id);
    expect(closedX).toMatchObject({ principalUnits: ONE, returnedUnits: ONE, rewardUnits: 1_000_000n });
    expect(closedX.entries.map((e) => e.kind)).toEqual(['reserve', 'return', 'reward']);
    const after = await view(h.deps, 'ETH');
    expect((await xrayAvailable(h.deps, 'ETH')).totalUnits).toBe(after.asset.availableUnits);
    expect((await xrayActivePrincipal(h.deps, 'ETH')).totalUnits).toBe(0n);
  });
});
