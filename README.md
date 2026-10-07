# RavaStake — Crypto Staking Dashboard

Tanggal: 2026-10-06. **Status: dokumentasi awal saja. Belum ada aplikasi, dependency terpasang, build, deploy, atau hasil pengujian.**

RavaStake adalah nama kerja untuk dashboard web responsif yang mengeksplorasi aset crypto contoh, kalkulasi reward, serta pengelolaan posisi staking simulasi. Inspirasi visual: [Stakent — Crypto Dashboard oleh Awsmd](https://dribbble.com/shots/23902428-Stakent-Crypto-Dashboard).

## Lokasi dan keputusan awal

`C:\Users\Hp\Documents\example-project\web\ravastake`

- Web React + TypeScript + Vite, dengan target desktop, tablet, dan ponsel.
- Data pasar dan saldo dummy; semua perubahan tersimpan pada browser/origin yang sama.
- IndexedDB direncanakan untuk transaksi atomik posisi dan ledger.
- Discovery aset, watchlist, kalkulator, draft posisi CRUD, aktivasi/penutupan posisi simulasi, dan riwayat aktivitas.
- Tidak ada wallet sungguhan, private key, uang asli, koneksi blockchain, atau feed harga live.
- Pengujian unit, integration IndexedDB, E2E Playwright, dan smoke build produksi wajib sebelum rilis.

Nama RavaStake, pilihan stack, dan scope simulasi adalah keputusan awal berdasarkan konteks proyek sebelumnya; identitas visual akan dibuat sendiri. Desain Dribbble menjadi referensi, bukan aset untuk disalin ke produk.

## Dokumen

| Dokumen | Isi |
|---|---|
| [PRD](docs/PRD.md) | Tujuan, pengguna, requirement, acceptance criteria, batas MVP. |
| [Design spec](docs/DESIGN_SPEC.md) | Analisis referensi, screen, komponen, state, dan responsivitas. |
| [Architecture](docs/ARCHITECTURE.md) | Modul, penyimpanan, data flow, dan batas sistem. |
| [TRD](docs/TRD.md) | Stack, aturan perhitungan, operasi atomik, error, dan quality gate. |
| [Data model & fixtures](docs/DATA_MODEL.md) | Schema, state machine, data uji, dan hasil numerik yang diharapkan. |
| [Milestones](docs/MILESTONES.md) | Urutan implementasi dan checklist bukti penyelesaian. |
| [Development](docs/DEVELOPMENT.md) | Bootstrap, struktur, testing, build, dan deployment. |
| [E2E test plan](docs/E2E_TEST_PLAN.md) | Skenario terukur, traceability, isolasi, dan release gate. |

## Batas penyimpanan

Data lokal tidak tersinkron ke perangkat lain. Menghapus site data menghapus catatan. Harga, APR, grafik, dan saldo adalah fixture demonstrasi, bukan harga atau hasil investasi aktual. Kalkulator menunjukkan hasil rumus simulasi dengan asumsi yang terlihat.

## Menjalankan proyek

Belum tersedia: folder ini baru berisi Markdown. Perintah install/dev/test/build yang benar akan ditambahkan setelah scaffold tersedia dan diverifikasi. Lihat [Development](docs/DEVELOPMENT.md).
