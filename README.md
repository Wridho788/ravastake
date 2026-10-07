# RavaStake — Crypto Staking Dashboard (simulasi)

Dashboard web responsif untuk menjelajahi aset crypto contoh, menghitung reward, dan mengelola posisi staking **simulasi**, lengkap dengan **mesin waktu** (memajukan waktu simulasi untuk melihat reward bertambah) dan **Ledger X-ray** (menelusuri setiap angka saldo sampai entri ledger-nya). Inspirasi visual: [Stakent — Crypto Dashboard oleh Awsmd](https://dribbble.com/shots/23902428-Stakent-Crypto-Dashboard); identitas visual dibuat sendiri.

**Status:** lihat [Milestones](docs/MILESTONES.md). Hasil run yang terverifikasi dicatat di `docs/VERIFICATION.md`.

## Prinsip

- Sepenuhnya lokal: React + TypeScript + Vite, data di IndexedDB browser Anda. Tidak ada backend, akun, wallet, private key, uang asli, koneksi blockchain, atau feed harga live.
- Bisa di-deploy sebagai situs statis di Vercel tanpa secret.
- Semua saldo dihitung dari ledger dengan BigInt (8 desimal); aktivasi, penutupan, dan lompatan waktu adalah transaksi atomik.
- Unit, integration IndexedDB (browser asli), dan E2E Playwright menjadi gate sebelum rilis.

## Menjalankan

Lihat [Development](docs/DEVELOPMENT.md) untuk prasyarat dan semua script.

```bash
npm install
npm run dev
```

## Dokumen

| Dokumen | Isi |
|---|---|
| [PRD](docs/PRD.md) | Tujuan, pengguna, requirement STK-01–STK-15, acceptance criteria, batas MVP. |
| [Design spec](docs/DESIGN_SPEC.md) | Referensi, screen, mesin waktu, X-ray, state, dan responsivitas. |
| [Architecture](docs/ARCHITECTURE.md) | Modul, kontrak transaksi, alur aktivasi/waktu, test seam. |
| [TRD](docs/TRD.md) | Stack, presisi angka, waktu simulasi, error contract, quality gate. |
| [Data model & fixtures](docs/DATA_MODEL.md) | Schema v1, state machine, fixture `stake-v1`, oracle numerik. |
| [Milestones](docs/MILESTONES.md) | Urutan implementasi dan checklist bukti penyelesaian. |
| [Development](docs/DEVELOPMENT.md) | Struktur, script, testing, CI, build, dan deployment. |
| [E2E test plan](docs/E2E_TEST_PLAN.md) | Skenario E01–E23, isolasi, dan release gate. |

## Batas penyimpanan

Data lokal tidak tersinkron ke perangkat lain. Menghapus site data menghapus catatan. Harga, APR, grafik, dan saldo adalah fixture demonstrasi, bukan harga atau hasil investasi aktual. Kalkulator dan mesin waktu menunjukkan hasil rumus simulasi dengan asumsi yang terlihat.
