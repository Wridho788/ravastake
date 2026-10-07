import { LOCALE } from './constants';
import { unitsToDecimalString } from './decimal';

const unitFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 8 });
const usdFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

type NumericString = Intl.StringNumericLiteral;

/**
 * Exact formatting of base units: BigInt → canonical decimal string → Intl.
 * No conversion to Number, so no rounding (TRD "Formatter").
 */
export function formatUnits(units: bigint): string {
  return unitFormatter.format(unitsToDecimalString(units) as NumericString);
}

export function formatAmount(units: bigint, symbol: string): string {
  return `${formatUnits(units)} ${symbol}`;
}

export function formatUsdCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const str = `${negative ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
  return usdFormatter.format(str as NumericString);
}

export function formatBps(bps: number): string {
  const str = `${Math.trunc(bps / 100)}.${String(bps % 100).padStart(2, '0')}`;
  return `${percentFormatter.format(str as NumericString)}%`;
}

export function formatDate(ms: number): string {
  return dateFormatter.format(ms);
}

export function formatDateTime(ms: number): string {
  return dateTimeFormatter.format(ms);
}
