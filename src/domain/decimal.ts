import { DECIMALS, MAX_APR_BPS, SCALE } from './constants';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const DECIMAL_RE = /^(\d+)(?:[.,](\d+))?$/;
const INT_RE = /^\d+$/;

export interface ParseUnitsOptions {
  allowZero?: boolean;
  maxUnits?: bigint;
  maxLabel?: string;
}

/**
 * Parses a user-entered amount into base units (8 decimals) without floats.
 * Accepts one decimal separator, either "," or "."; rejects signs, exponents,
 * thousand separators and excess fraction digits instead of silently truncating.
 */
export function parseUnits(input: string, options: ParseUnitsOptions = {}): ParseResult<bigint> {
  const s = input.trim();
  if (s === '') return { ok: false, message: 'Wajib diisi.' };
  if (/[eE]/.test(s)) return { ok: false, message: 'Notasi ilmiah tidak didukung.' };
  if (/^[-+]/.test(s)) return { ok: false, message: 'Masukkan jumlah positif tanpa tanda plus atau minus.' };
  const match = DECIMAL_RE.exec(s);
  if (!match) {
    return { ok: false, message: 'Format tidak valid. Gunakan angka dengan satu pemisah desimal, contoh: 1,5.' };
  }
  const intPart = match[1] ?? '0';
  const fracPart = match[2] ?? '';
  if (fracPart.length > DECIMALS) {
    return { ok: false, message: `Maksimal ${DECIMALS} angka di belakang koma.` };
  }
  const units = BigInt(intPart) * SCALE + BigInt(fracPart.padEnd(DECIMALS, '0') || '0');
  if (units === 0n && !options.allowZero) return { ok: false, message: 'Jumlah harus lebih dari 0.' };
  if (options.maxUnits !== undefined && units > options.maxUnits) {
    return { ok: false, message: options.maxLabel ?? 'Jumlah melebihi batas.' };
  }
  return { ok: true, value: units };
}

/** Canonical decimal string ("1.00410958", "-10", "0") from base units. */
export function unitsToDecimalString(units: bigint): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const intPart = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${intPart}${frac ? `.${frac}` : ''}`;
}

/** Decimal string for an input field ("1,5"), using the Indonesian decimal comma. */
export function unitsToInputString(units: bigint): string {
  return unitsToDecimalString(units).replace('.', ',');
}

/** "5" → 500, "5,25" → 525. Range 0–100%, at most 2 decimals. */
export function parsePercentToBps(input: string): ParseResult<number> {
  const s = input.trim();
  if (s === '') return { ok: false, message: 'Wajib diisi.' };
  if (/[eE]/.test(s)) return { ok: false, message: 'Notasi ilmiah tidak didukung.' };
  if (/^[-+]/.test(s)) return { ok: false, message: 'APR tidak boleh negatif atau bertanda.' };
  const match = DECIMAL_RE.exec(s);
  if (!match) return { ok: false, message: 'Format tidak valid, contoh: 5 atau 5,25.' };
  const fracPart = match[2] ?? '';
  if (fracPart.length > 2) return { ok: false, message: 'Maksimal 2 angka di belakang koma.' };
  const intPart = match[1] ?? '0';
  if (intPart.length > 3) return { ok: false, message: 'APR maksimal 100%.' };
  const bps = Number(intPart) * 100 + Number(fracPart.padEnd(2, '0') || '0');
  if (bps > MAX_APR_BPS) return { ok: false, message: 'APR maksimal 100%.' };
  return { ok: true, value: bps };
}

/** Whole number of days within [min, max]. */
export function parseWholeDays(input: string, min: number, max: number): ParseResult<number> {
  const s = input.trim();
  if (s === '') return { ok: false, message: 'Wajib diisi.' };
  if (!INT_RE.test(s)) return { ok: false, message: 'Masukkan bilangan bulat hari.' };
  const days = s.length > 4 ? Number.POSITIVE_INFINITY : Number(s);
  if (days < min || days > max) return { ok: false, message: `Rentang ${min}–${max} hari.` };
  return { ok: true, value: days };
}

/** Validates a stored canonical integer string such as principalUnits or deltaUnits. */
export function isCanonicalUnits(value: string, allowNegative = false): boolean {
  const re = allowNegative ? /^(0|-?[1-9]\d*)$/ : /^(0|[1-9]\d*)$/;
  return re.test(value);
}
