# PRD — Sistem Toko Listrik Citra 23 Palu

| Item | Keterangan |
|---|---|
| Nama Produk | Sistem Toko Listrik Citra 23 Palu |
| Jenis | Aplikasi web manajemen stok, transaksi, dan laporan toko |
| Pengguna | Admin dan Pegawai (role-based access) |
| Frontend | Vue.js 3 (Vite, Vue Router, Pinia) |
| Database | MySQL |
| Backend (asumsi) | Node.js + Express (REST API) — wajib ada untuk menjaga keamanan & akses MySQL |
| Status | Draft v1.1 |

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
10. Terdapat dua role: **Admin** (akses penuh) dan **Pegawai** (hanya menu Penjualan).
11. Data penjualan **tidak dapat diubah atau dihapus oleh Pegawai**. Koreksi hanya bisa dilakukan Admin dan selalu tercatat di audit log.

### Di Luar Cakupan (Out of Scope)
- Role selain Admin dan Pegawai (mis. owner, manajer, kasir terpisah)
- Kasir/POS dengan printer struk
- Multi-cabang, retur, piutang/hutang, manajemen supplier
- Aplikasi mobile native

---

## 2. Pengguna

| Role | Deskripsi |
|---|---|
| Admin | Pemilik/pengelola toko. Akses ke seluruh fitur, termasuk mengelola akun Pegawai. |
| Pegawai | Staf penjaga toko. Hanya dapat membuka menu **Penjualan** untuk **menambah** data penjualan. Tidak dapat mengubah atau menghapus data. |

### Matriks Hak Akses

| Fitur | Admin | Pegawai |
|---|:---:|:---:|
| Login / Logout | ✅ | ✅ |
| Dashboard | ✅ | ❌ |
| Kelola kategori | ✅ | ❌ |
| Kelola barang & tambah stok | ✅ | ❌ |
| Lihat harga modal (MOD) & laba | ✅ | ❌ |
| Input pembelian | ✅ | ❌ |
| **Input penjualan baru** | ✅ | ✅ |
| Lihat penjualan **hari ini** (read-only) | ✅ | ✅ |
| Riwayat penjualan semua periode & grafik | ✅ | ❌ |
| **Ubah / hapus data penjualan** | ❌ (hanya pembatalan/void) | ❌ |
| Batalkan (void) penjualan dengan alasan | ✅ | ❌ |
| Laporan laba/rugi & ekspor PDF/Excel | ✅ | ❌ |
| Kelola akun Pegawai | ✅ | ❌ |
| Lihat audit log | ✅ | ❌ |

Akun awal (seed): username `admin`. Password awal sesuai kesepakatan pengembangan, **wajib disimpan sebagai hash (bcrypt)** dan disarankan diganti sebelum produksi (lihat bagian Keamanan). Akun Pegawai dibuat oleh Admin.

---

## 3. Struktur Menu & Routing

| Menu | Route | Akses |
|---|---|---|
| Login | `/login` | Publik |
| Dashboard | `/` | Admin |
| Kategori | `/kategori` | Admin |
| Barang | `/barang` | Admin |
| Penjualan | `/penjualan` | Admin, Pegawai |
| Pembelian | `/pembelian` | Admin |
| Laporan Laba/Rugi | `/laporan` | Admin |
| Akun Pegawai | `/akun-pegawai` | Admin |
| Audit Log | `/audit-log` | Admin |
| Logout | — | Admin, Pegawai |

- Pegawai hanya melihat menu **Penjualan** dan **Logout**; setelah login otomatis diarahkan ke `/penjualan`.
- Pegawai yang membuka route Admin secara langsung (mengetik URL) diarahkan kembali ke `/penjualan`.
- Route yang tidak dikenal diarahkan ke `/login` (jika belum login) atau halaman 404 generik (jika sudah login).

---

## 4. Kebutuhan Fungsional

### 4.1 Autentikasi
- **FR-AUTH-1**: Halaman login dengan username dan password.
- **FR-AUTH-2**: Login sukses menghasilkan token sesi (JWT di cookie `HttpOnly` atau memory) dengan masa berlaku terbatas.
- **FR-AUTH-3**: Logout menghapus sesi dan mengarahkan ke `/login`.
- **FR-AUTH-4**: Pesan gagal login generik ("Username atau password salah"), tidak membocorkan mana yang salah.
- **FR-AUTH-5**: Pembatasan percobaan login (rate limit), mis. 5 kali gagal → tunggu 5 menit.
- **FR-AUTH-6**: Sesi membawa informasi **role** (`admin` / `pegawai`) yang ditetapkan server dan ditandatangani di dalam token; role tidak pernah diambil dari input klien.
- **FR-AUTH-7**: Setelah login, Admin diarahkan ke Dashboard dan Pegawai ke `/penjualan`.
- **FR-AUTH-8**: Akun Pegawai yang dinonaktifkan tidak dapat login dan sesi aktifnya ditolak pada request berikutnya.

