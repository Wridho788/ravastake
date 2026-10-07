# Design specification — RavaStake

## Referensi dan batas interpretasi

[Stakent — Crypto Dashboard, Awsmd](https://dribbble.com/shots/23902428-Stakent-Crypto-Dashboard), ditinjau pada 2026-10-06 melalui gambar shot.

Terlihat: canvas gelap, sidebar kiri, toolbar atas, kartu aset dengan grafik garis, aksen lavender, panel promosi wallet, serta area posisi aktif dan slider periode. Shot hanya menunjukkan satu komposisi desktop; perilaku interaksi dan versi mobile belum dibuktikan dari referensi tersebut. Angka persentase di shot tidak digunakan sebagai data pasar atau fixture produk ini.

## Arah visual yang diusulkan

Pertahankan hierarki dashboard yang padat tetapi terbaca: latar charcoal, panel bertingkat, garis pemisah tipis, dan aksen lavender untuk aksi utama. Gunakan branding RavaStake serta ikon/aset original atau berlisensi. Logo, teks, avatar, dan chart artwork Stakent tidak disalin.

Token awal untuk diuji, bukan hasil sampling presisi: background `#0D0F17`, surface `#171A26`, elevated `#202437`, primary `#B9A0FF`, text `#F4F2FA`, muted `#B1ADC1`. Warna final harus lulus pemeriksaan kontras; profit/loss juga memakai tanda dan teks.

Gunakan angka tabular, maksimal dua font weight utama per panel, label unit yang selalu terlihat, serta disclosure jelas “Data simulasi”. Jangan memakai chart glow berlebihan yang mengganggu garis/data.

## Screen dan route rancangan

| Route | Isi dan aksi utama |
|---|---|
| `/` | Redirect/routing internal ke dashboard; tidak memerlukan landing pemasaran pada v1. |
| `/dashboard` | Ringkasan saldo, kartu aset, active position, dan shortcut draft/kalkulator. |
| `/assets` | Search, watchlist filter, sort, detail aset, chart 7D/30D dengan ringkasan numerik. |
| `/calculator` | Input dan slider hari yang sinkron, principal/APR, hasil dan asumsi formula. |
| `/positions` | Tab draft/active/closed, buat/edit/hapus draft, aktivasi dan penutupan simulasi. |
| `/activity` | Ledger aktivitas dengan filter dan link ke detail posisi. |
| `/settings` | Keterangan data lokal, reset demo, status fixture/schema untuk troubleshooting bila diperlukan. |

Detail/modal posisi harus bisa dicapai dari dashboard maupun daftar; deep link posisi dapat ditambahkan bila kontrak routing dibuat konsisten. Unknown route menampilkan 404 yang dapat kembali ke dashboard.

## Mesin waktu

- **Badge waktu** permanen di toolbar, selalu terlihat:
  - offset 0: "Waktu nyata · 7 Okt 2026";
  - offset > 0: "Waktu simulasi · 19 Des 2026 (+73 hari)".
  
  Offset selalu kelipatan hari penuh, jadi selisih hari selalu bilangan bulat.
- **Kontrol waktu** di toolbar: tombol "+1 hari", "+7 hari", "+30 hari", dan form "Majukan N hari" (input angka 1–365 + tombol "Majukan"). Semua tombol nonaktif selama mutasi berjalan.
- **Lompat ke jatuh tempo** di detail posisi aktif mengisi input N dengan sisa hari, lalu memfokuskan tombol "Majukan". Kalau posisi sudah jatuh tempo, tombol nonaktif dengan teks "Sudah jatuh tempo".
- **Konfirmasi pertama.** Lompatan waktu pertama di setiap database (dan pertama setelah reset) menampilkan dialog yang menjelaskan bahwa waktu hanya bisa maju untuk semua posisi dan hanya reset demo yang mengembalikannya. Lompatan berikutnya langsung dijalankan.
- **State `stale-time`:** pesan netral "Waktu simulasi berubah di tab lain atau batas hari terlewati. Periksa ulang nilai." dengan nilai yang sudah dimuat ulang.

## Ledger X-ray

Drawer read-only yang dibuka dari angka saldo tersedia, principal aktif (dashboard), serta Principal / Principal dikembalikan / Reward diterima (detail posisi). Isinya:
- tabel entri ledger (jenis, delta, `operationId`, waktu simulasi);
- baris total yang sama persis dengan angka pemicu;
- penjelasan tanda dibalik untuk principal.

Estimasi reward dan total USD ditampilkan sebagai rumus dengan angka nyata dan label "turunan". Drawer bisa ditutup dengan Escape dan mengembalikan fokus ke angka pemicu.

## Buka di tab kedua

Dialog aktivasi memuat tautan "Buka di tab kedua" (`target="_blank"`) ke `/positions?activate=<draftId>`. Tab baru membuka dialog aktivasi draft yang sama. Kalau satu tab mengaktifkan lebih dulu, tab lain mendapat pesan "Draft ini sudah diaktifkan di tab lain" dan daftar dimuat ulang; tidak ada aktivasi kedua.

## Responsif

- Desktop >=1200px: sidebar permanen, kartu aset berjajar, panel aktif dan kalkulator dua kolom jika cukup.
- Tablet 768–1199px: navigasi ringkas, kartu dua kolom, panel utama satu kolom.
- Ponsel 360–767px: drawer navigasi, kartu bertumpuk, tabel menjadi daftar berlabel, modal memenuhi lebar yang aman.
- Tidak ada overflow halaman horizontal. Grafik boleh disederhanakan tetapi informasi numerik tetap tersedia. Aksi tambah/aktifkan/tutup tidak bergantung pada hover.

## State wajib

Boot/loading database; katalog kosong setelah pencarian; belum ada draft; aktif kosong; pending mutation; validasi field; saldo kurang; kegagalan commit; database upgrade blocked; data tidak dikenali; confirmation cancel; sukses committed; route tidak ditemukan; nilai berubah (`stale-time`/`stale-draft`); target dialog hilang karena reset di tab lain; posisi sudah jatuh tempo.

## Aksesibilitas dan perilaku

Label setiap field, heading berurutan, fokus terlihat, dialog dengan focus trap dan focus return. Escape membatalkan dialog jika belum commit. Pending mutation tidak dapat dipicu ulang. Slider mempunyai input angka setara dan dapat dioperasikan keyboard. Grafik disertai ringkasan/tabel data; respect prefers-reduced-motion. Uji zoom 200% serta target sentuh sekitar 44px atau lebih.

## Definition of design ready

Sebelum implementasi visual dianggap selesai: screenshot 360/768/1440 tersedia, semua state utama ditinjau, teks panjang tidak terpotong kritis, kontras terukur, serta tidak ada fitur referensi yang ditampilkan seolah berfungsi padahal di luar scope.
