<template>
  <AppLayout>
    <!-- Form Input Pembelian -->
    <div class="card">
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
              <div class="search-input-box">
                <Search :size="16" class="icon" />
                <input
                  v-model="searchQuery"
                  @input="searchItems"
                  type="text"
                  class="form-input"
                  placeholder="Ketik kode atau nama barang..."
                  autocomplete="off"
                />
              </div>

              <!-- Search dropdown -->
              <div v-if="searchResults.length > 0" class="autocomplete-dropdown">
                <div
                  v-for="item in searchResults"
                  :key="item.id"
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

          <!-- Format Kolom: HARGA LAMA & HARGA BARU MODAL SATUAN (PILIHAN DARI MASTER MOD) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 14px;">
            <div class="form-group">
              <label class="form-label" style="color: #475569;">HARGA LAMA (MOD)</label>
              <div class="form-input" style="background: #F1F5F9; font-family: monospace; font-weight: 800; font-size: 1.05rem; text-align: center; color: var(--color-primary);">
                {{ selectedItem ? (selectedItem.MOD || '-') : '-' }}
              </div>
              <p class="form-help">Kode MOD satuan sebelumnya.</p>
            </div>

            <!-- Dropdown Pilihan MOD dari Master MOD (Tanpa Keterangan) -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="harga_baru_modal" style="margin-bottom: 0;">HARGA BARU MODAL SATUAN</label>
                <button
                  type="button"
                  @click="openQuickModModal"
                  class="btn-link"
                  style="font-size: 0.75rem; color: var(--color-primary); background: none; border: none; cursor: pointer; text-decoration: underline; font-weight: 600;"
                >
                  + Buat MOD Baru
                </button>
              </div>

              <select
                id="harga_baru_modal"
                v-model="form.harga_baru_modal_satuan"
                class="form-select"
                style="font-family: monospace; font-weight: 800; font-size: 1rem; color: var(--color-primary);"
                required
                :disabled="!selectedItem"
              >
                <option value="" disabled>-- Pilih Kode MOD --</option>
                <option
                  v-for="m in registeredMods"
                  :key="m.id"
                  :value="m.nama_mod"
                >
                  {{ m.nama_mod }} &bull; Rp {{ formatNumber(m.harga_beli) }}
                </option>
              </select>
              <p class="form-help">
                <span v-if="selectedModObj" style="color: #059669; font-weight: 600;">
                  Modal Satuan: Rp {{ formatNumber(selectedModObj.harga_beli) }} &bull; Subtotal: Rp {{ formatNumber(selectedModObj.harga_beli * (form.jumlah_masuk || 0)) }}
                </span>
                <span v-else>Pilih dari Master MOD yang sudah didaftarkan.</span>
              </p>
            </div>

            <div class="form-group">
              <label class="form-label" for="jumlah_masuk">Jumlah Masuk (Unit)</label>
              <input
                id="jumlah_masuk"
                v-model.number="form.jumlah_masuk"
                type="number"
                class="form-input num"
                min="1"
                required
                :disabled="!selectedItem"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="tgl_beli">Tanggal Pembelian</label>
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
            <div v-if="selectedModObj && form.jumlah_masuk > 0" style="font-size: 0.95rem; color: #0F172A;">
              Total Pembayaran Pasokan: <strong style="color: var(--color-primary); font-size: 1.15rem;">Rp {{ formatNumber(selectedModObj.harga_beli * form.jumlah_masuk) }}</strong>
            </div>
            <div v-else></div>

            <button
              type="submit"
              class="btn btn-primary"
              style="padding: 12px 28px; font-size: 0.95rem;"
              :disabled="saving || !selectedItem || !form.harga_baru_modal_satuan.trim() || form.jumlah_masuk <= 0"
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

    <!-- Quick Modal Tambah MOD Baru (Tanpa Keterangan) -->
    <div v-if="showQuickModModal" class="modal-backdrop" @click.self="showQuickModModal = false">
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3>Tambah Kode MOD Baru ke Master</h3>
          <button @click="showQuickModModal = false" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>

        <form @submit.prevent="saveQuickMod">
          <div class="modal-body">
            <div v-if="quickModError" class="badge badge-danger" style="display: block; margin-bottom: 12px; padding: 8px;">
              {{ quickModError }}
            </div>

            <div class="form-group">
              <label class="form-label" for="q_nama_mod">Kode MOD <span style="color: red;">*</span></label>
              <input
                id="q_nama_mod"
                v-model="quickModForm.nama_mod"
                type="text"
                class="form-input"
                placeholder="Contoh: SXL, LC, TBA"
                style="text-transform: uppercase; font-family: monospace; font-weight: 700;"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="q_harga_beli">Harga Beli / Modal Asli (Rp) <span style="color: red;">*</span></label>
              <input
                id="q_harga_beli"
                v-model.number="quickModForm.harga_beli"
                type="number"
                min="0"
                class="form-input"
                placeholder="Rp"
                required
              />
              <span style="font-size: 0.75rem; color: #005CE6; margin-top: 4px; display: block;">
                Terbaca: Rp {{ formatNumber(quickModForm.harga_beli) }}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showQuickModModal = false" class="btn btn-secondary">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" :disabled="quickModSaving">
              <span>{{ quickModSaving ? 'Menyimpan...' : 'Simpan & Pilih' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
import { Truck, Search, Check, X } from 'lucide-vue-next';

const searchQuery = ref('');
const searchResults = ref([]);
const selectedItem = ref(null);
const saving = ref(false);
const historyLoading = ref(true);
const successMsg = ref('');
const errorMsg = ref('');

const registeredMods = ref([]);

const form = reactive({
  harga_baru_modal_satuan: '',
  jumlah_masuk: 1,
  tanggal: new Date().toISOString().split('T')[0]
});

// Quick MOD Modal State (Tanpa Keterangan)
const showQuickModModal = ref(false);
const quickModSaving = ref(false);
const quickModError = ref('');
const quickModForm = reactive({
  nama_mod: '',
  harga_beli: 0
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

const fetchMods = async () => {
  try {
    const res = await api.get('/mod');
    registeredMods.value = res.data || [];
  } catch (err) {
    console.error('Failed to load registered MODs:', err);
  }
};

const selectedModObj = computed(() => {
  if (!form.harga_baru_modal_satuan) return null;
  return registeredMods.value.find(m => m.nama_mod === form.harga_baru_modal_satuan) || null;
});

let searchTimeout = null;
const searchItems = () => {
  clearTimeout(searchTimeout);
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  searchTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/barang', {
        params: { search: searchQuery.value, limit: 10 }
      });
      searchResults.value = res.data.data;
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, 250);
};

const selectItem = (item) => {
  selectedItem.value = item;
  searchQuery.value = `[${item.kode_barang}] ${item.nama_barang}`;
  searchResults.value = [];
  form.harga_baru_modal_satuan = item.MOD || '';
  form.jumlah_masuk = 10;
};

const openQuickModModal = () => {
  quickModForm.nama_mod = '';
  quickModForm.harga_beli = 0;
  quickModError.value = '';
  showQuickModModal.value = true;
};

const saveQuickMod = async () => {
  if (!quickModForm.nama_mod.trim()) {
    quickModError.value = 'Kode MOD wajib diisi.';
    return;
  }
  quickModSaving.value = true;
  quickModError.value = '';

  try {
    const res = await api.post('/mod', quickModForm);
    await fetchMods();
    // Otomatis pilih kode MOD yang baru saja dibuat
    form.harga_baru_modal_satuan = res.data.mod.nama_mod;
    showQuickModModal.value = false;
  } catch (err) {
    quickModError.value = err.response?.data?.error || 'Gagal menambahkan kode MOD baru.';
  } finally {
    quickModSaving.value = false;
  }
};

const submitPembelian = async () => {
  if (!selectedItem.value) return;
  saving.value = true;
  successMsg.value = '';
  errorMsg.value = '';

  try {
    const res = await api.post('/pembelian', {
      barang_id: selectedItem.value.id,
      harga_baru_modal_satuan: form.harga_baru_modal_satuan.trim().toUpperCase(),
      jumlah_masuk: form.jumlah_masuk,
      tanggal: form.tanggal
    });

    successMsg.value = `Pembelian berhasil dicatat! Stok [${selectedItem.value.nama_barang}] bertambah ${form.jumlah_masuk} unit (Sisa: ${res.data.data.stok_akhir} unit). MOD diperbarui ke "${form.harga_baru_modal_satuan.trim().toUpperCase()}".`;

    // Reset form
    searchQuery.value = '';
    selectedItem.value = null;
    form.harga_baru_modal_satuan = '';
    form.jumlah_masuk = 1;

    historyPage.value = 1;
    fetchHistory();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Gagal menyimpan transaksi pembelian.';
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

onMounted(() => {
  fetchMods();
  fetchHistory();
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
  box-shadow: var(--shadow-lg);
  max-height: 250px;
  overflow-y: auto;
  z-index: 50;
  margin-top: 4px;
}

.autocomplete-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.autocomplete-item:hover {
  background-color: var(--color-primary-light);
}
</style>
