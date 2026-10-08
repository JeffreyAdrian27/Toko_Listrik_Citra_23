<template>
  <AppLayout>
    <!-- Form Input Pembelian -->
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Truck :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Input Pembelian Barang & Pembaruan MOD</h3>
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
              <label class="form-label">Cari & Pilih Barang</label>
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

          <!-- Format Kolom: HARGA LAMA & HARGA BARU MODAL SATUAN seperti foto 2 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 14px;">
            <div class="form-group">
              <label class="form-label" style="color: #475569;">HARGA LAMA (MOD)</label>
              <div class="form-input" style="background: #F1F5F9; font-family: monospace; font-weight: 800; font-size: 1.05rem; text-align: center; color: var(--color-primary);">
                {{ selectedItem ? (selectedItem.MOD || '-') : '-' }}
              </div>
              <p class="form-help">Kode MOD satuan sebelumnya.</p>
            </div>

            <div class="form-group">
              <label class="form-label" for="harga_baru_modal">HARGA BARU MODAL SATUAN</label>
              <input
                id="harga_baru_modal"
                v-model="form.harga_baru_modal_satuan"
                type="text"
                class="form-input"
                placeholder="Mis: CDL, DT, SXL, LC"
                style="text-transform: uppercase; font-family: monospace; font-weight: 800; font-size: 1.05rem; text-align: center; color: var(--color-primary);"
                required
                :disabled="!selectedItem"
              />
              <p class="form-help">Kode huruf modal baru (memperbarui MOD).</p>
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

          <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
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

    <!-- Riwayat Pembelian dengan Tabel Persis Format Foto 2 -->
    <div class="card" style="margin-top: 32px;">
      <div class="card-header">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <h3 class="card-title">Tabel Riwayat Pembelian & Perubahan MOD</h3>
          <select v-model="filter.bulan" @change="fetchHistory" class="form-select" style="width: 140px;">
            <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
          </select>
          <select v-model="filter.tahun" @change="fetchHistory" class="form-select" style="width: 110px;">
            <option v-for="y in [2024, 2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div style="font-weight: 700; color: var(--color-primary);">
          Total Pasokan Masuk: {{ historyData.total_qty }} unit ({{ historyData.total_transaksi }} transaksi)
        </div>
      </div>

      <div class="table-responsive">
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
              <th>Dicatat Oleh</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in historyData.data" :key="row.id">
              <td>{{ idx + 1 }}</td>
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
              <td style="font-size: 0.8rem; color: var(--text-muted);">
                {{ row.created_by_nama || 'Admin' }}
              </td>
            </tr>
            <tr v-if="!historyData.data || historyData.data.length === 0">
              <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">
                Belum ada transaksi pembelian pada periode terpilih.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';
import { Truck, Search, Check } from 'lucide-vue-next';

const searchQuery = ref('');
const searchResults = ref([]);
const selectedItem = ref(null);
const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');

const form = reactive({
  harga_baru_modal_satuan: '',
  jumlah_masuk: 1,
  tanggal: new Date().toISOString().split('T')[0]
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

    fetchHistory();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Gagal menyimpan transaksi pembelian.';
  } finally {
    saving.value = false;
  }
};

const fetchHistory = async () => {
  try {
    const res = await api.get('/pembelian', {
      params: { bulan: filter.bulan, tahun: filter.tahun }
    });
    historyData.value = res.data;
  } catch (err) {
    console.error('Failed to load purchase history:', err);
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

onMounted(() => {
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
