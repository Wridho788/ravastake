import { expect, test } from 'vitest';

test('integration smoke: IndexedDB tersedia di browser asli', async () => {
  expect(typeof indexedDB.open).toBe('function');
  const name = `smoke-${crypto.randomUUID()}`;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('s');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  expect(db.objectStoreNames.contains('s')).toBe(true);
  db.close();
  indexedDB.deleteDatabase(name);
});
