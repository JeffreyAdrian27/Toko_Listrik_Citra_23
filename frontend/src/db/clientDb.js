import Dexie from 'dexie';

export const db = new Dexie('TokoCitra23_ClientDB');

db.version(1).stores({
  // Katalog barang hasil kloning dari DB Server
  barang: 'id, kode_barang, nama_barang, kategori_id, merk, stok_akhir, harga_jual',
  
  // Kategori hasil kloning dari DB Server
  kategori: 'id, nama_kategori',
  
  // Antrean aksi CRUD yang dilakukan saat offline
  sync_queue: '++id, endpoint, method, created_at, attempts',
  
  // Rekap penjualan lokal untuk tampilan kasir saat offline
  offline_sales: '++id, client_tx_id, barang_id, kode_barang, tanggal, created_at',
  
  // Metadata status sinkronisasi
  meta: 'key'
});

db.version(2).stores({
  barang: 'id, kode_barang, barcode, nama_barang, kategori_id, merk, stok_akhir, harga_jual'
});

export default db;
