# Milestones — RavaStake

Tanggal awal: 2026-10-06. **Status saat ini: M0 selesai (revisi spesifikasi 2026-10-07); M1 berjalan.**

Checklist implementasi hanya ditandai setelah deliverable dan bukti terkait benar-benar tersedia. Dokumen ini menjadi sumber status; Development menjelaskan cara menjalankannya.

## Peta fitur ke milestone

Acceptance criteria tetap mengacu ke [PRD](PRD.md); tabel ini hanya menunjukkan kapan tiap fitur dikerjakan dan dibuktikan.

| Fitur | Route | Requirement | M1 fondasi | M2 fitur | M3/M4 verifikasi | E2E |
|---|---|---|---|---|---|---|
| Dashboard: saldo tersedia, principal aktif, estimasi reward, kartu aset | `/dashboard` | STK-01 | Formula valuation/reward | Layar lengkap | Visual 3 viewport | E01 |
| Aset: search, sort harga/APR, detail, grafik 7D/30D | `/assets` | STK-02 | Fixture aset/provider/grafik | Layar, empty state, alternatif data grafik | Visual 3 viewport | E01, E02 |
| Watchlist tanpa duplikat dan persisten | `/assets` | STK-03 | Store watchlist | Toggle dan filter | Persistence journey | E03, E15 |
| Kalkulator simple interest, input dan slider sinkron | `/calculator` | STK-04 | Formula dan validasi input | Layar dan asumsi formula | Keyboard/slider | E04, E05 |
| Draft CRUD (aset, jumlah, provider, durasi, catatan) | `/positions` | STK-05 | Repository draft | Form, edit, hapus terkonfirmasi | Persistence journey | E05, E06 |
| Aktivasi simulasi atomik + tautan tab kedua | `/positions` | STK-06 | Irisan draft -> active | Dialog konfirmasi, saldo kurang, pending, tab kedua | Fault/concurrency | E07–E09, E13, E14, E23 |
| Detail posisi aktif (read-only nominal) | `/positions` | STK-07 | Elapsed days dan waktu simulasi | Detail dari dashboard dan daftar | Batas durasi, jam mundur | E07, E10, E12 |
| Tutup simulasi: principal + reward sekali | `/positions` | STK-08 | Irisan active -> closed | Preview, batal, konfirmasi, closed view | Double-close, fault | E10, E11, E13 |
| Riwayat aktivitas immutable dengan filter | `/activity` | STK-09 | Store activity | Layar, filter, link ke posisi | Keyboard | E18 |
| Persistensi dan error storage/schema | semua | STK-10 | Schema, seed-once, idempotency | Recovery UI dan retry | Reload, dua tab, rollback | E13–E16 |
| Reset demo terkonfirmasi | `/settings` | STK-11 | Reset transaksional | Layar settings dan dialog | Reset journey | E17 |
| Responsif dan aksesibilitas | semua | STK-12 | Layout dan tokens | 360/768/1440, fokus dialog, label | Zoom 200%, kontras, reduced motion | E18, E19 |
| Build statis, direct route, 404 | semua | STK-13 | Router, error boundary, `vercel.json` | Halaman 404 | Production-local (M3), public smoke (M4) | E20 |
| Mesin waktu | toolbar, `/positions` | STK-14 | Offset di metadata, CAS, jalur UI minimal | Konfirmasi pertama, lompat ke jatuh tempo, pesan stale-time | Dua tab, jam mundur | E21 |
| Ledger X-ray | dashboard, `/positions` | STK-15 | Query entri per titik masuk | Drawer, data-units | Konsistensi format | E22 |

## M0 — Produk dan desain

- [x] Buat README, PRD, design spec, architecture, TRD, data model, milestone, development guide, dan E2E test plan.
- [x] Tinjau gambar referensi Stakent; catat observasi visual dan keterbatasannya.
- [x] Tetapkan scope simulasi, fixture deterministik, dan aturan saldo/reward.
- [x] Revisi spesifikasi untuk mesin waktu (STK-14) dan Ledger X-ray (STK-15) setelah /office-hours dan /plan-eng-review (2026-10-07).
- [ ] Buat mockup atau implementasi awal untuk seluruh screen/state, termasuk mobile. Dipindah ke M2: implementasi langsung menggantikan mockup.
- [ ] Finalisasi identitas RavaStake, aset berlisensi, dan token visual terukur. Dipindah ke M2.

