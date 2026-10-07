import { DAY_MS } from './constants';
import { maturityMs } from './reward';

/**
 * Simulated "now" used by every mutation and display:
 * max(lastCommittedSimMs, realNow + simOffset). Monotonic even if the device clock moves back.
 */
export function effectiveSimNow(realNowMs: number, simOffsetMs: number, lastCommittedSimMs: number): number {
  return Math.max(lastCommittedSimMs, realNowMs + simOffsetMs);
}

export function offsetDays(simOffsetMs: number): number {
  return Math.floor(simOffsetMs / DAY_MS);
}

/**
 * Whole days to advance so the position reaches maturity (prefills "Majukan N hari").
 * 0 means already matured.
 */
export function daysToMaturity(activatedAtMs: number, durationDays: number, asOfMs: number): number {
  const remaining = maturityMs(activatedAtMs, durationDays) - asOfMs;
  return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}
