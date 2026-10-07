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

## Responsif

- Desktop >=1200px: sidebar permanen, kartu aset berjajar, panel aktif dan kalkulator dua kolom jika cukup.
- Tablet 768–1199px: navigasi ringkas, kartu dua kolom, panel utama satu kolom.
- Ponsel 360–767px: drawer navigasi, kartu bertumpuk, tabel menjadi daftar berlabel, modal memenuhi lebar yang aman.
- Tidak ada overflow halaman horizontal. Grafik boleh disederhanakan tetapi informasi numerik tetap tersedia. Aksi tambah/aktifkan/tutup tidak bergantung pada hover.

## State wajib

Boot/loading database; katalog kosong setelah pencarian; belum ada draft; aktif kosong; pending mutation; validasi field; saldo kurang; kegagalan commit; database upgrade blocked; data tidak dikenali; confirmation cancel; sukses committed; route tidak ditemukan.

## Aksesibilitas dan perilaku

Label setiap field, heading berurutan, fokus terlihat, dialog dengan focus trap dan focus return. Escape membatalkan dialog jika belum commit. Pending mutation tidak dapat dipicu ulang. Slider mempunyai input angka setara dan dapat dioperasikan keyboard. Grafik disertai ringkasan/tabel data; respect prefers-reduced-motion. Uji zoom 200% serta target sentuh sekitar 44px atau lebih.

## Definition of design ready

Sebelum implementasi visual dianggap selesai: screenshot 360/768/1440 tersedia, semua state utama ditinjau, teks panjang tidak terpotong kritis, kontras terukur, serta tidak ada fitur referensi yang ditampilkan seolah berfungsi padahal di luar scope.
