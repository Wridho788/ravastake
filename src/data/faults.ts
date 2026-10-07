import type { StoreName } from './db';
import { DomainError } from './errors';

/**
 * Fault injection point inside the real repositories (E2E_TEST_PLAN E13/E16).
 * Faults can only be armed by the e2e build hook or by integration tests;
 * in production nothing arms them, so maybeFail is a no-op.
 */
const armed = new Map<StoreName, string>();

export function armWriteFault(store: StoreName, errorName = 'WriteFault'): void {
  armed.set(store, errorName);
}

export function clearWriteFaults(): void {
  armed.clear();
}

export function maybeFail(store: StoreName): void {
  const errorName = armed.get(store);
  if (errorName === undefined) return;
  armed.delete(store);
  if (errorName === 'QuotaExceededError') {
    throw new DOMException('Simulated quota failure', 'QuotaExceededError');
  }
  throw new DomainError('write-failed', `Penulisan ke ${store} gagal; tidak ada perubahan yang disimpan.`);
}
