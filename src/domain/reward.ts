import { DAY_MS, REWARD_DIVISOR, SCALE } from './constants';

/** Simple interest, floored: floor(principal × aprBps × days / 3,650,000). Never negative. */
export function rewardUnits(principalUnits: bigint, aprBps: number, days: number): bigint {
  if (principalUnits <= 0n || aprBps <= 0 || days <= 0) return 0n;
  return (principalUnits * BigInt(aprBps) * BigInt(days)) / REWARD_DIVISOR;
}

/** Full days since activation, capped at the duration; a clock that moved backwards gives 0. */
export function elapsedDays(activatedAtMs: number, asOfMs: number, durationDays: number): number {
  const raw = Math.floor((asOfMs - activatedAtMs) / DAY_MS);
  return Math.min(durationDays, Math.max(0, raw));
}

export function maturityMs(activatedAtMs: number, durationDays: number): number {
  return activatedAtMs + durationDays * DAY_MS;
}

/** floor(units × priceUsdCents / SCALE) for non-negative units. */
export function usdCents(units: bigint, priceUsdCents: number): bigint {
  if (units <= 0n) return 0n;
  return (units * BigInt(priceUsdCents)) / SCALE;
}
