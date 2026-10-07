# TRD — RavaStake

Versi 0.2, 2026-10-07. Status: disetujui; versi dependensi dikunci di `package-lock.json`.

## Stack

React 19, TypeScript strict, Vite 7, React Router (mode library, `BrowserRouter`), CSS tokens, IndexedDB lewat wrapper `idb`, Vitest (unit + browser integration via Playwright provider), dan Playwright 1.63. Chart memakai SVG buatan sendiri dengan tabel data sebagai alternatif teks. Package manager npm; Node `>=22`.

## Presisi angka

Semua demo aset memakai 8 decimal places yang merupakan aturan aplikasi simulasi, bukan representasi unit blockchain. Persist `amountUnits` sebagai string integer desimal; parsing dan aritmetika domain menggunakan BigInt. Jangan menserialisasi BigInt langsung ke JSON atau mengonversi saldo ke float.

- `SCALE = 100000000`.
- APR disimpan integer basis points: 500 = 5.00%. Rentang kalkulator 0–10000 bps; input persen maksimal 2 desimal.
- Durasi integer 1–365 hari. Principal positif, maksimal 1.000.000 unit aset per posisi; maksimum 8 digit pecahan.
- Reward units = floor(principalUnits × aprBps × elapsedDays / (10000 × 365)).
- Position elapsedDays = min(durationDays, max(0, floor((asOfMs − activatedAtMs) / 86400000))).
- Calculator memakai hari input langsung; tidak mengubah clock atau posisi tersimpan.
- USD cents = floor(amountUnits × priceUsdCents / SCALE). Harga juga fixture, bukan nilai pasar terkini.
- Hasil pembulatan ke bawah dijelaskan pada UI detail; tidak ada compounding, fee, atau reward negatif.

### Formatter

`formatUnits(units: bigint)` mengubah BigInt menjadi string desimal kanonik dengan aritmetika integer (bagi dan sisa terhadap `SCALE`, nol belakang dipangkas), lalu memanggil `new Intl.NumberFormat('id-ID', { maximumFractionDigits: 8 }).format(string)`. Tidak ada konversi ke `Number`, sehingga tidak ada pembulatan. Layar dan X-ray memakai formatter yang sama, dan setiap angka yang bisa ditelusuri membawa atribut `data-units` berisi unit mentah.

### Input

Input jumlah menerima digit dengan satu pemisah desimal (`,` atau `.`), maksimal 8 digit pecahan. Tolak tanda minus/plus, notasi ilmiah, NaN, Infinity, spasi di tengah, lebih dari satu pemisah, dan pecahan berlebih; jangan diam-diam memotong nominal. Label input menyebut contoh (`contoh: 1,5`).

## Data dan transaksi

Schema dan fixture berada di [Data model](DATA_MODEL.md). Saldo tersedia dihitung dari ledger committed per aset. Principal aktif dihitung dari posisi active; reward aktif hanya estimasi sehingga tidak dihitung dua kali sebagai saldo tersedia.

Draft dapat diedit/dihapus. Active/closed tidak dapat diubah principal/APR/asset/durasinya. Aktivasi memvalidasi saldo dan provider di dalam transaksi. Close mengembalikan principal serta reward demo sekali, snapshot hasil untuk histori.

Operation ID unik dipersist bersama hasil; retry dengan ID yang sama mengembalikan hasil sebelumnya sebagai **sukses** (bukan error). Unique state transition mencegah double-close dengan ID berbeda. Seluruh writes yang menentukan saldo memakai readwrite transaction pada store scope yang sama, dan hanya `TransactionCoordinator` yang membuka transaksi (lihat [Architecture](ARCHITECTURE.md)).

## Waktu simulasi