Gate: PRD, model data, rumus, dan acceptance criteria konsisten; desain mobile/error tidak dianggap tersedia hanya dari shot desktop.

## M1 — Fondasi dan irisan pertama

- [ ] Scaffold React/TypeScript/Vite; kunci versi dan Node engine yang kompatibel.
- [ ] Workflow CI GitHub Actions untuk semua gate otomatis.
- [ ] Buat route, layout, design tokens, serta error boundary.
- [ ] Buat IndexedDB schema, fixture, repository, coordinator, dan hook jam build e2e.
- [ ] Uji parsing decimal, formula reward, waktu simulasi, seed-once, dan operation idempotency.
- [ ] Jalankan smoke Playwright sejak awal untuk membuktikan browser/toolchain tersedia.
- [ ] Buktikan satu alur draft -> active -> majukan waktu -> closed dengan state persisten (E07, E10, E21 jalur utama).

Gate: satu journey lengkap memiliki bukti unit/integration/browser sebelum memperluas dashboard.

## M2 — Fitur MVP

- [ ] Dashboard dan detail aset dengan grafik fixture 7D/30D.
- [ ] Search, filter, sort, watchlist, serta empty states.
- [ ] Kalkulator dengan formula/asumsi jelas; input dan slider sinkron.
- [ ] Draft CRUD, activation confirmation, active/closed detail, close simulation, dan tautan tab kedua.
- [ ] UI mesin waktu lengkap dan Ledger X-ray.
- [ ] Activity filter, error storage, duplicate-submit handling, dan reset demo.
- [ ] Responsif 360/768/1440, keyboard, dialog focus, dan alternatif data grafik.
- [ ] Tambahkan flow E2E saat journey terkait selesai, bukan sesudah semua fitur dibuat.

## M3 — Release candidate

- [ ] Typecheck, lint, unit, dan browser integration IndexedDB lulus.
- [ ] Semua P0 lokal pada E2E_TEST_PLAN lulus, termasuk reload, concurrent tabs, fault rollback, dan reset. STK-E20 tahap production-local masuk M3; tahap public masuk M4.
- [ ] Periksa visual ketiga viewport, zoom 200%, font/kontras, dan reduced motion.
- [ ] Build produksi dan production E2E pada artifact yang sama lulus.
- [ ] Core smoke Firefox/WebKit; hasil yang belum teruji dicatat sebagai unverified.
- [ ] Tidak ada test-only clock/fixture/fault controls yang dapat diakses pada artifact publik.
- [ ] Tulis docs/VERIFICATION.md dengan command, source/build hash, fixture, dan bukti eksekusi nyata.

Gate: tidak ada P0 lokal gagal/unverified, tidak ada claim financial/live-data palsu, dan batas dukungan browser tercatat. Public smoke masih pending sampai deployment pada M4 tersedia.

## M4 — Deployment dan portofolio

- [ ] Push repository, README final, screenshot, dan case study keputusan desain/teknis.
- [ ] Hubungkan Vercel (preview per PR, production dari `master`); direct-route fallback lewat `vercel.json`.
- [ ] Deploy kandidat yang telah diuji.
- [ ] Public smoke desktop/mobile: route langsung, draft, activate, +30 hari, reload, close, dan reset pada context tes terisolasi.
- [ ] Catat URL, tanggal, versi artifact, serta keterbatasan; tautkan dari portofolio.

Gate: URL dan source benar-benar publik serta smoke pada deployment yang sama lulus. Build lokal saja tidak memenuhi status deployed.

## Setelah M4 (opsional)

- Mode tur terpandu 90 detik yang memakai skenario E2E yang sama.

## Urutan pekerjaan berikutnya

M1 bootstrap/storage/smoke/CI -> M2 fitur -> M3 verifikasi -> M4 deploy.
