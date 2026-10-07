# Development — RavaStake

## Status dan sumber acuan

Proyek saat ini hanya berisi Markdown. Tidak ada package.json, source aplikasi, atau flow Playwright yang dapat dijalankan. [Milestones](MILESTONES.md) menyimpan status; [PRD](PRD.md), [TRD](TRD.md), dan [Data model](DATA_MODEL.md) menjadi kontrak implementasi.

## Bootstrap saat pekerjaan dilanjutkan

1. Periksa instruksi direktori, file yang sudah ada, status Git jika tersedia, Node/package manager, port, dan browser testing lokal.
2. Scaffold ke root proyek tanpa menimpa docs. Pilih versi React/Vite/TypeScript yang kompatibel dengan runtime; pin lewat lockfile dan catat Node engine.
3. Tambahkan router, repository IndexedDB, clock seam, dan fixture `stake-v1`. Version schema/fixture harus eksplisit.
4. Buat script check/build/test yang benar dan buktikan satu smoke Playwright sejak awal.
5. Catat command aktual dan hasilnya di sini setelah dapat dijalankan. Jangan menandai hasil planned sebagai passed.

## Struktur yang direncanakan

```text
src/
  app/           # routing, providers, shell
  features/      # dashboard, assets, calculator, positions, activity, settings
  domain/        # models, decimal parsing, reward/valuation rules
  data/          # IndexedDB, migrations, repositories, fixtures
  shared/        # UI, formatters, accessibility
public/          # original/licensed bundled assets
tests/
  unit/
  integration/   # IndexedDB in a real browser
  e2e/           # user journeys in dev and production
docs/
```

## Peta fitur ke kode

Daftar fitur dan acceptance criteria ada di [PRD](PRD.md); jadwal dan status per fitur ada di [Milestones](MILESTONES.md#peta-fitur-ke-milestone).

| Fitur | Route | Lokasi kode | Bergantung pada | Tes utama |
|---|---|---|---|---|
| Dashboard | `/dashboard` | `features/dashboard` | Query saldo dari ledger dan posisi active; formula valuation/reward di `domain` | Unit valuation; E01 |
| Aset dan watchlist | `/assets` | `features/assets` | Fixture assets/providers/chart; store watchlist | Integration watchlist; E02, E03 |
| Kalkulator | `/calculator` | `features/calculator` | Formula reward dan parsing input di `domain`; tanpa repository | Unit reward/validasi; E04, E05 |
| Draft, aktivasi, posisi aktif, tutup | `/positions` | `features/positions` | Transaction coordinator untuk positions, ledger, operations, activity; clock provider | Integration idempotency/rollback/concurrency; E06–E14 |
| Riwayat aktivitas | `/activity` | `features/activity` | Store activity read-only | E18 |
| Pengaturan dan reset demo | `/settings` | `features/settings` | Reset satu transaksi seluruh store; metadata schema/seed | Integration reset; E17 |
| Shell, navigasi, 404, recovery storage | semua | `app`, `shared` | Router, error boundary, design tokens, error contract TRD | E16, E19, E20 |

Fitur di luar MVP pada PRD (wallet, harga live, akun, on-chain, compounding, dan lainnya) tidak mendapat folder, route, atau tombol placeholder.

## Script contract yang akan dibuat

| Script | Peran setelah scaffold tersedia |
|---|---|
| `dev` | Server pengembangan lokal. |
| `typecheck` | TypeScript tanpa emit. |
| `lint` | Pemeriksaan source/config. |
| `test` | Unit calculations/validation. |
| `test:integration` | Repository IndexedDB pada browser asli. |
| `test:e2e` | UI journeys dengan fixture/clock terkendali pada build pengujian. |
| `build` | Artifact statis produksi. |
| `preview` | Sajikan artifact produksi lokal. |
| `test:production` | Uji UI terhadap artifact produksi, tanpa test hooks. |

Nama di atas adalah target kontrak, belum command yang tersedia. Install browser Playwright yang sesuai versi paket hanya setelah memeriksa browser yang sudah terpasang. Referensi: [Playwright installation](https://playwright.dev/docs/intro).

## Implementasi bertahap

Mulai dari unit oracle pada DATA_MODEL lalu repository nyata, sebelum merangkai draft -> activation -> close. Gunakan BigInt untuk arithmetic, string integer untuk persistence, dan UI formatters terpisah. Jangan mengakses IndexedDB dari komponen. Sukses UI hanya sesudah transaction complete; error mempertahankan form dan data committed sebelumnya.

Pisahkan satu clock provider dari UI. Snapshot `asOf` sekali per mutation; preview kalkulator tidak mengubah jam atau principal posisi. Perhitungan UI dan repository menggunakan fungsi domain yang sama, tetapi assertion tes memakai expected value independen dari fixture tertulis.

## Pengujian dan evidence

Lihat [E2E test plan](E2E_TEST_PLAN.md). Browser context baru mengisolasi setiap skenario. Reload test menggunakan context/database yang sama. Persistence antarproses browser memerlukan persistent profile khusus tes yang tidak dibersihkan sampai journey berakhir. Jangan menyentuh browser profile pengguna.

Lakukan fault injection pada repository IndexedDB asli lewat build E2E khusus; jangan hanya melempar error dari komponen. Uji transaksi aborted, multi-tab writes, quota handling, dan reset. Production suite memastikan core alur tetap berjalan tanpa fixture/fault control terbuka.

Simpan log, screenshot desktop/tablet/mobile, trace gagal, browser/runtime version, seed/clock, source/build hash, serta command. Artefak runtime ditempatkan di folder hasil yang diabaikan Git; pilih screenshot final untuk dokumentasi. Buat docs/VERIFICATION.md sesudah ada hasil nyata.

## Build dan deployment

Target static hosting seperti Vercel. Sebelum publish: jalankan checks, build, preview artifact, cek direct routes dan missing-route behavior. Atur fallback router sesuai host, tanpa mematikan error untuk file asset yang hilang. Tidak perlu API key/secret pada v1.

Sesudah publish: buka URL publik pada context terisolasi, jalankan journey, catat URL dan artifact identity. Jika perubahan UI/data terjadi setelah verifikasi, uji kembali bagian terdampak dan production gate. Recovery deployment dapat menggunakan artifact sebelumnya yang telah diuji; perubahan database schema harus mempertimbangkan compatibility sebelum rollback.

## Batas offline

Setelah app termuat, alur lokal dapat berjalan tanpa jaringan. Cold load/reload offline tidak dijanjikan karena tidak ada service worker pada MVP. Jangan menulis klaim offline penuh sebelum ada implementasi serta tesnya.
