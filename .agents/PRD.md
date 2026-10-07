# PRD — Sistem Toko Listrik Citra 23 Palu

| Item | Keterangan |
|---|---|
| Nama Produk | Sistem Toko Listrik Citra 23 Palu |
| Jenis | Aplikasi web manajemen stok, transaksi, dan laporan toko |
| Pengguna | Admin (single role) |
| Frontend | Vue.js 3 (Vite, Vue Router, Pinia) |
| Database | MySQL |
| Backend (asumsi) | Node.js + Express (REST API) — wajib ada untuk menjaga keamanan & akses MySQL |
| Status | Draft v1.0 |

---

## 1. Latar Belakang & Tujuan

Toko Listrik Citra 23 Palu membutuhkan sistem untuk mencatat stok barang, penjualan, dan pembelian secara terpusat, sehingga pemilik dapat memantau stok dan mengetahui laba/rugi tanpa pencatatan manual.

### Tujuan
1. Admin dapat login dan logout.
2. Admin dapat mengelola kategori.
3. Admin dapat mengelola barang.
4. Admin dapat menambah stok langsung dari tabel barang (melalui modal).
5. Admin dapat input penjualan, melihat history penjualan per bulan, dan melihat grafik per bulan.
6. Admin dapat input pembelian.
7. Admin dapat melihat laporan laba/rugi.
8. Admin dapat mengekspor laporan ke PDF / Excel.
9. Sistem aman dari dorking dan akses tanpa login.

### Di Luar Cakupan (Out of Scope)
- Multi-role / multi-user selain admin
- Kasir/POS dengan printer struk
- Multi-cabang, retur, piutang/hutang, manajemen supplier
- Aplikasi mobile native

---

## 2. Pengguna

| Role | Hak Akses |
|---|---|
| Admin | Seluruh fitur sistem |

Akun awal (seed): username `admin`. Password awal sesuai kesepakatan pengembangan, **wajib disimpan sebagai hash (bcrypt)** dan disarankan diganti sebelum produksi (lihat bagian Keamanan).

---

## 3. Struktur Menu & Routing

| Menu | Route | Akses |
|---|---|---|
| Login | `/login` | Publik |
| Dashboard | `/` | Login |
| Kategori | `/kategori` | Login |
| Barang | `/barang` | Login |
| Penjualan | `/penjualan` | Login |
| Pembelian | `/pembelian` | Login |
| Laporan Laba/Rugi | `/laporan` | Login |
| Logout | — | Login |

Route yang tidak dikenal diarahkan ke `/login` (jika belum login) atau halaman 404 generik (jika sudah login).

---

## 4. Kebutuhan Fungsional

### 4.1 Autentikasi
- **FR-AUTH-1**: Halaman login dengan username dan password.
- **FR-AUTH-2**: Login sukses menghasilkan token sesi (JWT di cookie `HttpOnly` atau memory) dengan masa berlaku terbatas.
- **FR-AUTH-3**: Logout menghapus sesi dan mengarahkan ke `/login`.
- **FR-AUTH-4**: Pesan gagal login generik ("Username atau password salah"), tidak membocorkan mana yang salah.
- **FR-AUTH-5**: Pembatasan percobaan login (rate limit), mis. 5 kali gagal → tunggu 5 menit.

### 4.2 Kelola Kategori (CRUD)

| Field | Tipe | Keterangan |
|---|---|---|
| id | INT, PK, AI | |
| nama_kategori | VARCHAR(100) | Wajib, unik |

- **FR-KAT-1**: Tambah, ubah, hapus, dan lihat daftar kategori (dengan pencarian).
- **FR-KAT-2**: Kategori yang masih dipakai oleh barang **tidak boleh dihapus** (tampilkan pesan penjelasan).

### 4.3 Kelola Barang (CRUD)

| Field | Tipe | Keterangan |
|---|---|---|
| id | INT, PK, AI | |
| MOD | VARCHAR(5) | Modal satuan terakhir (lihat catatan di Pertanyaan Terbuka) |
| kode_barang | VARCHAR(20), unik | Otomatis, lihat aturan di bawah |
| nama_barang | VARCHAR(150) | Wajib |
| kategori_id | INT, FK → kategori | Relasi, wajib |
| merk | VARCHAR(100) | Boleh kosong (noname) |
| stok_awal | INT | Default 0 |
| total_masuk | INT | Default 0, bertambah dari pembelian |
| total_keluar | INT | Default 0, bertambah dari penjualan |
| stok_akhir | INT | = stok_awal + total_masuk − total_keluar |
| harga_jual | DECIMAL(12,2) | Harga jual satuan |
| keterangan | TEXT | Opsional |

