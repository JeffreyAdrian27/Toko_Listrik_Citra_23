<template>
  <AppLayout>
    <!-- Offline Notice Banner -->
    <div v-if="!isOnline" class="card" style="margin-bottom: 20px; border-left: 4px solid #F59E0B; background: #FFFBEB;">
      <div style="padding: 12px 18px; display: flex; align-items: center; gap: 12px;">
        <WifiOff :size="20" style="color: #D97706; flex-shrink: 0;" />
        <div>
          <div style="font-weight: 700; font-size: 0.9rem; color: #92400E;">Mode Offline Aktif</div>
          <div style="font-size: 0.8rem; color: #B45309;">
            Koneksi ke server terputus. Anda tetap dapat mencari barang dan mencatat restock/pembelian. Data akan disimpan di perangkat dan otomatis disinkronkan ke server saat online.
          </div>
        </div>
      </div>
    </div>

    <!-- Form Input Pembelian -->
    <div class="card overflow-visible" style="position: relative; z-index: 30;">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Truck :size="20" style="color: var(--color-primary);" />
          <div>
            <h3 class="card-title">Input Pembelian Barang &amp; Pembaruan MOD</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
              Pilih barang dan kode MOD dari Master MOD untuk update stok &amp; harga modal otomatis.
            </p>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div v-if="successMsg" class="badge badge-success" style="display: block; margin-bottom: 16px; padding: 12px;">
          {{ successMsg }}
        </div>
        <div v-if="errorMsg" class="badge badge-danger" style="display: block; margin-bottom: 16px; padding: 12px;">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="submitPembelian">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <!-- Autocomplete Barang -->
            <div class="form-group" style="position: relative;">
              <label class="form-label">Cari &amp; Pilih Barang</label>
              <div class="search-input-box" style="position: relative;">
                <Search :size="16" class="icon" />
                <input
                  v-model="searchQuery"
                  @input="searchItems"
                  type="text"
                  class="form-input"
                  placeholder="Ketik kode atau nama barang..."
                  autocomplete="off"
                  style="padding-right: 32px;"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  @click="clearSelection"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; padding: 2px;"
                  title="Hapus / Reset Pilihan"
                >
                  <X :size="16" />
                </button>

                <!-- Search dropdown berada pas di bawah input box -->
                <div v-if="searchResults.length > 0" class="autocomplete-dropdown">
                  <div
                    v-for="item in searchResults"
                    :key="item.id"
                    @mousedown.prevent="selectItem(item)"
                    @click="selectItem(item)"
                    class="autocomplete-item"
                  >
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-weight: 700; color: var(--color-primary);">{{ item.kode_barang }}</span>
                      <span class="badge badge-blue">Stok: {{ item.stok_akhir }}</span>
                    </div>
                    <div style="font-weight: 600; font-size: 0.85rem; margin-top: 2px;">{{ item.nama_barang }}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                      MOD Sekarang: <strong style="font-family: monospace; color: var(--color-primary);">{{ item.MOD || '-' }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detail Barang Terpilih -->
            <div class="form-group" style="background: #F8FAFC; border: 1px solid var(--border-light); padding: 14px; border-radius: var(--radius-md);">
              <label class="form-label" style="color: var(--text-muted); margin-bottom: 4px;">Barang Terpilih:</label>
              <div v-if="selectedItem">
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">
                  {{ selectedItem.nama_barang }}
                </div>
                <div style="display: flex; gap: 14px; margin-top: 6px; font-size: 0.825rem;">
                  <span>Kode: <strong>{{ selectedItem.kode_barang }}</strong></span>
                  <span>MOD Lama: <strong style="font-family: monospace; color: var(--color-primary); font-size: 0.95rem;">{{ selectedItem.MOD || '-' }}</strong></span>
                </div>
              </div>
              <div v-else style="color: var(--text-subtle); font-size: 0.85rem; padding-top: 6px;">
                Belum ada barang dipilih. Silakan cari pada kolom di sebelah kiri.
              </div>
            </div>
          </div>

          <!-- Format Kolom: HARGA LAMA & HARGA BELI (AUTO-GENERATE MOD) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 14px;">
            <div class="form-group">
              <label class="form-label" style="color: #475569; font-weight: 700;">HARGA LAMA (MOD)</label>
              <div class="form-input" style="background: #F1F5F9; font-family: monospace; font-weight: 800; font-size: 1.05rem; text-align: center; color: var(--color-primary); display: flex; align-items: center; justify-content: center; height: 42px;">
                {{ selectedItem ? (selectedItem.MOD || '-') : '-' }}
              </div>
              <p class="form-help">Kode MOD satuan sebelumnya.</p>
            </div>

            <!-- Input Harga Beli Modal Satuan (Rp) -->
            <div class="form-group">
              <label class="form-label" for="harga_beli_satuan" style="font-weight: 700;">
                HARGA BELI MODAL (RP) <span style="color: red;">*</span>
              </label>
              <input
                id="harga_beli_satuan"
                v-model.number="form.harga_beli"
                type="number"
                min="0"
                step="100"
                class="form-input num"
                placeholder="Contoh: 54000 atau 20000"
                required
                :disabled="!selectedItem"
              />
              <p class="form-help">
                <span v-if="form.harga_beli > 0" style="color: #059669; font-weight: 600;">
                  Terbaca: Rp {{ formatNumber(form.harga_beli) }}
                </span>
                <span v-else>Harga kulakan/beli asli dari supplier.</span>
              </p>
            </div>

            <!-- Kode MOD Ter-Generate Otomatis -->
            <div class="form-group">
              <label class="form-label" style="color: #475569; font-weight: 700;">
                MOD BARU (AUTO-GENERATE)
              </label>
              <div class="form-input" style="background: #EEF2FF; border: 1px solid #C7D2FE; font-family: monospace; font-weight: 800; font-size: 1.15rem; text-align: center; color: #4F46E5; display: flex; align-items: center; justify-content: center; height: 42px;">
                {{ generatedMod || '-' }}
              </div>
              <p class="form-help">
                <span v-if="generatedMod" style="color: #4F46E5; font-weight: 600;">
                  ✨ Rumus MOD otomatis.
                </span>
                <span v-else>Otomatis muncul dari harga beli.</span>
              </p>
            </div>

            <div class="form-group">
              <label class="form-label" for="jumlah_masuk" style="font-weight: 700;">JUMLAH MASUK (UNIT) <span style="color: red;">*</span></label>
              <input
                id="jumlah_masuk"
                v-model.number="form.jumlah_masuk"
                type="number"
                class="form-input num"
                min="1"
                required
                :disabled="!selectedItem"
              />
              <p class="form-help">
                <span v-if="form.harga_beli > 0 && form.jumlah_masuk > 0" style="color: #059669; font-weight: 700;">
                  Total: Rp {{ formatNumber(form.harga_beli * form.jumlah_masuk) }}
                </span>
                <span v-else>Jumlah barang masuk.</span>
              </p>
            </div>

            <div class="form-group">
              <label class="form-label" for="tgl_beli" style="font-weight: 700;">TANGGAL PEMBELIAN</label>
              <input
                id="tgl_beli"
                v-model="form.tanggal"
                type="date"
                class="form-input"
                required
              />
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div v-if="form.harga_beli > 0 && form.jumlah_masuk > 0" style="font-size: 0.95rem; color: #0F172A;">
              Total Pembayaran Pasokan: <strong style="color: var(--color-primary); font-size: 1.15rem;">Rp {{ formatNumber(form.harga_beli * form.jumlah_masuk) }}</strong>
            </div>
            <div v-else></div>

            <button
              type="submit"
              class="btn btn-primary"
              style="padding: 12px 28px; font-size: 0.95rem;"
              :disabled="saving || !selectedItem || !form.harga_beli || form.harga_beli <= 0 || form.jumlah_masuk <= 0"
            >
              <Check :size="18" />
              <span>{{ saving ? 'Menyimpan...' : 'Simpan Pembelian & Update MOD' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Riwayat Pembelian dengan Filter Tahunan & Pagination 5 Transaksi per Halaman -->
    <div class="card" style="margin-top: 32px;">
      <div class="card-header">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <h3 class="card-title">Tabel Riwayat Pembelian &amp; Perubahan MOD</h3>
          
          <!-- Filter Periode: Pilihan Bulan atau 1 Tahun Penuh -->
          <select v-model="filter.bulan" @change="onFilterChange" class="form-select" style="min-width: 180px;">
            <option value="all">📅 Semua Bulan (1 Tahun Penuh)</option>
            <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
          </select>

          <!-- Filter Tahun -->
          <select v-model="filter.tahun" @change="onFilterChange" class="form-select" style="width: 110px;">
            <option v-for="y in [2024, 2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div style="font-weight: 700; color: var(--color-primary);">
          Total Pasokan: {{ historyData.total_qty }} unit ({{ historyData.total_transaksi }} transaksi)
        </div>
      </div>

      <LoadingSpinner
        v-if="historyLoading"
        text="Memuat riwayat pembelian &amp; pasokan..."
        minHeight="200px"
      />

      <div v-else class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th>Tanggal</th>
              <th>Kode Barang</th>
              <th>Nama Produk</th>
              <!-- Kolom persis seperti di foto 2 -->
              <th style="text-align: center; width: 140px; background: #EEF4FF; color: var(--color-primary); font-weight: 800;">
                HARGA LAMA
              </th>
              <th style="text-align: center; width: 190px; background: #EEF4FF; color: var(--color-primary); font-weight: 800;">
                HARGA BARU MODAL SATUAN
              </th>
              <th style="text-align: center;">Jumlah Masuk</th>
              <th style="text-align: right;">Total Biaya (Rp)</th>
              <th>Dicatat Oleh</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in paginatedHistory" :key="row.id">
              <td>{{ (historyPage - 1) * historyPageSize + idx + 1 }}</td>
              <td style="font-size: 0.8rem;">{{ formatDate(row.tanggal) }}</td>
              <td><span class="badge badge-blue">{{ row.kode_barang }}</span></td>
              <td style="font-weight: 600;">{{ row.nama_barang }}</td>
              <!-- Nilai Harga Lama (Kode Huruf MOD) -->
              <td style="text-align: center;">
                <span class="badge" style="background: #F1F5F9; color: #475569; font-family: monospace; font-weight: 800; font-size: 0.95rem; padding: 4px 10px;">
                  {{ row.harga_lama || '-' }}
                </span>
              </td>
              <!-- Nilai Harga Baru Modal Satuan (Kode Huruf MOD) -->
              <td style="text-align: center;">
                <span class="badge" style="background: #EBF3FF; color: #005CE6; font-family: monospace; font-weight: 800; font-size: 0.95rem; padding: 4px 12px; border: 1px solid var(--color-primary-border);">
                  {{ row.harga_baru_modal_satuan }}
                </span>
              </td>
              <td class="num" style="text-align: center; font-weight: 700; color: var(--status-success);">
                +{{ row.jumlah_masuk }} unit
              </td>
              <td class="num" style="text-align: right; font-weight: 700; color: #0F172A;">
                Rp {{ formatNumber(row.total_pembayaran) }}
              </td>
              <td style="font-size: 0.8rem; color: var(--text-muted);">
                {{ row.created_by_nama || 'Admin' }}
              </td>
            </tr>
            <tr v-if="!historyData.data || historyData.data.length === 0">
              <td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">
                Belum ada transaksi pembelian pada periode terpilih.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Riwayat Pembelian (5 Transaksi per Halaman) -->
      <div v-if="historyData.data && historyData.data.length > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          Menampilkan halaman <strong>{{ historyPage }}</strong> dari <strong>{{ historyTotalPages }}</strong> (Total <strong>{{ historyData.total_transaksi }}</strong> transaksi &bull; 5 per halaman)
        </span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button
            @click="historyPage--"
            :disabled="historyPage <= 1"
            class="btn btn-sm btn-secondary"
            title="Halaman Sebelumnya"
          >
            Sebelumnya
          </button>
          
          <button
            v-for="p in displayedHistoryPages"
            :key="p"
            @click="historyPage = p"
            class="btn btn-sm"
            :class="historyPage === p ? 'btn-primary' : 'btn-secondary'"
            style="min-width: 32px; padding: 4px 8px; font-weight: 700;"
          >
            {{ p }}
          </button>

          <button
            @click="historyPage++"
            :disabled="historyPage >= historyTotalPages"
            class="btn btn-sm btn-secondary"
            title="Halaman Selanjutnya"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
import { db } from '../db/clientDb';
import { isOnline, queueOfflineAction, searchLocalBarang } from '../services/syncManager';
import { hargaToMod, modToHarga } from '../utils/modHelper';
import { Truck, Search, Check, X, WifiOff } from 'lucide-vue-next';

const route = useRoute();

const searchQuery = ref('');
const searchResults = ref([]);
const selectedItem = ref(null);
const saving = ref(false);
const historyLoading = ref(true);
const successMsg = ref('');
const errorMsg = ref('');

const form = reactive({
  harga_beli: 0,
  jumlah_masuk: 1,
  tanggal: new Date().toISOString().split('T')[0]
});

const generatedMod = computed(() => {
  return hargaToMod(form.harga_beli);
});

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const filter = reactive({
  bulan: new Date().getMonth() + 1,
  tahun: new Date().getFullYear()
});

const historyData = ref({ data: [], total_qty: 0, total_transaksi: 0 });

// Pagination Riwayat Pembelian: 5 transaksi per halaman
const historyPage = ref(1);
const historyPageSize = 5;

const paginatedHistory = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize;
  return (historyData.value.data || []).slice(start, start + historyPageSize);
});

const historyTotalPages = computed(() => {
  return Math.ceil((historyData.value.data?.length || 0) / historyPageSize) || 1;
});

const displayedHistoryPages = computed(() => {
  const total = historyTotalPages.value || 1;
  if (total <= 5) {
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(1, Math.min(historyPage.value, total - 4));
  const pages = [];
  for (let i = 0; i < 5; i++) {
    pages.push(start + i);
  }
  return pages;
});

const onFilterChange = () => {
  historyPage.value = 1;
  fetchHistory();
};

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

let searchTimeout = null;
const searchItems = () => {
  clearTimeout(searchTimeout);
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  searchTimeout = setTimeout(async () => {
    if (!isOnline.value) {
      searchResults.value = await searchLocalBarang(searchQuery.value);
      return;
    }
    try {
      const res = await api.get('/barang', {
        params: { search: searchQuery.value, limit: 10 }
      });
      searchResults.value = res.data.data;
    } catch (err) {
      console.warn('Search server gagal, fallback ke database lokal:', err);
      searchResults.value = await searchLocalBarang(searchQuery.value);
    }
  }, 250);
};

const selectItem = (item) => {
  selectedItem.value = item;
  searchQuery.value = `[${item.kode_barang}] ${item.nama_barang}`;
  searchResults.value = [];
  
  if (item.modal_harga_beli && Number(item.modal_harga_beli) > 0) {
    form.harga_beli = Number(item.modal_harga_beli);
  } else if (item.MOD) {
    form.harga_beli = modToHarga(item.MOD);
  } else {
    form.harga_beli = 0;
  }

  if (!form.jumlah_masuk || form.jumlah_masuk <= 0) {
    form.jumlah_masuk = 10;
  }
};

const clearSelection = () => {
  searchQuery.value = '';
  searchResults.value = [];
  selectedItem.value = null;
  form.harga_beli = 0;
  form.jumlah_masuk = 10;
};

const submitPembelian = async () => {
  if (!selectedItem.value) return;
  if (!form.harga_beli || form.harga_beli <= 0) {
    errorMsg.value = 'Harga beli modal satuan harus diisi dan lebih besar dari 0.';
    return;
  }
  saving.value = true;
  successMsg.value = '';
  errorMsg.value = '';

  // 1. JIKA OFFLINE: Simpan ke Client DB & antrean sinkronisasi
  if (!isOnline.value) {
    try {
      const payload = {
        barang_id: selectedItem.value.id,
        harga_beli: form.harga_beli,
        harga_baru_modal_satuan: generatedMod.value,
        jumlah_masuk: form.jumlah_masuk,
        tanggal: form.tanggal
      };

      await queueOfflineAction(
        '/pembelian',
        'POST',
        payload,
        `Pembelian [${selectedItem.value.nama_barang}] +${form.jumlah_masuk} unit`
      );

      // Tambahkan stok lokal di IndexedDB secara langsung
      const localItem = await db.barang.get(selectedItem.value.id);
      let newStok = (selectedItem.value.stok_akhir || 0) + form.jumlah_masuk;
      if (localItem) {
        newStok = (localItem.stok_akhir || 0) + form.jumlah_masuk;
        await db.barang.update(localItem.id, {
          stok_akhir: newStok,
          modal_harga_beli: form.harga_beli,
          MOD: generatedMod.value
        });
      }

      successMsg.value = `[MODE OFFLINE] Pembelian [${selectedItem.value.nama_barang}] +${form.jumlah_masuk} unit berhasil dicatat di perangkat! Sisa stok lokal: ${newStok} unit, MOD baru: "${generatedMod.value}". Data akan disinkronkan ke server saat online.`;

      // Reset form
      searchQuery.value = '';
      selectedItem.value = null;
      form.harga_beli = 0;
      form.jumlah_masuk = 10;
    } catch (err) {
      console.error('Offline restock recording failed:', err);
      errorMsg.value = 'Gagal menyimpan transaksi pembelian ke database lokal perangkat.';
    } finally {
      saving.value = false;
    }
    return;
  }

  // 2. JIKA ONLINE: Kirim langsung ke Server API
  try {
    const res = await api.post('/pembelian', {
      barang_id: selectedItem.value.id,
      harga_beli: form.harga_beli,
      harga_baru_modal_satuan: generatedMod.value,
      jumlah_masuk: form.jumlah_masuk,
      tanggal: form.tanggal
    });

    successMsg.value = `Pembelian berhasil dicatat! Stok [${selectedItem.value.nama_barang}] bertambah ${form.jumlah_masuk} unit (Sisa: ${res.data.data.stok_akhir} unit). MOD otomatis dibuat menjadi "${generatedMod.value}".`;

    // Perbarui stok & MOD di client DB jika ada
    try {
      const localItem = await db.barang.get(selectedItem.value.id);
      if (localItem) {
        await db.barang.update(localItem.id, {
          stok_akhir: res.data.data.stok_akhir,
          modal_harga_beli: form.harga_beli,
          MOD: generatedMod.value
        });
      }
    } catch (e) {}

    // Reset form
    searchQuery.value = '';
    selectedItem.value = null;
    form.harga_beli = 0;
    form.jumlah_masuk = 10;

    historyPage.value = 1;
    fetchHistory();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Gagal memproses transaksi pembelian.';
  } finally {
    saving.value = false;
  }
};

const fetchHistory = async () => {
  historyLoading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 400));
  try {
    const [res] = await Promise.all([
      api.get('/pembelian', {
        params: { bulan: filter.bulan, tahun: filter.tahun }
      }),
      minDelay
    ]);
    historyData.value = res.data;
  } catch (err) {
    console.error('Failed to load purchase history:', err);
  } finally {
    historyLoading.value = false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const checkQueryParam = async () => {
  const barangId = route.query.barang_id;
  if (!barangId) return;
  try {
    const res = await api.get(`/barang/${barangId}`);
    if (res.data && res.data.data) {
      selectItem(res.data.data);
      form.jumlah_masuk = 10;
    }
  } catch (err) {
    console.error('Failed to pre-select item from query:', err);
  }
};

const handleSyncComplete = () => {
  fetchHistory();
};

onMounted(() => {
  fetchHistory();
  checkQueryParam();
  window.addEventListener('sync-complete', handleSyncComplete);
});

onUnmounted(() => {
  window.removeEventListener('sync-complete', handleSyncComplete);
});
</script>

<style scoped>
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
  max-height: 280px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 3px;
  padding-bottom: 4px;
}

.autocomplete-dropdown::-webkit-scrollbar {
  width: 6px;
}

.autocomplete-dropdown::-webkit-scrollbar-track {
  background: #F1F5F9;
  border-radius: 4px;
}

.autocomplete-dropdown::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

.autocomplete-dropdown::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

.autocomplete-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.autocomplete-item:hover {
  background-color: var(--color-primary-light);
}
</style>
