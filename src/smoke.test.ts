import { expect, test } from 'vitest';

test('unit smoke: BigInt tersedia', () => {
  expect(10n ** 8n).toBe(100_000_000n);
});
