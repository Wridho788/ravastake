import { describe, expect, test } from 'vitest';
import { DAY_MS, MAX_PRINCIPAL_UNITS } from './constants';
import { isCanonicalUnits, parsePercentToBps, parseUnits, parseWholeDays, unitsToDecimalString, unitsToInputString } from './decimal';
import { formatBps, formatUnits, formatUsdCents } from './format';
import { elapsedDays, rewardUnits, usdCents } from './reward';
import { daysToMaturity, effectiveSimNow, offsetDays } from './time';

const ONE_ETH = 100_000_000n;
const T0 = Date.UTC(2026, 9, 1);

describe('oracle numerik DATA_MODEL', () => {
  test('3: 1 ETH, 5%, 73 hari = 1.000.000 units (0,01 ETH)', () => {
    expect(rewardUnits(ONE_ETH, 500, 73)).toBe(1_000_000n);
  });
  test('6: kalkulator 1 ETH 5% 365 hari = 0,05; APR 0 = 0', () => {
    expect(rewardUnits(ONE_ETH, 500, 365)).toBe(5_000_000n);
    expect(rewardUnits(ONE_ETH, 0, 365)).toBe(0n);
  });
  test('7: seed SOL 10 SOL, 7%, 30 hari = 5.753.424 units (floor)', () => {
    expect(rewardUnits(10n * ONE_ETH, 700, 30)).toBe(5_753_424n);
  });
  test('9: 1 ETH, 5%, 30 hari = 410.958 units', () => {
    expect(rewardUnits(ONE_ETH, 500, 30)).toBe(410_958n);
  });
  test('reward tidak pernah negatif', () => {
    expect(rewardUnits(-ONE_ETH, 500, 30)).toBe(0n);
    expect(rewardUnits(ONE_ETH, 500, -3)).toBe(0n);
  });
});

describe('elapsedDays', () => {
  test.each([
    { label: 'tepat 73 hari', asOf: T0 + 73 * DAY_MS, duration: 365, expected: 73 },
    { label: 'kurang sedetik dari 73 hari', asOf: T0 + 73 * DAY_MS - 1000, duration: 365, expected: 72 },
    { label: 'dibatasi durasi (E12)', asOf: T0 + 100 * DAY_MS, duration: 73, expected: 73 },
    { label: 'jam mundur memberi 0', asOf: T0 - 5 * DAY_MS, duration: 365, expected: 0 },
    { label: 'hari yang sama', asOf: T0 + 5_000, duration: 365, expected: 0 },
  ])('$label', ({ asOf, duration, expected }) => {
    expect(elapsedDays(T0, asOf, duration)).toBe(expected);
  });
});

describe('waktu simulasi', () => {
  test('effectiveSimNow monoton terhadap jam yang mundur', () => {
    expect(effectiveSimNow(T0, 0, 0)).toBe(T0);
    expect(effectiveSimNow(T0, 73 * DAY_MS, 0)).toBe(T0 + 73 * DAY_MS);
    expect(effectiveSimNow(T0 - DAY_MS, 0, T0)).toBe(T0);
  });
  test('offsetDays', () => {
    expect(offsetDays(0)).toBe(0);
    expect(offsetDays(73 * DAY_MS)).toBe(73);
  });
  test('daysToMaturity membulatkan ke atas dan 0 saat jatuh tempo (D2)', () => {
    expect(daysToMaturity(T0, 73, T0)).toBe(73);
    expect(daysToMaturity(T0, 73, T0 + 1000)).toBe(73);
    expect(daysToMaturity(T0, 73, T0 + DAY_MS)).toBe(72);
    expect(daysToMaturity(T0, 73, T0 + 73 * DAY_MS)).toBe(0);
    // Advancing by the prefilled N always reaches maturity.
    const asOf = T0 + 3 * DAY_MS + 12345;
    const n = daysToMaturity(T0, 73, asOf);
    expect(elapsedDays(T0, asOf + n * DAY_MS, 73)).toBe(73);
  });
});