#### Aturan Pembuatan `kode_barang` (otomatis)
- Format merk terisi: `C23` + 3 huruf pertama merk (UPPERCASE) + nomor urut 5 digit.
  - Contoh: merk "Philips" → `C23PHI00001`, `C23PHI00002`, …
- Format tanpa merk (noname): `C23` + `NN` + nomor urut 5 digit.
  - Contoh: `C23NN00001`, `C23NN00002`, …
- Nomor urut dihitung **per prefix** (per 3 huruf merk / per NN), dimulai dari 00001.
- Jika nomor urut melebihi 5 digit (> 99999), penomoran **dilanjutkan** tanpa dipotong (mis. `C23PHI100000`).
- Kode dibuat di backend dalam satu transaksi database (mencegah duplikat saat input bersamaan) dan **tidak dapat diubah** setelah dibuat.
- Karakter non-huruf pada merk diabaikan saat mengambil 3 huruf pertama; jika kurang dari 3 huruf, gunakan huruf yang ada.

#### Fitur Tabel Barang
- **FR-BRG-1**: CRUD barang, pencarian (nama/kode/merk), filter kategori, dan pagination.
- **FR-BRG-2**: Kolom `stok_akhir` dihitung otomatis, tidak dapat diedit manual.
- **FR-BRG-3**: Setiap baris memiliki tombol **"Tambah Stok"** yang membuka **modal** berisi:
  - nama_barang & kode_barang (read-only)
  - harga_lama (dari `MOD`, jika kosong tampil `-`)
  - harga_baru_modal_satuan (input)
  - jumlah_masuk (input)
  - total_pembayaran (otomatis = harga_baru × jumlah)
  - tanggal (default hari ini)
  - Simpan di modal ini **tercatat sebagai transaksi pembelian** (sama dengan menu Pembelian).
- **FR-BRG-4**: Barang yang sudah memiliki riwayat transaksi tidak dihapus permanen (soft delete / diblokir) agar laporan tetap konsisten.
- **FR-BRG-5**: Indikator visual untuk stok menipis/habis (stok_akhir ≤ batas, mis. 5).

### 4.4 Input Penjualan

| Field | Sumber | Keterangan |
|---|---|---|
| nama_barang | Pilih dari barang (autocomplete) | |
| kode_barang | Database (otomatis) | Read-only |
| harga_jual | Database (otomatis) | Read-only |
| jumlah | Input | Integer > 0, tidak boleh melebihi stok_akhir |
| omzet_penjualan | Otomatis | harga_jual × jumlah |
| tanggal | Input | Default hari ini |

- **FR-JUAL-1**: Saat disimpan: catat transaksi, tambah `total_keluar`, kurangi `stok_akhir` (dalam satu transaksi database).
- **FR-JUAL-2**: Simpan **snapshot** `harga_jual` dan `harga_modal` (dari MOD) pada baris penjualan, agar laporan laba tidak berubah ketika harga di kemudian hari berubah.
- **FR-JUAL-3**: **History penjualan per bulan**: filter bulan & tahun, tabel (tanggal, kode, nama, jumlah, harga, omzet) dan total omzet bulan tersebut.
- **FR-JUAL-4**: **Grafik per bulan**:
  - Grafik batang/garis omzet harian pada bulan terpilih.
  - Grafik ringkasan omzet 12 bulan pada tahun terpilih.
  - Library: Chart.js (vue-chartjs).

### 4.5 Input Pembelian

| Field | Sumber | Keterangan |
|---|---|---|
| nama_barang | Pilih dari barang | |
| kode_barang | Database | Read-only |
| harga_lama | `MOD` tabel barang | Jika belum ada tampil `-` |
| harga_baru_modal_satuan | Input | Harga modal per unit saat ini |
| jumlah_masuk | Input | Integer > 0 |
| total_pembayaran | Otomatis | harga_baru × jumlah_masuk |
| tanggal | Input | Default hari ini |

