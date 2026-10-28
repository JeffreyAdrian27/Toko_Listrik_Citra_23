/*
SQLyog Ultimate v13.1.1 (64 bit)
MySQL - 8.0.30 : Database - db_toko_citra23
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`tokolist_db_toko_citra23` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `tokolist_db_toko_citra23`;

/*Table structure for table `activity_log` */

DROP TABLE IF EXISTS `activity_log`;

CREATE TABLE `activity_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipe` varchar(50) NOT NULL,
  `judul` varchar(150) NOT NULL,
  `detail` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_activity_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `activity_log` */

/*Table structure for table `barang` */

DROP TABLE IF EXISTS `barang`;

CREATE TABLE `barang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `MOD` varchar(20) NOT NULL DEFAULT '',
  `kode_barang` varchar(30) NOT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `nama_barang` varchar(150) NOT NULL,
  `kategori_id` int NOT NULL,
  `merk` varchar(100) DEFAULT '',
  `stok_awal` int NOT NULL DEFAULT '0',
  `total_masuk` int NOT NULL DEFAULT '0',
  `total_keluar` int NOT NULL DEFAULT '0',
  `stok_akhir` int NOT NULL DEFAULT '0',
  `harga_jual` decimal(12,2) NOT NULL DEFAULT '0.00',
  `modal_harga_beli` decimal(12,2) NOT NULL DEFAULT '0.00',
  `keterangan` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kode_barang` (`kode_barang`),
  KEY `idx_kode_barang` (`kode_barang`),
  KEY `idx_kategori` (`kategori_id`),
  KEY `idx_barcode` (`barcode`),
  CONSTRAINT `fk_barang_kategori` FOREIGN KEY (`kategori_id`) REFERENCES `kategori` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=271 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `barang` */

/*Table structure for table `kategori` */

DROP TABLE IF EXISTS `kategori`;

CREATE TABLE `kategori` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_kategori` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama_kategori` (`nama_kategori`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `kategori` */

/*Table structure for table `password_resets` */

DROP TABLE IF EXISTS `password_resets`;

CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `email` varchar(100) NOT NULL,
  `token` varchar(100) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_email` (`email`),
  KEY `fk_reset_user` (`user_id`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `password_resets` */

/*Table structure for table `pembelian` */

DROP TABLE IF EXISTS `pembelian`;

CREATE TABLE `pembelian` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barang_id` int NOT NULL,
  `kode_barang` varchar(30) NOT NULL,
  `nama_barang` varchar(150) NOT NULL,
  `harga_lama` varchar(20) DEFAULT NULL,
  `harga_baru_modal_satuan` varchar(20) NOT NULL DEFAULT '',
  `jumlah_masuk` int NOT NULL,
  `total_pembayaran` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tanggal` date NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pembelian_tanggal` (`tanggal`),
  KEY `idx_pembelian_barang` (`barang_id`),
  KEY `fk_pembelian_user` (`created_by`),
  CONSTRAINT `fk_pembelian_barang` FOREIGN KEY (`barang_id`) REFERENCES `barang` (`id`),
  CONSTRAINT `fk_pembelian_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=394 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `pembelian` */

/*Table structure for table `penjualan` */

DROP TABLE IF EXISTS `penjualan`;

CREATE TABLE `penjualan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barang_id` int NOT NULL,
  `kode_barang` varchar(30) NOT NULL,
  `nama_barang` varchar(150) NOT NULL,
  `harga_jual` decimal(12,2) NOT NULL,
  `modal_satuan` decimal(12,2) NOT NULL DEFAULT '0.00',
  `jumlah` int NOT NULL,
  `omzet_penjualan` decimal(12,2) NOT NULL,
  `tanggal` date NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('aktif','batal') NOT NULL DEFAULT 'aktif',
  `voided_by` int DEFAULT NULL,
  `voided_at` timestamp NULL DEFAULT NULL,
  `void_reason` text,
  PRIMARY KEY (`id`),
  KEY `idx_penjualan_tanggal` (`tanggal`),
  KEY `idx_penjualan_barang` (`barang_id`),
  KEY `idx_penjualan_status` (`status`),
  KEY `fk_penjualan_user` (`created_by`),
  KEY `fk_penjualan_void_user` (`voided_by`),
  CONSTRAINT `fk_penjualan_barang` FOREIGN KEY (`barang_id`) REFERENCES `barang` (`id`),
  CONSTRAINT `fk_penjualan_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_penjualan_void_user` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `penjualan` */

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','pegawai') NOT NULL DEFAULT 'pegawai',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `users` */

insert  into `users`(`id`,`nama`,`username`,`email`,`password_hash`,`role`,`is_active`,`created_at`) values 
(1,'Administrator Citra 23','admin','liasinata@gmail.com','$2a$10$RMhSawBHRAR7BnM830xfluZeIxblbVRQ60RfhP3k708jXRk/AYzjy','admin',1,'2026-10-10 19:19:27');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
