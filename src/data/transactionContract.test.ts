import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test } from 'vitest';

// D7 / ARCHITECTURE "Kontrak transaksi": only the coordinator (and db.ts for upgrades)
// may start IndexedDB transactions. Repositories receive the handle instead.
const ALLOWED = new Set(['src/data/coordinator.ts', 'src/data/db.ts', 'src/data/transactionContract.test.ts']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test('hanya TransactionCoordinator dan db.ts yang memanggil .transaction(', () => {
  const offenders = walk('src')
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => relative('.', file).split(sep).join('/'))
    .filter((file) => !ALLOWED.has(file))
    .filter((file) => /\.transaction\s*\(/.test(readFileSync(file, 'utf8')));
  expect(offenders).toEqual([]);
});
