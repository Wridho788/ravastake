# E2E test plan — RavaStake

**Status: seluruh skenario planned / belum dijalankan.** Dokumen ini belum merupakan suite Playwright executable. Case ID dan expected result menjadi kontrak saat suite dibuat.

## Level pengujian

- Unit: parsing nominal, batas input, reward, elapsed days, USD valuation, dan state transitions.
- Browser integration: IndexedDB asli, seed, constraint, rollback, concurrent writes, dan idempotency.
- E2E Playwright: alur UI, reload, navigation, keyboard, dan visual viewport.
- Production/public smoke: aplikasi hasil build tanpa test hooks, direct routes, dan persistence pada origin deployment.

## Fixture, clock, dan isolasi

Gunakan `stake-v1` pada DATA_MODEL dengan `T0 = 2026-10-01T00:00:00Z`. ETH opening 2, APR 500 bps. SOL opening 50 dengan seed active 10; AVAX opening 100. Context baru untuk skenario independen, bukan clear data di tengah persistence journey.

Aktivasi 1 ETH pada T0 menyisakan 1 ETH tersedia. Close pada T0+73 hari mengembalikan 1,01 ETH dan saldo tersedia menjadi 2,01 ETH. Advance clock melalui seam test-build; tidak menunggu waktu nyata atau mengganti jam OS.

Production suite memakai waktu nyata, fixture produksi, dan invariant yang sesuai (misalnya close hari yang sama reward 0); tidak mencoba memanggil clock hook yang sengaja dihapus dari artifact publik.

## Matriks Given / When / Then

| ID | Prioritas / requirement | Given | When | Then |
|---|---|---|---|---|
| STK-E01 | P0 / 01–02 | Database baru | Buka dashboard dan detail aset | Label demo, saldo/posisi seed, harga/unit, dan detail aset sesuai fixture; reload tidak menggandakan seed. |
| STK-E02 | P0 / 02 | Daftar aset | Cari ETH, urutkan APR/harga, ubah range 7D/30D, cari teks tak cocok | Hasil/urutan/seri sesuai fixture; empty state muncul dan dapat dipulihkan. |
| STK-E03 | P0 / 03 | Watchlist kosong | Favoritkan ETH, reload, filter watchlist, hapus | Satu ETH bertahan setelah reload; filter kosong setelah penghapusan. |
| STK-E04 | P0 / 04 | Kalkulator | Masukkan 1 ETH, APR 5%, 73 lalu 365 hari, kemudian APR 0 | Reward 0,01 lalu 0,05 lalu 0 ETH; ledger/posisi tidak berubah. |
| STK-E05 | P0 / 04–05 | Form kalkulator/draft | Masukkan negatif, zero principal, pecahan >8 digit, notasi ilmiah, APR >100%, hari 0/366 | Error per field; tidak ada silent rounding atau write. APR 0 pada kalkulator tetap valid. |
| STK-E06 | P0 / 05 | Tidak ada draft ETH | Buat draft, lihat, edit jumlah/durasi/note, reload, hapus dengan konfirmasi | CRUD tersimpan; saldo ETH selalu 2 dan active holdings tidak berubah. |
| STK-E07 | P0 / 06–07 | Draft 1 ETH/365 hari | Aktifkan pada T0 | Saldo tersedia 1 ETH, principal baru 1, posisi active dengan APR snapshot 5%, satu reserve dan activity. |
| STK-E08 | P0 / 06,10 | ETH tersedia 2, draft 3 ETH | Coba aktifkan | Ditolak karena saldo kurang; draft tetap, ledger/aktivitas tidak bertambah. |
| STK-E09 | P0 / 06,10 | Draft valid | Klik konfirmasi cepat dua kali/retry operation ID sama | Tepat satu aktivasi dan reserve; integration juga membuktikan replay sama hasilnya. |
| STK-E10 | P0 / 07–08 | Posisi E07 active | Advance 73 hari, lihat preview close, batalkan lalu konfirmasi | Preview reward 0,01; batal tidak menulis; sukses saldo 2,01 dan closed snapshot reward 0,01. |
| STK-E11 | P0 / 08–10 | Posisi telah closed | Coba close ulang dari tab/detail lama, lalu majukan clock | Tidak ada credit/activity kedua; snapshot reward tetap 0,01. |
| STK-E12 | P0 / 07 | Posisi active dengan durasi 73 hari | Advance 100 hari, lalu uji clock sebelum aktivasi pada fixture terpisah | Reward dibatasi 73 hari; clock mundur menghasilkan elapsed/reward 0. |
| STK-E13 | P0 / 06,08,10 | Fault write di tengah activate/close | Konfirmasi mutation; lepaskan fault dan retry | Transaksi abort utuh, error terlihat, tidak ada sukses/ledger parsial; retry satu hasil. |
| STK-E14 | P0 / 10 | Dua tab origin sama, ETH 2, dua draft masing-masing 1,5 | Aktifkan bersamaan | Tepat satu sukses, saldo 0,5; tab lain mendapat hasil terbaru atau error saldo; tidak negatif. |
| STK-E15 | P0 / 03,05–10 | Watchlist/draft/posisi/aktivitas sudah berubah | Reload, navigasi direct route, lalu restart browser profile tes yang sama | State committed bertahan; route tidak melakukan seed/reset ulang. |
| STK-E16 | P0 / 10 | Storage denied/quota, schema unsupported, atau upgrade diblokir tab lain | Load/save/upgrade sesuai fixture error | Recovery/retry jelas; data lama tidak otomatis dihapus; perubahan gagal tidak dipublikasikan sebagai sukses. |
| STK-E17 | P0 / 11 | Ada perubahan lokal | Reset lalu batal; reset lalu konfirmasi dan reload | Batal mempertahankan semuanya; konfirmasi mengembalikan fixture satu kali dengan ledger/posisi konsisten. |
| STK-E18 | P0 / 09,12 | Aktivitas activate dan close tersedia | Filter event, buka detail; navigasi dengan keyboard dan uji dialog/slider | Filter benar, histori tidak bisa diedit; focus trap/return dan numeric alternative slider bekerja. |
| STK-E19 | P0 / 12 | Viewport 360/768/1440 dan zoom 200% | Buka semua route dan lakukan draft/activate/close | Tidak ada overflow halaman; kontrol/nominal terbaca; grafik punya alternatif teks; reduced motion dihormati. |
| STK-E20 | P0 / 13 | Artifact production kemudian deployment publik | Direct-load `/positions`, jalankan core journey, refresh, buka unknown route | SPA routing benar, data persisten, 404 aplikasi berguna; test hooks tidak dapat diakses; build/URL evidence tercatat. |