- `metadata` menyimpan `simOffsetMs` (≥ 0, kelipatan 86400000) dan `lastCommittedSimMs`.
- Setiap mutasi menghitung `asOfMs = max(lastCommittedSimMs, realNowMs + simOffsetMs)` **di dalam transaksi readwrite yang sama** dengan tulisannya, lalu menulis `lastCommittedSimMs = asOfMs`. Timestamp record tidak pernah mundur walau jam perangkat mundur.
- Tampilan read-only memakai rumus yang sama dari nilai `metadata` terakhir. Tampilan dihitung ulang saat render, saat menerima broadcast, dan saat tab mendapat focus.
- **Majukan waktu N hari** (1–365): request membawa `operationId` dan `expectedOffsetMs`. Di dalam satu transaksi: replay idempoten kalau `operationId` sudah ada; tolak `stale-time` kalau `simOffsetMs ≠ expectedOffsetMs`; kalau cocok, `simOffsetMs += N × 86400000`, `asOfMs = max(lastCommittedSimMs, realNowMs + simOffsetMs baru)`, tulis `lastCommittedSimMs`, record `operations` dan `activity`. N ditambahkan ke offset, bukan ke waktu efektif.
- **Lompat ke jatuh tempo** tidak punya jalur sendiri: tombolnya mengisi input N dengan `ceil((activatedAtMs + durationDays × 86400000 − asOfMs) / 86400000)` lalu memakai use case yang sama. Untuk posisi yang sudah jatuh tempo tombol dinonaktifkan.
- **Verifikasi preview.** Aktivasi mengirim `expectedOffsetMs`, `principalUnits`, dan `aprBps` yang dipreview; penutupan mengirim `expectedOffsetMs`, `elapsedDays`, dan `rewardUnits`. Commit menghitung ulang di dalam transaksi. Offset atau elapsed/reward berbeda → `stale-time`; draft atau APR provider berbeda → `stale-draft`. Tidak ada tulisan pada penolakan.
- Reset demo mengembalikan `simOffsetMs = 0`, `lastCommittedSimMs = 0`, dan menggeser seed relatif ke waktu reset.
- Untuk E2E, jam nyata dikendalikan lewat hook yang hanya ada di build mode `e2e` (`window.__ravastakeTest`). Jangan menunggu hari nyata atau mengubah jam komputer pengguna.

## Error contract

Use case async menghasilkan committed result atau `DomainError` terstruktur dengan `code`: `validation`, `insufficient-balance`, `invalid-transition`, `not-found`, `stale-time`, `stale-draft`, `storage-unavailable`, `quota`, `migration-blocked`, `unsupported-schema`, `write-failed`. UI pending dinonaktifkan, data terakhir tetap terlihat, formulir gagal disimpan tetap terbuka untuk retry. Error tidak disamarkan sebagai toast sukses. Pesan `stale-time` netral: "Waktu simulasi berubah di tab lain atau batas hari terlewati. Periksa ulang nilai."

## Routing dan distribusi

Host statis harus memberi SPA fallback untuk route yang didukung. Asset yang hilang tetap menghasilkan error yang dapat didiagnosis; `vercel.json` hanya me-rewrite path selain `/assets/` ke `index.html`. Gunakan bundled fonts/icons/chart data agar UI tidak tergantung CDN. Service worker/PWA offline reload bukan target v1.

Konten produk tidak membutuhkan secret atau environment key. Build E2E (`vite build --mode e2e`) memiliki hook jam, fixture, dan fault yang tidak dimasukkan ke build publik; tes statis memeriksa `dist/` tidak berisi `__ravastakeTest`. Catat source/build hash, browser version, dan fixture version pada laporan.

## Kriteria kualitas

Typecheck, lint, unit, browser integration IndexedDB, E2E P0, visual review responsif, production E2E, dan public smoke. Semua gate otomatis dijalankan GitHub Actions di setiap push sejak M1. Core flow minimal Chromium; Firefox dan WebKit smoke dilakukan sebelum klaim dukungan browser tersebut. Uji keyboard dan alternatif grafik; physical mobile/Safari nyata hanya dianggap verified bila benar-benar dijalankan.
