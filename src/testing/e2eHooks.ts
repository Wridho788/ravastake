// Only imported by main.tsx when the app is built with `--mode e2e`.
// Production builds never include this module (checked by scripts/check-no-test-hooks.mjs).
import { shiftRealClockBy, shiftRealClockTo } from '../data/clock';
import type { StoreName } from '../data/db';
import { armWriteFault, clearWriteFaults } from '../data/faults';

export interface RavastakeTestHook {
  ready: true;
  /** Moves the app's real clock to an absolute time (ms since epoch). */
  setNow(ms: number): void;
  /** Moves the app's real clock forward (or backward with a negative delta). */
  advanceNow(deltaMs: number): void;
  /** Makes the next write to `store` fail inside the real repository. */
  failNextWrite(store: StoreName, errorName?: string): void;
  clearFaults(): void;
}

export interface RavastakeTestConfig {
  /** Initial real time, applied before the database is seeded. */
  nowMs?: number;
}

declare global {
  interface Window {
    __ravastakeTest?: RavastakeTestHook;
    __ravastakeTestConfig?: RavastakeTestConfig;
  }
}

const config = window.__ravastakeTestConfig;
if (config?.nowMs !== undefined) shiftRealClockTo(config.nowMs);

window.__ravastakeTest = {
  ready: true,
  setNow: shiftRealClockTo,
  advanceNow: shiftRealClockBy,
  failNextWrite: (store, errorName) => armWriteFault(store, errorName),
  clearFaults: clearWriteFaults,
};
