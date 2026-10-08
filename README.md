# Sistem Manajemen Toko Listrik Citra 23 Palu

Aplikasi web manajemen inventaris stok, transaksi penjualan (kasir), pembelian pasokan, laba/rugi, dan audit log untuk **Toko Listrik Citra 23 Palu**.

---

## 🎨 Tema & Desain UI/UX
* **Palet Warna**: Kanvas Putih Bersih (`#FFFFFF` & `#F8FAFC`) dengan warna dominan **Electric Cobalt Blue** (`#005CE6`).
* **Tipografi**: *Plus Jakarta Sans* (modern, keterbacaan tinggi, tabular angka Rupiah).
* **Ikonografi**: *Lucide SVG Icons* konsisten, clean micro-interactions.
* **Prinsip Operasional**: Mode *Operate* (antarmuka cepat untuk kasir & inventaris, scannable data table, visual alert stok kritis).

---

## 🔐 Akun Pengguna Awal (Seeder)

| Role | Username | Password | Hak Akses |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Akses penuh: Dashboard, Kategori, Barang, Penjualan + Void, Pembelian, Laporan + Ekspor PDF/Excel, Akun Pegawai, Audit Log |
| **Pegawai (Kasir 1)** | `kasir1` | `kasir123` | Akses kasir: Form Penjualan baru & Penjualan Hari Ini (read-only, tanpa harga modal/MOD & laba) |
| **Pegawai (Kasir 2)** | `budi` | `kasir123` | Akses kasir standar |

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Database (MySQL)
Pastikan MySQL berjalan (misalnya melalui Laragon / XAMPP di port 3306).
Database: `toko_citra23` (skema dan seed data sudah otomatis dimigrasikan).

### 2. Backend (Express REST API)
```bash
cd backend
npm install
npm run seed     # (opsional, jika ingin mereset data awal)
npm start        # Berjalan di http://localhost:5000
```

### 3. Frontend (Vue 3 + Vite)
```bash
cd frontend
npm install
npm run dev      # Berjalan di http://localhost:5173
```

Buka peramban Anda di: **`http://localhost:5173`**

---

## 🛡️ Fitur Keamanan & Perlindungan Data
1. **Anti-Dorking**: `robots.txt Disallow: /`, header `X-Robots-Tag: noindex, nofollow`, meta tag `noindex`.
2. **Integritas Penjualan**: Transaksi bersifat *immutable* (tidak ada tombol ubah/hapus). Koreksi transaksi hanya dapat dilakukan oleh Admin melalui mekanisme **Void** dengan alasan wajib dan pengembalian stok otomatis.
3. **Role-Based Access Control (RBAC)**: Validasi token JWT dan otorisasi server-side pada setiap rute API.
4. **Audit Trail**: Pencatatan otomatis ke tabel `audit_log` (append-only) untuk setiap transaksi, void, perubahan inventaris, dan percobaan akses terlarang (403).