- **FR-BELI-1**: Saat disimpan: catat transaksi, tambah `total_masuk`, tambah `stok_akhir`, dan **perbarui `MOD`** barang dengan `harga_baru_modal_satuan`.
- **FR-BELI-2**: Daftar riwayat pembelian dengan filter bulan & tahun.

### 4.6 Laporan Laba/Rugi

- **FR-LAP-1**: Filter periode (bulanan, tahunan, atau rentang tanggal).
- **FR-LAP-2**: Perhitungan:
  - **Total Penjualan (Omzet)** = Σ omzet_penjualan
  - **HPP** = Σ (jumlah terjual × harga_modal snapshot)
  - **Laba/Rugi Kotor** = Omzet − HPP
  - **Total Pembelian (informasi)** = Σ total_pembayaran pembelian pada periode
- **FR-LAP-3**: Tampilkan rincian per barang (jumlah terjual, omzet, HPP, laba) dan ringkasan total. Nilai negatif ditandai **Rugi** (warna merah), positif **Laba** (hijau).

### 4.7 Ekspor Laporan
- **FR-EXP-1**: Ekspor laporan laba/rugi ke **PDF** (judul toko, periode, tabel rincian, ringkasan).
- **FR-EXP-2**: Ekspor ke **Excel (.xlsx)** dengan kolom terstruktur.
- **FR-EXP-3**: Ekspor mengikuti filter periode yang sedang aktif. (Opsional: ekspor history penjualan & pembelian.)
- Library usulan: jsPDF + jspdf-autotable (PDF), SheetJS atau ExcelJS (Excel).

---

## 5. Kebutuhan Keamanan

### 5.1 Anti Dorking (mencegah halaman terindeks mesin pencari)
- `robots.txt`: `User-agent: *` / `Disallow: /`.
- Meta `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` pada seluruh halaman.
- Header HTTP `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` dari web server.
- Tidak membuat `sitemap.xml`; tidak ada halaman publik selain `/login`.
- Nonaktifkan directory listing, sembunyikan versi server (`server_tokens off` / `X-Powered-By` dihapus).
- Hapus file sensitif dari web root (`.env`, `.git`, backup `.sql`, `*.bak`) dan blokir aksesnya.
- Pesan error generik (tanpa stack trace, query SQL, atau path server).
- Judul halaman & konten login tidak membocorkan informasi sensitif.

### 5.2 Anti Akses Tanpa Login ("tembak domain")
- **Navigation guard** Vue Router: semua route kecuali `/login` mewajibkan sesi valid; jika tidak, redirect ke `/login`.
- **Penegakan di backend (wajib)**: seluruh endpoint API (kecuali `POST /auth/login`) memakai middleware autentikasi; tanpa token valid → `401 Unauthorized`. Guard di frontend saja tidak cukup.
- Route tidak dikenal dan akses langsung ke URL (mis. `/barang`, `/api/...`) saat belum login → redirect `/login` / 401.
- Token punya masa kedaluwarsa; logout membatalkan sesi; sesi kedaluwarsa otomatis mengarahkan ke login.
- Hapus data dari state/localStorage saat logout.

### 5.3 Keamanan Umum
- Password disimpan dengan **bcrypt** (tidak plaintext). Password awal default **harus diganti** sebelum dipakai produksi.
- **Prepared statement / parameterized query** untuk mencegah SQL Injection.
- Validasi dan sanitasi input di frontend dan backend (mencegah XSS).
- CORS dibatasi hanya ke domain aplikasi; HTTPS wajib; security headers (Helmet / CSP, HSTS).
- Rate limiting pada login dan API.
- Akun database aplikasi memakai hak akses minimum (bukan root).
- Backup database berkala.

---

## 6. Rancangan Database (Ringkas)

```
users        (id, username UNIQUE, password_hash, created_at)
kategori     (id, nama_kategori UNIQUE)
barang       (id, MOD, kode_barang UNIQUE, nama_barang, kategori_id FK, merk,
              stok_awal, total_masuk, total_keluar, stok_akhir,
              harga_jual, keterangan, deleted_at)
penjualan    (id, barang_id FK, kode_barang, nama_barang, harga_jual,
              harga_modal, jumlah, omzet_penjualan, tanggal, created_at)
pembelian    (id, barang_id FK, kode_barang, nama_barang, harga_lama,
              harga_baru_modal_satuan, jumlah_masuk, total_pembayaran,
              tanggal, created_at)
```

