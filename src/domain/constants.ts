/** 8 decimal places: an app-level simulation rule, not a blockchain unit. */
export const DECIMALS = 8;
export const SCALE = 100_000_000n;
export const DAY_MS = 86_400_000;
/** Maximum principal per position: 1,000,000 asset units. */
export const MAX_PRINCIPAL_UNITS = 1_000_000n * SCALE;
export const MAX_APR_BPS = 10_000;
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 365;
export const MAX_ADVANCE_DAYS = 365;
export const MAX_NOTE_LENGTH = 200;
/** floor(principal × aprBps × days / (10000 × 365)) */
export const REWARD_DIVISOR = 3_650_000n;
export const LOCALE = 'id-ID';