### 4.2 Kelola Kategori (CRUD) — khusus Admin

| Field | Tipe | Keterangan |
|---|---|---|
| id | INT, PK, AI | |
| nama_kategori | VARCHAR(100) | Wajib, unik |

- **FR-KAT-1**: Tambah, ubah, hapus, dan lihat daftar kategori (dengan pencarian).
- **FR-KAT-2**: Kategori yang masih dipakai oleh barang **tidak boleh dihapus** (tampilkan pesan penjelasan).

### 4.3 Kelola Barang (CRUD) — khusus Admin

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

### 4.4 Input Penjualan — Admin & Pegawai

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
- **FR-JUAL-3**: **History penjualan per bulan (khusus Admin)**: filter bulan & tahun, tabel (tanggal, kode, nama, jumlah, harga, omzet) dan total omzet bulan tersebut.
- **FR-JUAL-4**: **Grafik per bulan (khusus Admin)**:
  - Grafik batang/garis omzet harian pada bulan terpilih.
  - Grafik ringkasan omzet 12 bulan pada tahun terpilih.
  - Library: Chart.js (vue-chartjs).

#### 4.4.1 Perlindungan Data Penjualan (Pegawai Tidak Dapat Mengubah Data)

**Latar belakang:** mencegah manipulasi data. Contoh kasus: terjual 2 lampu dan diinput 2, lalu saat Admin tidak ada, Pegawai mengubah jumlah menjadi 1 dan mengambil 1 lampu sisanya. Sistem harus membuat hal ini tidak mungkin dilakukan secara diam-diam.

- **FR-JUAL-5**: Pegawai hanya dapat **menambah** penjualan baru. Tidak ada tombol edit/hapus pada tampilan Pegawai, dan endpoint `PUT/PATCH/DELETE` penjualan oleh Pegawai dijawab `403 Forbidden` (dan dicatat di audit log).
- **FR-JUAL-6**: Pegawai hanya melihat daftar penjualan **hari ini** secara **read-only**, tanpa harga modal dan laba. Riwayat lengkap dan grafik hanya untuk Admin. Filter tanggal tidak dapat diakali lewat parameter URL/API.
- **FR-JUAL-7**: Untuk Pegawai, `tanggal` transaksi diisi **otomatis dari waktu server** dan tidak dapat diubah (mencegah tanggal mundur). Setiap baris menyimpan `created_by` (user) dan `created_at` (waktu server).
- **FR-JUAL-8**: Pegawai tidak dapat melihat harga modal (`MOD`); API penjualan untuk Pegawai tidak mengembalikan field tersebut.
- **FR-JUAL-9**: **Koreksi hanya oleh Admin lewat pembatalan (void)**: baris tidak dihapus, status menjadi `batal`, **alasan wajib diisi**, stok dikembalikan otomatis, dan tercatat di audit log (siapa, kapan, alasan). Admin tidak mengubah jumlah secara langsung; jika jumlah salah, lakukan void lalu input ulang.
- **FR-JUAL-10**: Baris yang di-void tetap tampil (dicoret/berlabel "Batal") dan dikecualikan dari omzet, HPP, dan laporan laba/rugi.
- **FR-JUAL-11**: Penguatan di level database (disarankan): trigger `BEFORE UPDATE/DELETE` pada tabel `penjualan` yang menolak perubahan kolom `barang_id`, `jumlah`, `harga_jual`, `harga_modal`, `omzet_penjualan`, `tanggal` serta penghapusan baris; hanya kolom status void yang dapat diubah melalui proses void Admin.

### 4.5 Input Pembelian — khusus Admin

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

### 4.6 Laporan Laba/Rugi — khusus Admin

- **FR-LAP-1**: Filter periode (bulanan, tahunan, atau rentang tanggal).
- **FR-LAP-2**: Perhitungan:
  - **Total Penjualan (Omzet)** = Σ omzet_penjualan
  - **HPP** = Σ (jumlah terjual × harga_modal snapshot)
  - **Laba/Rugi Kotor** = Omzet − HPP
  - **Total Pembelian (informasi)** = Σ total_pembayaran pembelian pada periode
