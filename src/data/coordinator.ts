import type { RavaDb, ReadTx, StoreName, WriteTx } from './db';
import { toDomainError } from './errors';

/**
 * The only place (besides db.ts upgrades) allowed to call db.transaction().
 * Repositories receive the transaction handle; a use case = one transaction.
 * If the callback throws, the transaction is aborted so nothing is partially written.
 */
export class TransactionCoordinator {
  readonly db: RavaDb;

  constructor(db: RavaDb) {
    this.db = db;
  }

  async write<T>(stores: StoreName[], work: (tx: WriteTx) => Promise<T>): Promise<T> {
    let tx: WriteTx;
    try {
      tx = this.db.transaction(stores, 'readwrite', { durability: 'strict' });
    } catch (error) {
      throw toDomainError(error);
    }
    try {
      const result = await work(tx);
      await tx.done;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // Already committed or aborted by the browser.
      }
      await tx.done.catch(() => undefined);
      throw toDomainError(error);
    }
  }

  async read<T>(stores: StoreName[], work: (tx: ReadTx) => Promise<T>): Promise<T> {
    try {
      const tx = this.db.transaction(stores, 'readonly');
      const result = await work(tx);
      await tx.done;
      return result;
    } catch (error) {
      throw toDomainError(error);
    }
  }
}
