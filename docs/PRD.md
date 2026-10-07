# PRD — RavaStake

Versi 0.1, 2026-10-06. Status: spesifikasi awal; implementasi belum dimulai.

## Tujuan dan pengguna

Membangun dashboard web yang mengubah konsep visual staking menjadi alur interaktif: jelajahi aset contoh, pahami kalkulasi reward, rencanakan posisi, aktifkan simulasi, dan lihat riwayatnya. Target utama adalah reviewer portofolio dan pengguna demo yang ingin menjelajahi produk tanpa akun atau wallet.

MVP berhasil jika perjalanan tersebut dapat diselesaikan pada desktop dan ponsel, perubahan bertahan sesudah reload, perhitungan dapat dijelaskan, dan E2E membuktikan perilakunya.

## Lingkup dan acceptance criteria

| ID | P0 requirement | Kriteria penerimaan |
|---|---|---|
| STK-01 | Dashboard | Saldo tersedia, principal aktif, dan estimasi reward konsisten dengan ledger/posisi. Memilih aset memperbarui detail aktif yang benar. |
| STK-02 | Aset | Cari simbol/nama, filter watchlist, urutkan harga atau APR dummy; detail memuat unit, harga, APR, dan grafik fixture 7D/30D. |
| STK-03 | Watchlist | Tambah/hapus tanpa duplikasi dan tersimpan sesudah reload. |
| STK-04 | Kalkulator | Input principal, APR simulasi, dan hari menghasilkan reward simple interest sesuai TRD; hasil tidak mengubah saldo/posisi. |
| STK-05 | Draft CRUD | Buat, baca, edit, hapus draft dengan aset, jumlah, provider demo, durasi, dan catatan; edit/hapus draft tidak mengubah saldo. |
| STK-06 | Aktivasi simulasi | Konfirmasi memperlihatkan saldo/jumlah/durasi/APR; aktivasi memindahkan principal tersedia ke posisi aktif tepat sekali secara atomik. |
| STK-07 | Posisi aktif | Detail menampilkan principal, APR snapshot, periode, elapsed days, dan estimasi reward yang konsisten. Field finansial posisi aktif tidak dapat diedit. |
| STK-08 | Tutup simulasi | Konfirmasi mengembalikan principal dan reward demo accrued ke saldo satu kali, menutup posisi, dan menyimpan riwayat. |
| STK-09 | Aktivitas | Filter aktivasi/penutupan; event committed tampil dengan waktu, aset, jumlah, dan hubungan ke posisi; tidak dapat diedit/hapus terpisah. |
| STK-10 | Persistensi/error | Reload, dua tab, gagal write, data/schema tak dikenal, serta saldo tidak cukup tidak menghasilkan state parsial atau sukses palsu. |
| STK-11 | Reset demo | Pembatalan mempertahankan data; konfirmasi memulihkan fixture sekali secara atomik. |
| STK-12 | Responsif/aksesibilitas | Semua fungsi inti tersedia pada 360px, 768px, 1440px; keyboard, fokus dialog, input label, dan alternatif tekstual grafik dapat digunakan. |
| STK-13 | Build/deploy | Build statis dapat dibuka langsung di route aplikasi; production E2E dan public smoke lulus sebelum status deployed-and-verified. |

## Perjalanan utama

1. Buka dashboard yang dilabeli demo dan pilih aset.
2. Coba principal/durasi di kalkulator; lihat asumsi APR tetap dan simple interest.
3. Buat draft, edit jika perlu, lalu tinjau dan aktifkan staking simulasi.
4. Lihat posisi aktif, reload, lalu tutup posisi dan periksa perubahan saldo serta aktivitas.

## Aturan produk

- Satuan aset dan harga USD adalah simulasi. APR fixture tetap; tidak diberi label APY.
- Kalkulator mendukung principal positif, APR 0–100%, dan 1–365 hari; tidak ada compounding, biaya, atau perubahan harga dalam estimasinya.
- Posisi menggunakan APR provider fixture saat aktivasi, bukan APR bebas dari kalkulator. Preview final harus menampilkan ulang nilai yang benar.
- Draft tidak memesan saldo. Aktivasi memeriksa saldo saat commit.
- Penutupan lebih awal boleh; reward dihitung per hari penuh sejak aktivasi, maksimum durasi yang dipilih. Principal tidak terkunci secara nyata.
- Reward estimasi tidak dihitung sebagai saldo tersedia sampai posisi ditutup. Tidak ada reward otomatis yang ditambahkan ke ledger saat halaman dibuka.
- Posisi aktif/closed tidak dihapus atau diedit nominalnya; hanya draft yang mendukung edit/hapus. Semua data dapat dihapus melalui reset demo yang dikonfirmasi.

## Di luar MVP

Autentikasi, cloud sync, API harga live, wallet connection, deposit/withdraw uang asli, staking on-chain, smart contract, compounding, fee/slashing, notifikasi push, langganan, Data API, serta liquid staking aktual. Tidak membuat CTA palsu untuk fitur tersebut.

## Handoff dan ukuran keberhasilan

Keluaran implementasi mendatang: aplikasi responsif, source, build publik, bukti E2E, screenshot, dan case study yang menjelaskan data lokal serta aturan simulasi. Keberhasilan diukur dari journey yang lulus dan hambatan penggunaan yang diperbaiki, bukan klaim return atau jumlah pengguna.
