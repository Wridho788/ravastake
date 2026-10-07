# Development — RavaStake

## Status dan sumber acuan

[Milestones](MILESTONES.md) menyimpan status; [PRD](PRD.md), [TRD](TRD.md), [Architecture](ARCHITECTURE.md), dan [Data model](DATA_MODEL.md) menjadi kontrak implementasi. Script di bawah adalah kontrak; status run nyata (pass/fail/unverified) tercatat di `docs/VERIFICATION.md`.

## Prasyarat

- Node 22 atau lebih baru (`engines.node >= 22`), npm 10+.
- Browser Playwright 1.63 (Chromium build 1243). Cek dulu `%LOCALAPPDATA%\ms-playwright`; unduh hanya kalau belum ada: `npx playwright install chromium`.

## Menjalankan

```bash
npm install
npm run dev            # http://127.0.0.1:5173
```

## Struktur

```text
src/
  app/            # router, layout, error boundary, badge & kontrol waktu, sync antar-tab
  features/       # dashboard, assets, calculator, positions, activity, settings
  domain/         # decimal, format, reward, time (pure, tanpa IndexedDB)
  data/           # db, coordinator, repositories/, useCases, queries, fixture, faults, errors
  shared/         # komponen UI, hooks
  testing/        # hook build e2e (tidak diimpor build production)
tests/
  integration/    # Vitest browser mode: IndexedDB di Chromium asli
  e2e/            # Playwright: build e2e
  production/     # Playwright: artifact production tanpa hook
docs/
```

Unit test berada di samping kode (`src/**/*.test.ts`).

## Peta fitur ke kode

Daftar fitur dan acceptance criteria ada di [PRD](PRD.md); jadwal dan status per fitur ada di [Milestones](MILESTONES.md#peta-fitur-ke-milestone).

| Fitur | Route | Lokasi kode | Bergantung pada | Tes utama |
|---|---|---|---|---|
| Dashboard | `/dashboard` | `features/dashboard` | Query saldo dari ledger dan posisi active; formula valuation/reward di `domain` | Unit valuation; E01 |
| Aset dan watchlist | `/assets` | `features/assets` | Fixture assets/providers/chart; store watchlist | Integration watchlist; E02, E03 |
| Kalkulator | `/calculator` | `features/calculator` | Formula reward dan parsing input di `domain`; tanpa repository | Unit reward/validasi; E04, E05 |
| Draft, aktivasi, posisi aktif, tutup | `/positions` | `features/positions` | TransactionCoordinator untuk positions, ledger, operations, activity, metadata | Integration idempotency/rollback/concurrency; E06–E14, E23 |
| Mesin waktu | toolbar, `/positions` | `app/TimeControls`, `data/useCases` | `domain/time`, metadata, BroadcastChannel | Unit time; integration CAS; E21 |
| Ledger X-ray | dashboard, `/positions` | `features/xray` | `data/queries` | E22 |
| Riwayat aktivitas | `/activity` | `features/activity` | Store activity read-only | E18 |
| Pengaturan dan reset demo | `/settings` | `features/settings` | Reset satu transaksi seluruh store; metadata schema/seed | Integration reset; E17 |
| Shell, navigasi, 404, recovery storage | semua | `app`, `shared` | Router, error boundary, design tokens, error contract TRD | E16, E19, E20 |

Fitur di luar MVP pada PRD (wallet, harga live, akun, on-chain, compounding, dan lainnya) tidak mendapat folder, route, atau tombol placeholder.

## Script

| Script | Peran |
|---|---|
| `dev` | Server pengembangan lokal (`127.0.0.1:5173`). |
| `typecheck` | TypeScript tanpa emit. |
| `lint` | ESLint untuk source, tes, dan config. |
| `test` | Unit test domain + tes statis (kontrak transaksi). |
| `test:integration` | Vitest browser mode: repository dan use case IndexedDB di Chromium asli. |
| `build` | Artifact statis produksi ke `dist/`. |
| `build:e2e` | Build mode `e2e` dengan hook tes ke `dist-e2e/`. |
| `preview` | Sajikan `dist/` secara lokal. |
| `test:e2e` | Playwright terhadap `dist-e2e/` (port 4180). |
| `test:production` | Playwright terhadap `dist/` (port 4181) tanpa hook, ditambah cek `dist/` bebas `__ravastakeTest`. |
| `check` | Menjalankan typecheck, lint, test, test:integration, test:e2e berurutan. |

## Implementasi bertahap

Mulai dari unit oracle pada DATA_MODEL lalu repository nyata, sebelum merangkai draft -> activation -> close. Gunakan BigInt untuk arithmetic, string integer untuk persistence, dan formatter domain yang sama untuk semua tampilan. Komponen tidak mengakses IndexedDB; mereka memanggil use case dan query. Sukses UI hanya sesudah transaction complete; error mempertahankan form dan data committed sebelumnya.

Use case menerima dependensi `{ coordinator, realNow }`, sehingga integration test bisa menyuntikkan jam tanpa hook. Snapshot `asOf` sekali per mutation; preview kalkulator tidak mengubah jam atau principal posisi. Perhitungan UI dan repository menggunakan fungsi domain yang sama, tetapi assertion tes memakai expected value independen dari fixture tertulis.

## Pengujian dan evidence

Lihat [E2E test plan](E2E_TEST_PLAN.md). Browser context baru mengisolasi setiap skenario. Reload test menggunakan context/database yang sama. Persistence antarproses browser memerlukan persistent profile khusus tes yang tidak dibersihkan sampai journey berakhir. Jangan menyentuh browser profile pengguna.

Lakukan fault injection pada repository IndexedDB asli lewat build e2e; jangan hanya melempar error dari komponen. Uji transaksi aborted, multi-tab writes, quota handling, dan reset. Production suite memastikan core alur tetap berjalan tanpa fixture/fault control terbuka.

Simpan log, screenshot desktop/tablet/mobile, trace gagal, browser/runtime version, seed/clock, source/build hash, serta command. Artefak runtime (`test-results/`, `playwright-report/`) diabaikan Git; pilih screenshot final untuk dokumentasi.

## CI

`.github/workflows/ci.yml` berjalan di setiap push dan pull request: `npm ci`, install Chromium Playwright, lalu typecheck, lint, unit, integration, `test:e2e`, `build`, dan `test:production`. Workflow aktif begitu repo ada di GitHub.

## Build dan deployment

Target Vercel (framework preset Vite, output `dist`). `vercel.json` me-rewrite semua path kecuali `/assets/` ke `index.html`, sehingga direct route bekerja dan aset yang hilang tetap 404. Tidak perlu API key/secret.

Sebelum publish: jalankan `npm run check`, `npm run build`, `npm run test:production`. Sesudah publish: buka URL publik pada context terisolasi, jalankan journey (`PLAYWRIGHT_BASE_URL=<url> npm run test:production`), catat URL dan artifact identity di VERIFICATION. Perubahan schema database harus mempertimbangkan compatibility sebelum rollback.

## Batas offline

Setelah app termuat, alur lokal dapat berjalan tanpa jaringan. Cold load/reload offline tidak dijanjikan karena tidak ada service worker pada MVP. Jangan menulis klaim offline penuh sebelum ada implementasi serta tesnya.
