import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb';
import type {
  ActivityRecord,
  Asset,
  LedgerEntry,
  Meta,
  OperationRecord,
  Position,
  PositionStatus,
  Provider,
} from '../domain/types';
import { DomainError, toDomainError } from './errors';

export const DB_NAME = 'ravastake';
export const DB_VERSION = 1;

export interface WatchlistEntry {
  assetId: string;
  addedAtMs: number;
}

export interface RavaSchema extends DBSchema {
  assets: { key: string; value: Asset; indexes: { symbol: string } };
  providers: { key: string; value: Provider; indexes: { assetId: string } };
  watchlist: { key: string; value: WatchlistEntry };
  positions: { key: string; value: Position; indexes: { status: PositionStatus; assetId: string } };
  ledger: {
    key: string;
    value: LedgerEntry;
    indexes: { assetId: string; positionId: string; opKindAsset: [string, string, string] };
  };
  operations: { key: string; value: OperationRecord };
  activity: { key: string; value: ActivityRecord; indexes: { createdAtMs: number } };
  metadata: { key: string; value: Meta };
}

export type StoreName = StoreNames<RavaSchema>;
export type RavaDb = IDBPDatabase<RavaSchema>;
export type WriteTx = IDBPTransaction<RavaSchema, StoreName[], 'readwrite'>;
export type ReadTx = IDBPTransaction<RavaSchema, StoreName[], 'readonly'> | WriteTx;

export const ALL_STORES: StoreName[] = [
  'assets',
  'providers',
  'watchlist',
  'positions',
  'ledger',
  'operations',
  'activity',
  'metadata',
];

export interface OpenHandlers {
  /** Another tab wants to upgrade: this connection has been closed; ask the user to reload. */
  onVersionChange?: () => void;
  /** Our upgrade is blocked by an older connection in another tab. */
  onBlocked?: () => void;
}

/**
 * Opens (and on first run creates) the database. Only this module and the
 * TransactionCoordinator may start IndexedDB transactions (ARCHITECTURE "Kontrak transaksi").
 */
export async function openRavaDb(name: string = DB_NAME, handlers: OpenHandlers = {}): Promise<RavaDb> {
  if (typeof indexedDB === 'undefined') {
    throw new DomainError('storage-unavailable', 'Browser ini tidak menyediakan IndexedDB; data demo tidak bisa disimpan.');
  }
  try {
    const db = await openDB<RavaSchema>(name, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const assets = database.createObjectStore('assets', { keyPath: 'id' });
          assets.createIndex('symbol', 'symbol', { unique: true });
          const providers = database.createObjectStore('providers', { keyPath: 'id' });
          providers.createIndex('assetId', 'assetId');
          database.createObjectStore('watchlist', { keyPath: 'assetId' });
          const positions = database.createObjectStore('positions', { keyPath: 'id' });
          positions.createIndex('status', 'status');
          positions.createIndex('assetId', 'assetId');
          const ledger = database.createObjectStore('ledger', { keyPath: 'id' });
          ledger.createIndex('assetId', 'assetId');
          ledger.createIndex('positionId', 'positionId');
          ledger.createIndex('opKindAsset', ['operationId', 'kind', 'assetId'], { unique: true });
          database.createObjectStore('operations', { keyPath: 'operationId' });
          const activity = database.createObjectStore('activity', { keyPath: 'id' });
          activity.createIndex('createdAtMs', 'createdAtMs');
          database.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
      blocked() {
        handlers.onBlocked?.();
      },
      blocking() {
        db.close();
        handlers.onVersionChange?.();
      },
    });
    return db;
  } catch (error) {
    throw toDomainError(error);
  }
}