- **FR-LAP-3**: Tampilkan rincian per barang (jumlah terjual, omzet, HPP, laba) dan ringkasan total. Nilai negatif ditandai **Rugi** (warna merah), positif **Laba** (hijau).

### 4.7 Ekspor Laporan — khusus Admin
- **FR-EXP-1**: Ekspor laporan laba/rugi ke **PDF** (judul toko, periode, tabel rincian, ringkasan).
- **FR-EXP-2**: Ekspor ke **Excel (.xlsx)** dengan kolom terstruktur.
- **FR-EXP-3**: Ekspor mengikuti filter periode yang sedang aktif. (Opsional: ekspor history penjualan & pembelian.)
- Library usulan: jsPDF + jspdf-autotable (PDF), SheetJS atau ExcelJS (Excel).

### 4.8 Kelola Akun Pegawai — khusus Admin

| Field | Tipe | Keterangan |
|---|---|---|
| nama | VARCHAR(100) | Nama pegawai |
| username | VARCHAR(50), unik | |
| password | Input saat buat/reset | Disimpan sebagai hash bcrypt |
| is_active | BOOLEAN | Nonaktif = tidak bisa login |

- **FR-PGW-1**: Admin dapat menambah, mengubah, mereset password, dan menonaktifkan akun Pegawai.
- **FR-PGW-2**: Pegawai tidak dapat mengubah akun/role (miliknya maupun orang lain).
- **FR-PGW-3**: Akun yang sudah punya riwayat transaksi tidak dihapus permanen, cukup dinonaktifkan agar jejak `created_by` tetap utuh.
- **FR-PGW-4**: Penambahan akun Admin baru hanya melalui seed/database, tidak melalui menu ini.

### 4.9 Audit Log — khusus Admin

- **FR-LOG-1**: Sistem mencatat otomatis: login berhasil/gagal, logout, input penjualan, void penjualan (beserta alasan), pembelian/tambah stok, perubahan barang/kategori/akun, dan **upaya akses ditolak (403)**.
- **FR-LOG-2**: Kolom: waktu, user, role, aksi, entitas, id entitas, detail, alamat IP.
- **FR-LOG-3**: Log bersifat **append-only**: tidak dapat diubah atau dihapus melalui aplikasi.
- **FR-LOG-4**: Admin dapat memfilter log berdasarkan tanggal, user, dan jenis aksi.

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

### 5.4 Kontrol Akses Berbasis Role (RBAC)
- Otorisasi **ditegakkan di backend**: middleware `requireRole` pada setiap endpoint. Menyembunyikan menu di frontend hanya untuk kenyamanan, bukan pengaman.
- Pegawai hanya diizinkan: `POST /penjualan` (tambah), `GET /penjualan/hari-ini`, daftar barang minimal untuk pilihan (kode, nama, harga jual, stok; **tanpa MOD**), dan login/logout. Selain itu → `403`.
- Role dan `created_by` selalu ditentukan server dari token, tidak dari body request.
- Cegah IDOR/manipulasi parameter: Pegawai tidak bisa meminta data di luar "hari ini" dengan mengganti query string.
- Percobaan akses ditolak dicatat di audit log.

---

## 6. Rancangan Database (Ringkas)

```
users        (id, nama, username UNIQUE, password_hash, role ENUM('admin','pegawai'),
              is_active, created_at)
kategori     (id, nama_kategori UNIQUE)
barang       (id, MOD, kode_barang UNIQUE, nama_barang, kategori_id FK, merk,
              stok_awal, total_masuk, total_keluar, stok_akhir,
              harga_jual, keterangan, deleted_at)
penjualan    (id, barang_id FK, kode_barang, nama_barang, harga_jual,
              harga_modal, jumlah, omzet_penjualan, tanggal,
              created_by FK → users, created_at,
              status ENUM('aktif','batal') DEFAULT 'aktif',
              voided_by FK → users, voided_at, void_reason)
pembelian    (id, barang_id FK, kode_barang, nama_barang, harga_lama,
              harga_baru_modal_satuan, jumlah_masuk, total_pembayaran,
              tanggal, created_by FK → users, created_at)
audit_log    (id, waktu, user_id FK, role, aksi, entitas, entitas_id,
              detail, ip_address)
```

Relasi: `kategori 1 — N barang`, `barang 1 — N penjualan`, `barang 1 — N pembelian`, `users 1 — N penjualan/pembelian/audit_log`.

