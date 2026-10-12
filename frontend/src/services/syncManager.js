import { ref } from 'vue';
import db from '../db/clientDb';
import api from '../api';

export const isOnline = ref(navigator.onLine);
export const isSyncing = ref(false);
export const pendingCount = ref(0);
export const lastSyncTime = ref(null);
export const syncStatusMessage = ref('');

/**
 * Hitung jumlah antrean yang belum tersinkron
 */
export async function updatePendingCount() {
  try {
    const count = await db.sync_queue.count();
    pendingCount.value = count;
    return count;
  } catch (err) {
    console.error('Failed to count sync_queue:', err);
    return 0;
  }
}

/**
 * Cek konektivitas riil ke server (bukan hanya WiFi/LAN)
 */
export async function checkServerConnection() {
  if (!navigator.onLine) {
    isOnline.value = false;
    return false;
  }
  try {
    // Ping ringan ke API
    await api.get('/barang/lookup', { params: { search: '' }, timeout: 4000 });
    isOnline.value = true;
    return true;
  } catch (err) {
    // Jika network error atau timeout
    if (!err.response || err.code === 'ECONNABORTED' || !navigator.onLine) {
      isOnline.value = false;
      return false;
    }
    // Jika server merespons (misal 401 unauthorized), server tetap online
    isOnline.value = true;
    return true;
  }
}

/**
 * 1. Mirroring / Clone Katalog dari DB Server ke DB Client (IndexedDB)
 */
export async function mirrorCatalogFromServer() {
  if (!isOnline.value) return false;
  try {
    syncStatusMessage.value = 'Menyinkronkan katalog barang dari server...';
    
    const [barangRes, kategoriRes] = await Promise.all([
      api.get('/barang', { params: { limit: 5000 } }).catch(() => null),
      api.get('/kategori').catch(() => null)
    ]);

    if (kategoriRes?.data?.data) {
      await db.kategori.clear();
      await db.kategori.bulkPut(kategoriRes.data.data);
    }

    if (barangRes?.data?.data) {
      await db.barang.clear();
      await db.barang.bulkPut(barangRes.data.data);
    }

    lastSyncTime.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    await db.meta.put({ key: 'last_catalog_sync', value: new Date().toISOString() });
    syncStatusMessage.value = 'Katalog offline siap digunakan.';
    window.dispatchEvent(new CustomEvent('catalog-mirrored'));
    return true;
  } catch (err) {
    console.error('Mirroring catalog failed:', err);
    syncStatusMessage.value = 'Gagal memperbarui salinan katalog offline.';
    return false;
  }
}

/**
 * 2. Masukkan transaksi/aksi ke antrean lokal saat Offline
 */
export async function queueOfflineAction(endpoint, method, payload, description = '') {
  try {
    const queueItem = {
      endpoint,
      method: method.toUpperCase(),
      payload,
      description: description || `${method.toUpperCase()} ${endpoint}`,
      created_at: new Date().toISOString(),
      attempts: 0
    };

    const id = await db.sync_queue.add(queueItem);
    await updatePendingCount();

    // Jika ini transaksi penjualan, simpan juga ke riwayat lokal kasir & kurangi stok lokal
    if (endpoint.includes('/penjualan') && method.toUpperCase() === 'POST') {
      const item = await db.barang.get(payload.barang_id);
      if (item) {
        // Kurangi stok di DB Client
        const newStock = Math.max(0, (item.stok_akhir || 0) - (payload.jumlah || 1));
        await db.barang.update(item.id, { stok_akhir: newStock });

        // Simpan ke offline_sales
        await db.offline_sales.add({
          client_tx_id: `OFFLINE-${Date.now()}`,
          barang_id: item.id,
          kode_barang: item.kode_barang,
          nama_barang: item.nama_barang,
          harga_jual: item.harga_jual,
          jumlah: payload.jumlah || 1,
          omzet_penjualan: (item.harga_jual || 0) * (payload.jumlah || 1),
          tanggal: payload.tanggal || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          status: 'pending_sync'
        });
      }
    } else if (endpoint.includes('/pembelian') && method.toUpperCase() === 'POST') {
      // Jika ini transaksi pembelian/restock, tambah stok lokal & update MOD
      const item = await db.barang.get(payload.barang_id);
      if (item) {
        const newStock = (item.stok_akhir || 0) + (payload.jumlah_masuk || 0);
        await db.barang.update(item.id, {
          stok_akhir: newStock,
          modal_harga_beli: payload.harga_beli,
          MOD: payload.harga_baru_modal_satuan
        });
      }
    }

    return id;
  } catch (err) {
    console.error('Failed to queue offline action:', err);
    throw err;
  }
}

