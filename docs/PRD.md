# PRD — RavaStake

Versi 0.2, 2026-10-07. Status: spesifikasi disetujui; implementasi berjalan (lihat [Milestones](MILESTONES.md)).

## Tujuan dan pengguna

Membangun dashboard web yang mengubah konsep visual staking menjadi alur interaktif: jelajahi aset contoh, pahami kalkulasi reward, rencanakan posisi, aktifkan simulasi, majukan waktu simulasi, dan lihat riwayatnya. Target utama adalah reviewer portofolio dan pengguna demo yang ingin menjelajahi produk tanpa akun atau wallet, dengan waktu sekitar 2–5 menit.

MVP berhasil jika perjalanan tersebut dapat diselesaikan pada desktop dan ponsel, perubahan bertahan sesudah reload, perhitungan dapat dijelaskan dan ditelusuri sampai ledger, dan E2E membuktikan perilakunya. Uji dingin: orang yang belum pernah melihat RavaStake menyelesaikan aktivasi → majukan waktu → tutup dengan reward bukan nol dalam ≤2 menit tanpa membaca dokumentasi.

## Lingkup dan acceptance criteria

| ID | P0 requirement | Kriteria penerimaan |
|---|---|---|
| STK-01 | Dashboard | Saldo tersedia, principal aktif, dan estimasi reward per aset konsisten dengan ledger/posisi; total USD ditampilkan sebagai angka turunan berlabel. Memilih aset memperbarui detail aktif yang benar. |
| STK-02 | Aset | Cari simbol/nama, filter watchlist, urutkan harga atau APR dummy; detail memuat unit, harga, APR, dan grafik fixture 7D/30D. |
| STK-03 | Watchlist | Tambah/hapus tanpa duplikasi dan tersimpan sesudah reload. |
| STK-04 | Kalkulator | Pilih aset, input principal, APR simulasi, dan hari menghasilkan reward simple interest sesuai TRD; hasil tidak mengubah saldo/posisi. |
| STK-05 | Draft CRUD | Buat, baca, edit, hapus draft dengan aset, jumlah, provider demo, durasi, dan catatan; edit/hapus draft tidak mengubah saldo. |
| STK-06 | Aktivasi simulasi | Konfirmasi memperlihatkan saldo/jumlah/durasi/APR; aktivasi memindahkan principal tersedia ke posisi aktif tepat sekali secara atomik. Dialog aktivasi memuat tautan "Buka di tab kedua" untuk mendemokan bahwa aktivasi ganda dari dua tab tetap menghasilkan satu aktivasi. |
| STK-07 | Posisi aktif | Detail menampilkan principal, APR snapshot, periode, elapsed days, dan estimasi reward yang konsisten. Field finansial posisi aktif tidak dapat diedit. |
| STK-08 | Tutup simulasi | Konfirmasi mengembalikan principal dan reward demo accrued ke saldo satu kali, menutup posisi, dan menyimpan riwayat. Nilai yang dipreview sama dengan nilai yang di-commit; kalau berubah, commit ditolak dan dialog menampilkan nilai baru. |
| STK-09 | Aktivitas | Filter aktivasi / penutupan / lompatan waktu; event committed tampil dengan waktu simulasi, aset, jumlah, dan hubungan ke posisi; tidak dapat diedit/hapus terpisah. |
| STK-10 | Persistensi/error | Reload, dua tab, gagal write, data/schema tak dikenal, serta saldo tidak cukup tidak menghasilkan state parsial atau sukses palsu. |
| STK-11 | Reset demo | Pembatalan mempertahankan data; konfirmasi memulihkan fixture dan mengembalikan waktu simulasi ke waktu nyata sekali secara atomik. |
| STK-12 | Responsif/aksesibilitas | Semua fungsi inti tersedia pada 360px, 768px, 1440px; keyboard, fokus dialog, input label, dan alternatif tekstual grafik dapat digunakan. |
| STK-13 | Build/deploy | Build statis dapat dibuka langsung di route aplikasi; production E2E dan public smoke lulus sebelum status deployed-and-verified. |
| STK-14 | Mesin waktu | Pengguna memajukan waktu simulasi +1/+7/+30 hari atau N hari (1–365) dalam satu langkah; "Lompat ke jatuh tempo" mengisi input N dengan sisa hari posisi. Waktu hanya maju, bertahan setelah reload, sama di semua tab, dan selalu terlihat lewat badge. Dua tab yang memajukan waktu dari offset yang sama menghasilkan satu lompatan. |
| STK-15 | Ledger X-ray | Saldo tersedia, principal aktif, dan angka Principal / Principal dikembalikan / Reward diterima di detail posisi bisa dibuka untuk melihat entri ledger penyusunnya; total unit mentahnya sama persis dengan angka di layar. Estimasi reward dan total USD ditampilkan sebagai derivasi rumus berlabel "turunan". |

## Perjalanan utama

1. Buka dashboard yang dilabeli demo dan pilih aset.
2. Coba principal/durasi di kalkulator; lihat asumsi APR tetap dan simple interest.
3. Buat draft, edit jika perlu, lalu tinjau dan aktifkan staking simulasi.
4. Majukan waktu simulasi, lihat estimasi reward bertambah, buka X-ray untuk menelusuri angka.
5. Reload, lalu tutup posisi dan periksa perubahan saldo serta aktivitas.

## Aturan produk

- Bahasa UI Indonesia. Tampilan angka mengikuti `id-ID` (titik ribuan, koma desimal). Input jumlah menerima satu pemisah desimal, `,` atau `.`, tanpa pemisah ribuan.
- Satuan aset dan harga USD adalah simulasi. APR fixture tetap; tidak diberi label APY.
- Kalkulator mendukung principal positif, APR 0–100% (maksimal 2 desimal), dan 1–365 hari; tidak ada compounding, biaya, atau perubahan harga dalam estimasinya.
- Posisi menggunakan APR provider fixture saat aktivasi, bukan APR bebas dari kalkulator. Preview final harus menampilkan ulang nilai yang benar.
- Draft tidak memesan saldo. Aktivasi memeriksa saldo saat commit.
- Penutupan lebih awal boleh; reward dihitung per hari penuh sejak aktivasi, maksimum durasi yang dipilih. Principal tidak terkunci secara nyata.
- Reward estimasi tidak dihitung sebagai saldo tersedia sampai posisi ditutup. Tidak ada reward otomatis yang ditambahkan ke ledger saat halaman dibuka.
- Waktu simulasi = waktu nyata + offset yang hanya bisa maju. Offset kembali ke 0 hanya lewat reset demo. Badge waktu selalu terlihat dan menyatakan "Waktu nyata" atau "Waktu simulasi".
- Posisi aktif/closed tidak dihapus atau diedit nominalnya; hanya draft yang mendukung edit/hapus. Semua data dapat dihapus melalui reset demo yang dikonfirmasi.

## Di luar MVP

Autentikasi, cloud sync, API harga live, wallet connection, deposit/withdraw uang asli, staking on-chain, smart contract, compounding, fee/slashing, notifikasi push, langganan, Data API, liquid staking aktual, serta mundur waktu. Tidak membuat CTA palsu untuk fitur tersebut. Mode tur terpandu 90 detik ditunda sampai setelah M4.

## Handoff dan ukuran keberhasilan

Keluaran implementasi: aplikasi responsif, source, build publik di Vercel, bukti E2E, screenshot, dan case study yang menjelaskan data lokal, mesin waktu, serta aturan simulasi. Keberhasilan diukur dari journey yang lulus dan hambatan penggunaan yang diperbaiki, bukan klaim return atau jumlah pengguna.
