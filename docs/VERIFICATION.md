# Verification — RavaStake

Catatan hasil run nyata. Status: **pass**, **fail**, **skipped** (sengaja dilewati, dengan alasan), atau **unverified** (belum dijalankan). Planned tidak sama dengan pass.

## Run 2026-10-07 — gate M1 (Fase 0–4)

| Item | Nilai |
|---|---|
| Source | branch `master`, commit `feat: irisan draft → aktif → majukan waktu → tutup` (parent `6f046b3`) |
| Mesin | Windows 11, Node 22.13.0, npm 11.8.0 |
| Browser | Playwright 1.63.0, Chromium 153.0.8010.12 (build 1243), headless |
| Fixture | `stake-v1`; E2E memakai jam nyata T0 = 2026-10-01T00:00:00Z lewat hook build e2e |
| Locale/zona waktu tes | `id-ID`, `Asia/Jakarta` |

| Command | Hasil |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 error, 0 warning) |
| `npm test` | pass — 75 tes: domain (oracle 3, 6, 7, 9; parsing; formatter) + tes statis kontrak transaksi D7 |
| `npm run test:integration` | pass — 20 tes IndexedDB di Chromium asli |
| `npm run test:e2e` | pass — 5 tes pada `dist-e2e` |
| `npm run test:production` | pass — `dist/` bebas `__ravastakeTest` (2 file diperiksa); 1 tes pass, 1 skipped |
| `npm run check` | pass (exit 0) |
| `npm run dev` | pass — Vite siap di http://127.0.0.1:5173; `/` dan `/positions` HTTP 200 |
| Visual 1440×900 dan 360×780 (`/dashboard`, `/positions`, build production) | pass setelah perbaikan: tidak ada overflow horizontal; topbar tidak sticky di ponsel; select tidak meluber |

### Status kasus E2E_TEST_PLAN

| Kasus | Status | Bukti |
|---|---|---|
| E01 (seed, saldo awal, seed tidak ganda) | pass (integration) | `tests/integration/data.test.ts` "saldo awal sesuai fixture" |
| E03 (watchlist tanpa duplikat) | pass (integration) · UI unverified | integration "watchlist tanpa duplikat" |
| E05 (validasi field) | pass (integration + sebagian UI) | integration "validasi draft per field"; e2e "validasi draft per field" |
| E06 (draft CRUD) | pass (integration) · UI edit unverified | integration "draft tidak mengubah saldo" |
| E07 (aktivasi T0) | pass (UI + integration) | `tests/e2e/journey.spec.ts` STK-E07 |
| E08 (saldo kurang) | pass (integration) · UI unverified | integration "saldo kurang ditolak" |
| E09 (replay operation ID) | pass (integration) · UI klik ganda unverified | integration "replay operation ID" |
| E10 (maju 73 hari, batal, tutup) | pass (UI + integration) | e2e STK-E10 + STK-E21 |
| E12 (batas durasi, jam mundur) | pass (integration) · UI unverified | integration "reward dibatasi durasi", "jam perangkat mundur" |
| E13 (fault rollback) | pass (integration) · UI unverified | integration "fault saat aktivasi", "fault kuota saat tutup" |
| E14 (aktivasi bersamaan dua koneksi) | pass (integration) · UI dua tab unverified | integration "dua draft 1,5 ETH" |
| E16 (schema tak dikenal, versi lebih baru, kuota) | pass (integration) · UI recovery unverified | integration "metadata schema masa depan", "database versi lebih baru", "fault kuota" |
| E17 (reset) | pass (integration) · UI unverified | integration "reset mengembalikan fixture" |
| E20 production-local | pass (direct route, jalur inti +30 hari, reload, 404 app, hook tidak ada) | `tests/production/journey.spec.ts` |
| E20 aset hilang → 404 | skipped lokal (`vite preview` selalu fallback); wajib dijalankan terhadap deployment | `tests/production/journey.spec.ts` |
| E21 jalur utama, (a) | pass (UI) | e2e STK-E10 + STK-E21, STK-E21a |
| E21 (b), (c), (d) | pass (integration) · UI dua tab unverified | integration "dua tab memajukan +30", "dialog tutup basi", "batas hari terlewati" |
| E22 (X-ray) | pass (integration, query) · UI belum dibangun (M2) | integration "X-ray: total sama" |
| E02, E04, E11, E15, E18, E19, E23, E21(e) | unverified | Fitur/UI terkait dijadwalkan M2 |

### Belum diverifikasi

- Workflow GitHub Actions (`.github/workflows/ci.yml`) belum pernah berjalan karena repo belum di-push.
- Firefox/WebKit, screen reader, perangkat fisik: belum dijalankan.
- Deployment Vercel dan public smoke: belum ada URL.