describe('parseUnits', () => {
  test.each([
    ['1', ONE_ETH],
    ['1,5', 150_000_000n],
    ['1.5', 150_000_000n],
    [' 2 ', 2n * ONE_ETH],
    ['0,00000001', 1n],
    ['007', 7n * ONE_ETH],
    ['1000000', MAX_PRINCIPAL_UNITS],
  ])('menerima %j', (input, expected) => {
    const result = parseUnits(input, { maxUnits: MAX_PRINCIPAL_UNITS });
    expect(result).toEqual({ ok: true, value: expected });
  });

  test.each([
    ['', 'Wajib diisi.'],
    ['-1', 'tanpa tanda'],
    ['+1', 'tanpa tanda'],
    ['1e3', 'Notasi ilmiah'],
    ['1,000,5', 'Format tidak valid'],
    ['1.000.000', 'Format tidak valid'],
    ['1 000', 'Format tidak valid'],
    ['.5', 'Format tidak valid'],
    ['5.', 'Format tidak valid'],
    ['abc', 'Format tidak valid'],
    ['NaN', 'Format tidak valid'],
    ['Infinity', 'Format tidak valid'],
    ['0', 'lebih dari 0'],
    ['0,000', 'lebih dari 0'],
    ['1,123456789', 'Maksimal 8'],
    ['1000000,00000001', 'Maksimal 1.000.000'],
  ])('menolak %j', (input, messagePart) => {
    const result = parseUnits(input, { maxUnits: MAX_PRINCIPAL_UNITS, maxLabel: 'Maksimal 1.000.000 per posisi.' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(messagePart);
  });

  test('allowZero untuk kalkulator yang mengizinkan nol', () => {
    expect(parseUnits('0', { allowZero: true })).toEqual({ ok: true, value: 0n });
  });
});

describe('parsePercentToBps dan parseWholeDays', () => {
  test.each([
    ['5', 500],
    ['5,25', 525],
    ['5.25', 525],
    ['0', 0],
    ['100', 10_000],
  ])('APR %j = %i bps', (input, bps) => {
    expect(parsePercentToBps(input)).toEqual({ ok: true, value: bps });
  });
  test.each(['100,01', '101', '5,255', '-1', '1e2', '', 'lima'])('APR menolak %j', (input) => {
    expect(parsePercentToBps(input).ok).toBe(false);
  });
  test.each([
    ['1', 1],
    ['73', 73],
    ['365', 365],
  ])('hari %j', (input, days) => {
    expect(parseWholeDays(input, 1, 365)).toEqual({ ok: true, value: days });
  });
  test.each(['0', '366', '1,5', '-3', '', '99999'])('hari menolak %j', (input) => {
    expect(parseWholeDays(input, 1, 365).ok).toBe(false);
  });
});

describe('format dan string kanonik', () => {
  test.each([
    [0n, '0'],
    [1n, '0.00000001'],
    [1_000_000n, '0.01'],
    [201_000_000n, '2.01'],
    [-1_000_000_000n, '-10'],
    [100_000_012_345_678n, '1000000.12345678'],
  ])('unitsToDecimalString(%s) = %s', (units, expected) => {
    expect(unitsToDecimalString(units)).toBe(expected);
  });

  test('unitsToInputString memakai koma', () => {
    expect(unitsToInputString(150_000_000n)).toBe('1,5');
  });

  test.each([
    [0n, '0'],
    [1_000_000n, '0,01'],
    [410_958n, '0,00410958'],
    [201_000_000n, '2,01'],
    [5_753_424n, '0,05753424'],
    [100_000_012_345_678n, '1.000.000,12345678'],
    [-1_000_000_000n, '-10'],
  ])('formatUnits(%s) persis tanpa pembulatan', (units, expected) => {
    expect(formatUnits(units)).toBe(expected);
  });

  test('USD dan persen', () => {
    // ICU versions differ on the space after the currency symbol; compare without whitespace.
    expect(formatUsdCents(usdCents(2n * ONE_ETH, 200_000)).replace(/\s/g, '')).toBe('US$4.000,00');
    expect(formatUsdCents(5n).replace(/\s/g, '')).toBe('US$0,05');
    expect(formatBps(500)).toBe('5%');
    expect(formatBps(525)).toBe('5,25%');
  });

  test('isCanonicalUnits', () => {
    expect(isCanonicalUnits('100000000')).toBe(true);
    expect(isCanonicalUnits('0')).toBe(true);
    expect(isCanonicalUnits('-1')).toBe(false);
    expect(isCanonicalUnits('-1', true)).toBe(true);
    expect(isCanonicalUnits('-0', true)).toBe(false);
    expect(isCanonicalUnits('01')).toBe(false);
    expect(isCanonicalUnits('1.5')).toBe(false);
  });
});