Aturan data:
- Operasi penjualan/pembelian memakai **database transaction** agar stok dan catatan selalu konsisten.
- Indeks pada `tanggal`, `barang_id`, dan `kode_barang` untuk performa laporan.
- Data penjualan bersifat **immutable**: tidak ada UPDATE/DELETE biasa, koreksi hanya lewat void (status `batal`).
- Laporan dan perhitungan omzet hanya memakai baris dengan `status = 'aktif'`.

---

## 7. Alur Utama

1. **Login** → dashboard.
2. **Siapkan data**: tambah kategori → tambah barang (kode otomatis).
3. **Pembelian / tambah stok** → stok_akhir naik, MOD diperbarui.
4. **Penjualan** → stok_akhir turun, omzet tercatat, grafik diperbarui.
5. **Laporan** → pilih periode → lihat laba/rugi → ekspor PDF/Excel.
6. **Logout**.

**Alur Pegawai:** login → otomatis ke `/penjualan` → input penjualan → lihat daftar penjualan hari ini (read-only) → logout. Jika ada kesalahan input, Pegawai menghubungi Admin; Admin membatalkan (void) dengan alasan lalu input ulang. Seluruh langkah tercatat di audit log.

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
- [ ] Akun Pegawai hanya melihat menu Penjualan dan Logout; membuka URL menu Admin diarahkan ke `/penjualan`.
- [ ] Endpoint Admin yang dipanggil dengan token Pegawai mengembalikan 403 dan tercatat di audit log.
- [ ] Pegawai dapat menambah penjualan, tetapi tidak ada cara (UI maupun API) untuk mengubah atau menghapus penjualan yang sudah tersimpan.
- [ ] Pegawai tidak dapat mengubah tanggal transaksi dan tidak melihat harga modal/laba.
- [ ] Admin dapat void penjualan dengan alasan wajib; stok kembali otomatis dan baris batal tidak masuk laporan.
- [ ] Admin dapat menambah, mereset password, dan menonaktifkan akun Pegawai; akun nonaktif tidak bisa login.
- [ ] Audit log mencatat input penjualan, void, dan upaya akses ditolak, serta tidak dapat diubah lewat aplikasi.

---

## 10. Rencana Rilis (Usulan)

| Fase | Cakupan |
|---|---|
| 1 | Setup proyek, database, autentikasi, role Admin/Pegawai (RBAC), route guard, keamanan dasar |
| 2 | Kelola kategori & barang (termasuk generator kode & modal tambah stok) |
| 3 | Input penjualan (termasuk proteksi data & void), history, grafik, akun pegawai, audit log |
| 4 | Input pembelian |
| 5 | Laporan laba/rugi & ekspor PDF/Excel |
| 6 | Pengujian, hardening keamanan, deployment |

---

## 11. Asumsi & Pertanyaan Terbuka

1. **Backend**: PRD mengasumsikan Node.js + Express karena Vue.js (frontend) tidak dapat terhubung aman langsung ke MySQL. Bisa diganti (Laravel, dll.).
2. **Tipe `MOD` VARCHAR(5)**: hanya muat 5 karakter (maks. Rp 99.999). Jika ada barang dengan modal ≥ Rp 100.000, nilai akan terpotong/ditolak. Disarankan diubah ke `DECIMAL(12,2)`. Mohon konfirmasi.
3. **Penomoran kode barang**: diasumsikan per prefix merk (`C23PHI00001`, `C23PHI00002`, …), bukan urut global seluruh barang. Mohon konfirmasi.
4. **Perhitungan HPP**: memakai modal terakhir (MOD) saat penjualan terjadi, bukan FIFO/rata-rata.
5. **Koreksi transaksi penjualan**: tidak ada edit/hapus; koreksi lewat pembatalan (void) oleh Admin dengan alasan wajib dan koreksi stok otomatis. Koreksi transaksi pembelian belum ditentukan (disarankan pola yang sama).
6. **Kredensial default** `admin/admin` hanya untuk pengembangan; sangat disarankan diganti sebelum sistem dapat diakses publik.
7. **Satu barang per input** pada form penjualan/pembelian (tidak ada keranjang multi-item), sesuai spesifikasi.
8. **Pegawai melihat daftar penjualan hari ini** (read-only) agar bisa memastikan inputnya tersimpan. Jika tidak diinginkan, cukup tampilkan notifikasi sukses saja.
9. **Admin tidak mengedit jumlah penjualan secara langsung**, hanya void lalu input ulang, agar jejak perubahan selalu ada. Mohon konfirmasi.
10. **Jumlah akun Pegawai**: tidak dibatasi. Pegawai tidak dapat mengganti password sendiri; reset dilakukan Admin.