Relasi: `kategori 1 — N barang`, `barang 1 — N penjualan`, `barang 1 — N pembelian`.

Aturan data:
- Operasi penjualan/pembelian memakai **database transaction** agar stok dan catatan selalu konsisten.
- Indeks pada `tanggal`, `barang_id`, dan `kode_barang` untuk performa laporan.

---

## 7. Alur Utama

1. **Login** → dashboard.
2. **Siapkan data**: tambah kategori → tambah barang (kode otomatis).
3. **Pembelian / tambah stok** → stok_akhir naik, MOD diperbarui.
4. **Penjualan** → stok_akhir turun, omzet tercatat, grafik diperbarui.
5. **Laporan** → pilih periode → lihat laba/rugi → ekspor PDF/Excel.
6. **Logout**.

---

## 8. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Responsif | Nyaman di desktop & tablet; dapat dipakai di mobile |
| Performa | Halaman dimuat < 3 detik; laporan bulanan < 5 detik |
| Ketersediaan data | Backup harian database |
| Bahasa & format | Bahasa Indonesia; mata uang Rupiah (Rp), format tanggal DD/MM/YYYY |
| Validasi | Pesan error jelas di setiap form |
| Kompatibilitas | Chrome, Edge, Firefox versi terbaru |

---

## 9. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Admin dapat login dan logout; akses ke halaman lain tanpa login selalu dialihkan ke `/login`.
- [ ] Endpoint API tanpa token mengembalikan 401.
- [ ] CRUD kategori berjalan; kategori yang dipakai barang tidak bisa dihapus.
- [ ] CRUD barang berjalan; `kode_barang` terbentuk sesuai aturan (termasuk noname dan lanjutan > 5 digit).
- [ ] Tombol "Tambah Stok" memunculkan modal dan menambah stok serta memperbarui MOD.
- [ ] Penjualan mengurangi stok, menolak jumlah melebihi stok, dan omzet dihitung benar.
- [ ] History penjualan dapat difilter per bulan dan grafik per bulan tampil.
- [ ] Pembelian menampilkan harga_lama (atau `-`), menambah stok, dan memperbarui MOD.
- [ ] Laporan laba/rugi menghitung omzet, HPP, dan laba/rugi dengan benar.
- [ ] Ekspor PDF dan Excel menghasilkan file sesuai periode filter.
- [ ] Halaman memiliki `noindex`, `robots.txt` memblokir crawler, dan tidak ada directory listing.

---

## 10. Rencana Rilis (Usulan)

| Fase | Cakupan |
|---|---|
| 1 | Setup proyek, database, autentikasi, route guard, keamanan dasar |
| 2 | Kelola kategori & barang (termasuk generator kode & modal tambah stok) |
| 3 | Input penjualan, history, grafik |
| 4 | Input pembelian |
| 5 | Laporan laba/rugi & ekspor PDF/Excel |
| 6 | Pengujian, hardening keamanan, deployment |

---

## 11. Asumsi & Pertanyaan Terbuka

1. **Backend**: PRD mengasumsikan Node.js + Express karena Vue.js (frontend) tidak dapat terhubung aman langsung ke MySQL. Bisa diganti (Laravel, dll.).
2. **Tipe `MOD` VARCHAR(5)**: hanya muat 5 karakter (maks. Rp 99.999). Jika ada barang dengan modal ≥ Rp 100.000, nilai akan terpotong/ditolak. Disarankan diubah ke `DECIMAL(12,2)`. Mohon konfirmasi.
3. **Penomoran kode barang**: diasumsikan per prefix merk (`C23PHI00001`, `C23PHI00002`, …), bukan urut global seluruh barang. Mohon konfirmasi.
4. **Perhitungan HPP**: memakai modal terakhir (MOD) saat penjualan terjadi, bukan FIFO/rata-rata.
5. **Edit/hapus transaksi** penjualan & pembelian: belum ditentukan. Disarankan pembatalan (void) dengan koreksi stok otomatis.
6. **Kredensial default** `admin/admin` hanya untuk pengembangan; sangat disarankan diganti sebelum sistem dapat diakses publik.
7. **Satu barang per input** pada form penjualan/pembelian (tidak ada keranjang multi-item), sesuai spesifikasi.
