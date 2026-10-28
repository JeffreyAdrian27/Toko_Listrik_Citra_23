-- Database Schema Toko Listrik Citra 23 Palu
-- PRD Version 1.2 (MOD Cipher String Code & In-App Activity Notifications)

CREATE DATABASE IF NOT EXISTS db_toko_citra23 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_toko_citra23;

-- 1. Table Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'pegawai') NOT NULL DEFAULT 'pegawai',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Table Kategori
CREATE TABLE IF NOT EXISTS kategori (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_kategori VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Table Barang
CREATE TABLE IF NOT EXISTS barang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode_barang VARCHAR(30) NOT NULL UNIQUE,
  barcode VARCHAR(50) NULL,
  nama_barang VARCHAR(150) NOT NULL,
  kategori_id INT NOT NULL,
  merk VARCHAR(100) NULL DEFAULT '',
  stok_awal INT NOT NULL DEFAULT 0,
  total_masuk INT NOT NULL DEFAULT 0,
  total_keluar INT NOT NULL DEFAULT 0,
  stok_akhir INT NOT NULL DEFAULT 0,
  harga_jual DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  modal_harga_beli DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  keterangan TEXT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kode_barang (kode_barang),
  INDEX idx_barcode (barcode),
  INDEX idx_kategori (kategori_id),
  CONSTRAINT fk_barang_kategori FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. Table Penjualan (Immutable, Koreksi via Void)
CREATE TABLE IF NOT EXISTS penjualan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barang_id INT NOT NULL,
  kode_barang VARCHAR(30) NOT NULL,
  nama_barang VARCHAR(150) NOT NULL,
  harga_jual DECIMAL(12,2) NOT NULL,
  modal_satuan DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  jumlah INT NOT NULL,
  omzet_penjualan DECIMAL(12,2) NOT NULL,
  tanggal DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('aktif', 'batal') NOT NULL DEFAULT 'aktif',
  voided_by INT NULL,
  voided_at TIMESTAMP NULL DEFAULT NULL,
  void_reason TEXT NULL,
  INDEX idx_penjualan_tanggal (tanggal),
  INDEX idx_penjualan_barang (barang_id),
  INDEX idx_penjualan_status (status),
  CONSTRAINT fk_penjualan_barang FOREIGN KEY (barang_id) REFERENCES barang(id),
  CONSTRAINT fk_penjualan_user FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_penjualan_void_user FOREIGN KEY (voided_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 5. Table Pembelian (Tabel Harga Lama & Harga Baru Modal Satuan dengan kode huruf MOD)
CREATE TABLE IF NOT EXISTS pembelian (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barang_id INT NOT NULL,
  kode_barang VARCHAR(30) NOT NULL,
  nama_barang VARCHAR(150) NOT NULL,
  harga_lama VARCHAR(20) NULL DEFAULT NULL,
  harga_baru_modal_satuan VARCHAR(20) NOT NULL DEFAULT '',
  jumlah_masuk INT NOT NULL,
  total_pembayaran DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tanggal DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pembelian_tanggal (tanggal),
  INDEX idx_pembelian_barang (barang_id),
  CONSTRAINT fk_pembelian_barang FOREIGN KEY (barang_id) REFERENCES barang(id),
  CONSTRAINT fk_pembelian_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 6. Table Activity Log (Notifikasi Lonceng: Barang Baru, Penjualan Baru, Pembelian Baru)
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipe VARCHAR(50) NOT NULL,
  judul VARCHAR(150) NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB;

-- 7. Table Password Resets (Token pemulihan password via Google SMTP, kadaluarsa 15 menit)
-- Catatan: Data yang sudah kadaluarsa (expires_at < NOW()) atau sudah terpakai otomatis dihapus oleh backend routine.
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(100) NOT NULL,
  token VARCHAR(100) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_email (email),
  INDEX idx_expires (expires_at),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- (Opsional) Event Scheduler MySQL jika ingin pembersihan otomatis langsung di level server database:
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS ev_clean_expired_password_resets
-- ON SCHEDULE EVERY 15 MINUTE
-- DO
--   DELETE FROM password_resets WHERE expires_at < NOW() OR used_at IS NOT NULL;
