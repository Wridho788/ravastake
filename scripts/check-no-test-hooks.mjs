// Fails when the production artifact contains the e2e test hook.
// The hook (window.__ravastakeTest) must only exist in the `e2e` build mode.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const needle = '__ravastakeTest';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let files;
try {
  files = walk(root).filter((f) => /\.(js|html)$/.test(f));
} catch {
  console.error(`check-no-test-hooks: folder "${root}" tidak ada. Jalankan "npm run build" dulu.`);
  process.exit(1);
}

const leaks = files.filter((f) => readFileSync(f, 'utf8').includes(needle));
if (leaks.length > 0) {
  console.error(`check-no-test-hooks: hook tes ditemukan di artifact production:\n${leaks.join('\n')}`);
  process.exit(1);
}
console.log(`check-no-test-hooks: OK, ${files.length} file di ${root} bebas "${needle}".`);
