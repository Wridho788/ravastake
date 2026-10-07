/**
 * One repository per object store. Repositories never open transactions:
 * every function receives the handle from the TransactionCoordinator (D7).
 */
import type { ActivityRecord, Asset, LedgerEntry, Meta, OperationRecord, Position, PositionStatus, Provider } from '../../domain/types';
import type { ReadTx, WatchlistEntry, WriteTx } from '../db';
import { maybeFail } from '../faults';

export const assetsRepo = {
  listAll: (tx: ReadTx): Promise<Asset[]> => tx.objectStore('assets').getAll(),
  get: (tx: ReadTx, id: string): Promise<Asset | undefined> => tx.objectStore('assets').get(id),
  async put(tx: WriteTx, asset: Asset): Promise<void> {
    maybeFail('assets');
    await tx.objectStore('assets').put(asset);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('assets').clear(),
};

export const providersRepo = {
  listAll: (tx: ReadTx): Promise<Provider[]> => tx.objectStore('providers').getAll(),
  get: (tx: ReadTx, id: string): Promise<Provider | undefined> => tx.objectStore('providers').get(id),
  listByAsset: (tx: ReadTx, assetId: string): Promise<Provider[]> =>
    tx.objectStore('providers').index('assetId').getAll(assetId),
  async put(tx: WriteTx, provider: Provider): Promise<void> {
    maybeFail('providers');
    await tx.objectStore('providers').put(provider);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('providers').clear(),
};

export const watchlistRepo = {
  listAll: (tx: ReadTx): Promise<WatchlistEntry[]> => tx.objectStore('watchlist').getAll(),
  get: (tx: ReadTx, assetId: string): Promise<WatchlistEntry | undefined> => tx.objectStore('watchlist').get(assetId),
  async put(tx: WriteTx, entry: WatchlistEntry): Promise<void> {
    maybeFail('watchlist');
    await tx.objectStore('watchlist').put(entry);
  },
  async delete(tx: WriteTx, assetId: string): Promise<void> {
    maybeFail('watchlist');
    await tx.objectStore('watchlist').delete(assetId);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('watchlist').clear(),
};

export const positionsRepo = {
  listAll: (tx: ReadTx): Promise<Position[]> => tx.objectStore('positions').getAll(),
  get: (tx: ReadTx, id: string): Promise<Position | undefined> => tx.objectStore('positions').get(id),
  listByStatus: (tx: ReadTx, status: PositionStatus): Promise<Position[]> =>
    tx.objectStore('positions').index('status').getAll(status),
  async put(tx: WriteTx, position: Position): Promise<void> {
    maybeFail('positions');
    await tx.objectStore('positions').put(position);
  },
  async delete(tx: WriteTx, id: string): Promise<void> {
    maybeFail('positions');
    await tx.objectStore('positions').delete(id);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('positions').clear(),
};

export const ledgerRepo = {
  listAll: (tx: ReadTx): Promise<LedgerEntry[]> => tx.objectStore('ledger').getAll(),
  listByAsset: (tx: ReadTx, assetId: string): Promise<LedgerEntry[]> =>
    tx.objectStore('ledger').index('assetId').getAll(assetId),
  listByPosition: (tx: ReadTx, positionId: string): Promise<LedgerEntry[]> =>
    tx.objectStore('ledger').index('positionId').getAll(positionId),
  async balanceByAsset(tx: ReadTx, assetId: string): Promise<bigint> {
    const entries = await ledgerRepo.listByAsset(tx, assetId);
    return entries.reduce((sum, entry) => sum + BigInt(entry.deltaUnits), 0n);
  },
  /** Ledger entries are immutable: add() fails on a duplicate id or (operationId, kind, assetId). */
  async add(tx: WriteTx, entry: LedgerEntry): Promise<void> {
    maybeFail('ledger');
    await tx.objectStore('ledger').add(entry);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('ledger').clear(),
};

export const operationsRepo = {
  get: (tx: ReadTx, operationId: string): Promise<OperationRecord | undefined> =>
    tx.objectStore('operations').get(operationId),
  listAll: (tx: ReadTx): Promise<OperationRecord[]> => tx.objectStore('operations').getAll(),
  async add(tx: WriteTx, record: OperationRecord): Promise<void> {
    maybeFail('operations');
    await tx.objectStore('operations').add(record);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('operations').clear(),
};

export const activityRepo = {
  /** Newest first. */
  async listAll(tx: ReadTx): Promise<ActivityRecord[]> {
    const records = await tx.objectStore('activity').index('createdAtMs').getAll();
    return records.reverse();
  },
  async add(tx: WriteTx, record: ActivityRecord): Promise<void> {
    maybeFail('activity');
    await tx.objectStore('activity').add(record);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('activity').clear(),
};

export const metadataRepo = {
  get: (tx: ReadTx): Promise<Meta | undefined> => tx.objectStore('metadata').get('meta'),
  async put(tx: WriteTx, meta: Meta): Promise<void> {
    maybeFail('metadata');
    await tx.objectStore('metadata').put(meta);
  },
  clear: (tx: WriteTx): Promise<void> => tx.objectStore('metadata').clear(),
};