E13/E14/E16 memiliki companion browser integration test yang memeriksa object stores asli. Screenshot saldo saja tidak membuktikan transaksi atomik atau tidak adanya event ganda. Storage failure harus dipicu di repository, bukan hanya mengganti UI dengan pesan error.

## Browser dan perangkat

Suite utama Chromium pada dev dan production. Smoke core journey Firefox/WebKit sebelum menyatakan dukungan lintas browser. Viewport mobile bukan bukti pengujian perangkat fisik. Screen reader manual dan perangkat nyata dicatat terpisah sebagai passed/failed/unverified.

## Locator dan artifacts

Utamakan role, label, dan nama accessible. Pakai data-testid stabil hanya saat perlu membedakan chart/item dinamis, misalnya `position-<id>` atau `asset-ETH`. Nilai testID masih rancangan; verifikasi DOM saat implementasi.

Setiap run merekam case/requirement ID, source/build hash, fixture version, clock, browser/runtime/viewport, base URL, command, timestamp, exit status, screenshot checkpoint, serta trace/log saat gagal. Status adalah pass, fail, blocked, atau unverified; planned tidak sama dengan pass.

## Gerbang rilis

Gate kandidat rilis memerlukan semua P0 lokal lulus tanpa menutupi kegagalan dengan retry. STK-E20 dicatat dengan dua hasil: production-local sebelum deploy dan public-smoke sesudah deploy. Public-smoke tetap pending sampai URL tersedia; status deployed-and-verified baru sah setelah tahap itu lulus. Visual review manual menilai hierarchy/layout selain assertion teknis. Artifact publik tidak memiliki API untuk mengubah clock, seed, atau memicu fault. Public smoke memakai context terisolasi dan data demo, lalu URL serta hasil dicatat di README dan docs/VERIFICATION.md.

Referensi pengujian: [Playwright writing tests](https://playwright.dev/docs/writing-tests), [Playwright emulation](https://playwright.dev/docs/emulation). Rumus dan expected result di dokumen ini adalah aturan simulasi aplikasi, bukan data return crypto aktual.
