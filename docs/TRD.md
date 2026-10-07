# TRD — RavaStake

Versi 0.1. Status: rancangan; versi dependensi dan command belum diverifikasi.

## Stack

React, TypeScript strict, Vite, router yang kompatibel static hosting, CSS tokens, IndexedDB, Vitest, dan Playwright. Chart dapat memakai SVG atau library yang aksesibel. Pilihan library/wrapper IndexedDB serta versi final ditetapkan saat bootstrap dan dikunci di lockfile; jangan mengasumsikan paket proyek lain otomatis kompatibel.

## Presisi angka

Semua demo aset memakai 8 decimal places yang merupakan aturan aplikasi simulasi, bukan representasi unit blockchain. Persist `amountUnits` sebagai string integer desimal; parsing dan aritmetika domain menggunakan BigInt. Jangan menserialisasi BigInt langsung ke JSON atau mengonversi saldo ke float.

- `SCALE = 100000000`.
- APR disimpan integer basis points: 500 = 5.00%. Rentang kalkulator 0–10000 bps.
- Durasi integer 1–365 hari. Principal positif, maksimal 1.000.000 unit aset per posisi; maksimum 8 digit pecahan.
- Reward units = floor(principalUnits × aprBps × elapsedDays / (10000 × 365)).
- Position elapsedDays = min(durationDays, max(0, floor((asOfMs − activatedAtMs) / 86400000))).
- Calculator memakai hari input langsung; tidak mengubah clock atau posisi tersimpan.
- USD cents = floor(amountUnits × priceUsdCents / SCALE). Harga juga fixture, bukan nilai pasar terkini.
- Hasil pembulatan ke bawah dijelaskan pada UI detail; tidak ada compounding, fee, atau reward negatif.

## Data dan transaksi

Schema dan fixture berada di [Data model](DATA_MODEL.md). Saldo tersedia dihitung dari ledger committed per aset. Principal aktif dihitung dari posisi active; reward aktif hanya estimasi sehingga tidak dihitung dua kali sebagai saldo tersedia.

Draft dapat diedit/dihapus. Active/closed tidak dapat diubah principal/APR/asset/durasinya. Aktivasi memvalidasi saldo dan provider di dalam transaksi. Close mengembalikan principal serta reward demo sekali, snapshot hasil untuk histori.

Operation ID unik dipersist bersama hasil; retry dengan ID yang sama mengembalikan hasil sebelumnya. Unique state transition mencegah double-close dengan ID berbeda. Seluruh writes yang menentukan saldo memakai readwrite transaction pada store scope yang sama.

## Waktu dan fixture

Capture satu `asOfMs` untuk setiap calculation/mutation; render tidak menghasilkan reward baru di ledger. Timestamp disimpan UTC ISO atau epoch milliseconds yang konsisten. Clock mundur menghasilkan elapsed 0, bukan debit. Reward berhenti bertambah setelah durasi berakhir. Untuk E2E gunakan clock tetap; jangan menunggu hari nyata atau mengubah jam komputer pengguna.

## Error contract

Use case async menghasilkan committed result atau structured error: validation, insufficient-balance, invalid-transition, duplicate-operation-result, storage-unavailable, quota, migration-blocked, unsupported-schema. UI pending dinonaktifkan, data terakhir tetap terlihat, formulir gagal disimpan tetap terbuka untuk retry. Error tidak disamarkan sebagai toast sukses.

Input memakai decimal point dengan label/contoh eksplisit; format display mengikuti locale produk. Tolak notasi ilmiah, negatif, NaN, Infinity, pecahan berlebih, dan input ambigu; jangan diam-diam memotong nominal.

## Routing dan distribusi

Host statis harus memberi SPA fallback untuk route yang didukung. Asset yang hilang tetap menghasilkan error yang dapat didiagnosis; jangan rewrite file aset menjadi HTML secara membabi buta. Gunakan bundled fonts/icons/chart data jika ingin UI lokal tidak tergantung CDN. Service worker/PWA offline reload bukan target v1.

Konten produk tidak membutuhkan secret atau environment key. Build E2E memiliki fixture/fault seam yang tidak dimasukkan ke build publik. Catat source/build hash, browser version, dan fixture version pada laporan.

## Kriteria kualitas

Typecheck, lint, unit, browser integration IndexedDB, E2E P0, visual review responsif, production E2E, dan public smoke. Core flow minimal Chromium; Firefox dan WebKit smoke dilakukan sebelum klaim dukungan browser tersebut. Uji keyboard dan alternatif grafik; physical mobile/Safari nyata hanya dianggap verified bila benar-benar dijalankan.