/**
 * 3. Kirim antrean DB Client ke DB Server saat Online (Outbox Push)
 */
export async function processSyncQueue() {
  if (isSyncing.value) return;
  const connected = await checkServerConnection();
  if (!connected) return;

  const count = await updatePendingCount();
  if (count === 0) return;

  isSyncing.value = true;
  syncStatusMessage.value = `Mengirim ${count} transaksi offline ke server...`;

  try {
    const items = await db.sync_queue.orderBy('id').toArray();

    for (const item of items) {
      try {
        await api({
          url: item.endpoint,
          method: item.method,
          data: item.payload
        });

        // Sukses dikirim -> hapus dari antrean lokal
        await db.sync_queue.delete(item.id);
        await updatePendingCount();
      } catch (reqErr) {
        console.error(`Gagal mengirim antrean #${item.id}:`, reqErr);
        // Jika error jaringan, hentikan loop sementara
        if (!reqErr.response) {
          isOnline.value = false;
          break;
        }
        // Jika error validasi server (misal duplikat/invalid data), catat attempt
        await db.sync_queue.update(item.id, { attempts: (item.attempts || 0) + 1 });
      }
    }

    const remaining = await updatePendingCount();
    if (remaining === 0) {
      syncStatusMessage.value = 'Semua data offline berhasil disinkronkan ke server!';
      // Bersihkan offline sales yang sudah terkirim
      await db.offline_sales.clear();
      // Segarkan kembali katalog di DB client agar stok ter-update dari server
      await mirrorCatalogFromServer();
      window.dispatchEvent(new CustomEvent('sync-complete'));
    } else {
      syncStatusMessage.value = `Sisa ${remaining} data dalam antrean sinkronisasi.`;
    }
  } catch (err) {
    console.error('Error during processSyncQueue:', err);
  } finally {
    isSyncing.value = false;
  }
}

/**
 * 4. Pencarian barang lokal di DB Client (untuk Mode Offline)
 */
export async function searchLocalBarang(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const term = keyword.trim().toLowerCase();
  try {
    const all = await db.barang.toArray();
    return all.filter(b => {
      const matchNama = b.nama_barang && b.nama_barang.toLowerCase().includes(term);
      const matchKode = b.kode_barang && b.kode_barang.toLowerCase().includes(term);
      const matchMerk = b.merk && b.merk.toLowerCase().includes(term);
      return matchNama || matchKode || matchMerk;
    }).slice(0, 30);
  } catch (err) {
    console.error('searchLocalBarang error:', err);
    return [];
  }
}

/**
 * Inisialisasi pendengar jaringan & auto-sync otomatis
 */
export function initSyncService() {
  updatePendingCount();

  window.addEventListener('online', async () => {
    isOnline.value = true;
    syncStatusMessage.value = 'Terhubung kembali ke internet. Memulai sinkronisasi...';
    await processSyncQueue();
  });

  window.addEventListener('offline', () => {
    isOnline.value = false;
    syncStatusMessage.value = 'Koneksi terputus. Mode Offline aktif (data tersimpan di perangkat).';
  });

  // Heartbeat cek berkala setiap 25 detik
  setInterval(async () => {
    const wasOnline = isOnline.value;
    const nowOnline = await checkServerConnection();
    if (!wasOnline && nowOnline) {
      await processSyncQueue();
    } else if (nowOnline && pendingCount.value > 0 && !isSyncing.value) {
      await processSyncQueue();
    }
  }, 25000);

  // Jika online saat aplikasi dimuat, sinkronkan antrean & perbarui katalog
  if (navigator.onLine) {
    checkServerConnection().then(online => {
      if (online) {
        processSyncQueue().then(() => {
          mirrorCatalogFromServer();
        });
      }
    });
  }
}
