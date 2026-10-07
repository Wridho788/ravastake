# Verification — RavaStake

Catatan hasil run nyata. Status: **pass**, **fail**, **skipped** (sengaja dilewati, dengan alasan), atau **unverified** (belum dijalankan). Planned tidak sama dengan pass.

## Run 2026-10-07 — M2 selesai, semua E2E

| Item | Nilai |
|---|---|
| Source | branch `master`, commit `feat: fitur MVP M2 …` (parent `4d5634a`) |
| Mesin | Windows 11, Node 22.13.0, npm 11.8.0 |
| Browser | Playwright 1.63.0, Chromium 153.0.8010.12 (build 1243), headless, 1 worker |
| Fixture | `stake-v1`; suite e2e memakai jam nyata T0 = 2026-10-01T00:00:00Z lewat hook build e2e |
| Locale/zona waktu tes | `id-ID`, `Asia/Jakarta` |

| Command | Hasil |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 error, 0 warning) |
| `npm test` | pass — 75 tes |
| `npm run test:integration` | pass — 20 tes IndexedDB di Chromium asli |
| `npm run test:e2e` | pass — 35 tes pada `dist-e2e` (3,0 menit) |
| `npm run check` | pass (exit 0) |
| `npm run test:production` | pass — `dist/` bebas `__ravastakeTest`; 1 pass, 1 skipped |
| Stabilitas multi-tab | `playwright test e14-multitab --repeat-each 3`: 18/18 pass |

Kegagalan selama pengembangan suite ini, semuanya di kode tes dan sudah diperbaiki:
- oracle E21d salah hitung (136.986 unit, bukan 1.369.863);
- assertion notice E13 terlalu longgar;
- E18 mencari tautan posisi saat filter lompatan waktu aktif;
- helper `ledgerKinds` belum memakai tie-break jenis untuk entri dengan timestamp sama.

### Status kasus E2E_TEST_PLAN

| Kasus | Status | Bukti |
|---|---|---|
| E01 | pass (UI + integration) | `tests/e2e/e01-dashboard-assets.spec.ts` |
| E02 | pass | `e01-dashboard-assets.spec.ts` |
| E03 | pass (UI + integration) | `e01-dashboard-assets.spec.ts` |
| E04 | pass | `e04-calculator.spec.ts` |
| E05 | pass (kalkulator + form draft) | `e04-calculator.spec.ts`, `journey.spec.ts` |
| E06 | pass | `e06-positions.spec.ts` |
| E07 | pass | `journey.spec.ts` |
| E08 | pass | `e06-positions.spec.ts` |
| E09 | pass (klik ganda + replay integration) | `e06-positions.spec.ts` |
| E10 | pass | `journey.spec.ts` |
| E11 | pass (dua tab) | `e14-multitab.spec.ts` |
| E12 | pass (batas durasi, jam mundur) | `e06-positions.spec.ts` |
| E13 | pass (fault aktivasi dan tutup, retry) | `e13-failures.spec.ts` |
| E14 | pass (dua tab) | `e14-multitab.spec.ts` |
| E15 | pass (reload, direct route, restart profil persisten) | `e15-persistence-reset.spec.ts` |
| E16 | pass (kuota, schema tak dikenal + pemulihan terkonfirmasi, versi lebih baru dari tab lain) | `e13-failures.spec.ts` |
| E17 | pass | `e15-persistence-reset.spec.ts` |
| E18 | pass (filter, read-only, tautan posisi, keyboard dialog, slider) | `e18-a11y-responsive.spec.ts` |
| E19 | pass (1440/768/720/360 tanpa overflow, alur ponsel, reduced motion, target 44px) | `e18-a11y-responsive.spec.ts` |
| E20 production-local | pass | `tests/production/journey.spec.ts` |
| E20 aset hilang → 404 | skipped lokal (`vite preview` selalu fallback); wajib dijalankan terhadap deployment | `tests/production/journey.spec.ts` |
| E21 jalur utama, (a)–(e) | pass | `journey.spec.ts`, `e14-multitab.spec.ts`, `e15-persistence-reset.spec.ts` |
| E22 | pass | `e22-xray.spec.ts` |
| E23 | pass | `e14-multitab.spec.ts` |

### Belum diverifikasi

- Workflow GitHub Actions belum pernah berjalan karena repo belum di-push.
- Firefox/WebKit smoke, screen reader manual, perangkat fisik, dan kontras terukur (M3).
- Deployment Vercel dan public smoke: belum ada URL (M4).

## Run 2026-10-07 — gate M1 (Fase 0–4)

Commit `4d5634a`: typecheck, lint, 75 unit, 20 integration, 5 E2E, dan production smoke semuanya pass; `npm run dev` siap di http://127.0.0.1:5173.
