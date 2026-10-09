<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Package :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Inventaris & Stok Barang</h3>
        </div>
        <button @click="openCreateModal" class="btn btn-primary btn-sm">
          <Plus :size="16" />
          <span>Tambah Barang Baru</span>
        </button>
      </div>

      <div class="card-body">
        <!-- Filter and Search Row -->
        <div class="filter-bar">
          <div class="search-input-box" style="max-width: 340px;">
            <Search :size="16" class="icon" />
            <input
              v-model="filters.search"
              @input="onSearchChange"
              type="text"
              class="form-input"
              placeholder="Cari kode, nama barang, merk..."
            />
          </div>

          <div style="width: 220px;">
            <select v-model="filters.kategori_id" @change="fetchBarang" class="form-select">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.nama_kategori }}
              </option>
            </select>
          </div>

          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; user-select: none;">
            <input
              type="checkbox"
              v-model="filters.low_stock"
              @change="fetchBarang"
              style="accent-color: var(--color-primary); width: 16px; height: 16px;"
            />
            <span style="color: var(--status-danger);">Hanya Stok Kritis (&le; 5)</span>
          </label>
        </div>

        <div v-if="loading" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Memuat data inventaris barang...
        </div>

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Produk & Merk</th>
                <th>Kategori</th>
                <th style="text-align: center; width: 100px;">MOD</th>
                <th style="text-align: right;">Harga Jual</th>
                <th style="text-align: center;">Sisa Stok</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in items"
                :key="item.id"
                :style="isModalLebihTinggi(item) ? 'background: #FFF8F8;' : ''"
              >
                <td>
                  <span class="badge badge-blue" style="font-weight: 700;">{{ item.kode_barang }}</span>
                </td>
                <td>
                  <div style="font-weight: 600; color: var(--text-main);">{{ item.nama_barang }}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">
                    Merk: <strong style="color: var(--text-main);">{{ item.merk || 'Noname' }}</strong>
                  </div>
                </td>
                <td>
                  <span class="badge" style="background: #F1F5F9; color: #475569;">
                    {{ item.nama_kategori || '-' }}
                  </span>
                </td>
                <!-- Kolom MOD sesuai format kode huruf rahasia modal -->
                <td style="text-align: center;">
                  <span
                    class="badge"
                    :style="isModalLebihTinggi(item) ? 'background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-weight: 800; font-family: monospace; font-size: 0.9rem; letter-spacing: 0.05em; padding: 4px 10px;' : 'background: #EBF3FF; color: #005CE6; font-weight: 800; font-family: monospace; font-size: 0.9rem; letter-spacing: 0.05em; padding: 4px 10px;'"
                  >
                    {{ item.MOD || '-' }}
                  </span>
                </td>
                <td class="num" style="text-align: right;">
                  <div style="font-weight: 700;" :style="{ color: isModalLebihTinggi(item) ? '#DC2626' : 'var(--color-primary)' }">
                    Rp {{ formatNumber(item.harga_jual) }}
                  </div>
                  <!-- Warning jika Harga Beli (MOD) > Harga Jual -->
                  <div
                    v-if="isModalLebihTinggi(item)"
                    class="badge"
                    style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; padding: 2px 6px; border-radius: 4px;"
                    :title="`Peringatan: Modal MOD (Rp ${formatNumber(item.modal_harga_beli)}) lebih tinggi dari Harga Jual (Rp ${formatNumber(item.harga_jual)})!`"
                  >
                    <AlertTriangle :size="12" />
                    <span>MOD &gt; Jual (Rugi)</span>
                  </div>
                </td>
                <td style="text-align: center;">
                  <span
                    class="badge"
                    :class="item.stok_akhir <= 5 ? (item.stok_akhir === 0 ? 'badge-danger' : 'badge-warning') : 'badge-success'"
                    style="font-size: 0.8rem; padding: 4px 10px; font-weight: 700;"
                  >
                    {{ item.stok_akhir }} unit
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    <!-- Tombol Tambah Stok (FR-BRG-3) -->
                    <button
                      @click="openTambahStokModal(item)"
                      class="btn btn-sm btn-outline-primary"
                      title="Tambah Stok Masuk (Modal)"
                    >
                      <PlusCircle :size="14" />
                      <span>+ Stok</span>
                    </button>
                    <!-- Edit Barang -->
                    <button @click="openEditModal(item)" class="btn btn-sm btn-secondary" title="Edit Data Barang">
                      <Edit2 :size="14" />
                    </button>
                    <!-- Hapus / Arsipkan -->
                    <button @click="confirmDelete(item)" class="btn btn-sm btn-danger" title="Hapus Barang">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="items.length === 0">
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                  Tidak ada barang yang sesuai filter pencarian.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination (10 Barang per Halaman) -->
        <div v-if="pagination.total > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan halaman <strong>{{ pagination.page }}</strong> dari <strong>{{ pagination.totalPages }}</strong> (Total <strong>{{ pagination.total }}</strong> barang &bull; 10 per halaman)
          </span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button
              @click="changePage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="btn btn-sm btn-secondary"
            >
              &larr; Sebelumnya
            </button>
            <button
              v-for="p in pagination.totalPages"
              :key="p"
              @click="changePage(p)"
              class="btn btn-sm"
              :class="pagination.page === p ? 'btn-primary' : 'btn-secondary'"
              style="min-width: 32px; padding: 4px 8px; font-weight: 700;"
            >
              {{ p }}
            </button>
            <button
              @click="changePage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="btn btn-sm btn-secondary"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Tambah / Edit Barang -->
    <div v-if="showItemModal" class="modal-backdrop" @click.self="closeItemModal">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>{{ editingId ? 'Edit Data Barang' : 'Tambah Barang Baru' }}</h3>
          <button @click="closeItemModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>
        <form @submit.prevent="saveBarang">
          <div class="modal-body">
            <div v-if="itemModalError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 8px;">
              {{ itemModalError }}
            </div>

            <div class="form-group">
              <label class="form-label" for="nama_barang">Nama Barang</label>
              <input
                id="nama_barang"
                v-model="itemForm.nama_barang"
                type="text"
                class="form-input"
                placeholder="Contoh: Lampu Philips LED MyCare 10W Putih"
                required
              />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label class="form-label" for="kategori_id">Kategori</label>
                <select id="kategori_id" v-model="itemForm.kategori_id" class="form-select" required>
                  <option value="" disabled>Pilih Kategori</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.nama_kategori }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="merk">Merk / Brand</label>
                <input
                  id="merk"
                  v-model="itemForm.merk"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: Philips, Panasonic (Kosongkan bila noname)"
                  :disabled="!!editingId"
                />
                <p v-if="!editingId" class="form-help">Kode otomatis dibuat dari 3 huruf merk.</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- Input MOD Kode Huruf Modal dari Master MOD -->
              <div class="form-group">
                <label class="form-label" for="mod_input">MOD (Kode Huruf Modal)</label>
                <select
                  id="mod_input"
                  v-model="itemForm.MOD"
                  class="form-select"
                  style="font-family: monospace; font-weight: 700; letter-spacing: 0.05em;"
                  required
                >
                  <option value="" disabled>-- Pilih Kode MOD --</option>
                  <option
                    v-for="m in registeredMods"
                    :key="m.id"
                    :value="m.nama_mod"
                  >
                    {{ m.nama_mod }} (Rp {{ formatNumber(m.harga_beli) }})
                  </option>
                </select>
                <p class="form-help">Pilih dari Master Data MOD yang sudah didaftarkan.</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="harga_jual">Harga Jual Satuan (Rp)</label>
                <input
                  id="harga_jual"
                  v-model.number="itemForm.harga_jual"
                  type="number"
                  class="form-input num"
                  placeholder="Rp"
                  min="0"
                  required
                />
              </div>
            </div>

            <!-- Warning jika MOD > Harga Jual di form tambah/edit barang -->
            <div
              v-if="isFormModalLebihTinggi"
              class="badge badge-danger"
              style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 10px 14px; border-radius: 8px; font-size: 0.825rem; line-height: 1.4; text-align: left;"
            >
              <AlertTriangle :size="18" style="flex-shrink: 0;" />
              <span>
                <strong>Peringatan Jual Rugi:</strong> Modal MOD <strong>{{ selectedFormMod.nama_mod }}</strong> (Rp {{ formatNumber(selectedFormMod.harga_beli) }}) lebih tinggi dari Harga Jual (Rp {{ formatNumber(itemForm.harga_jual) }}).
              </span>
            </div>

            <div v-if="!editingId" class="form-group">
              <label class="form-label" for="stok_awal">Stok Awal (Unit)</label>
              <input
                id="stok_awal"
                v-model.number="itemForm.stok_awal"
                type="number"
                class="form-input num"
                min="0"
                placeholder="Jumlah unit stok awal"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="keterangan">Keterangan / Catatan Spesifikasi (Opsional)</label>
              <textarea
                id="keterangan"
                v-model="itemForm.keterangan"
                rows="2"
                class="form-textarea"
                placeholder="Garansi, spesifikasi voltase, fitting E27, dsb."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeItemModal" class="btn btn-secondary">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="itemSaving">
              {{ itemSaving ? 'Menyimpan...' : 'Simpan Barang' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Tambah Stok (Tabel HARGA LAMA & HARGA BARU MODAL SATUAN seperti di foto 2) -->
    <div v-if="showTambahStokModal" class="modal-backdrop" @click.self="closeTambahStokModal">
      <div class="modal-content" style="max-width: 520px;">
        <div class="modal-header">
          <h3>Tambah Stok Masuk & Update MOD</h3>
          <button @click="closeTambahStokModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>
        <form @submit.prevent="submitTambahStok">
          <div class="modal-body">
            <div v-if="tambahStokError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 8px;">
              {{ tambahStokError }}
            </div>

            <div class="form-group" style="background: #F8FAFC; padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
              <div style="font-size: 0.8rem; color: var(--text-muted);">Barang yang dipilih:</div>
              <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
                [{{ activeStockItem?.kode_barang }}] {{ activeStockItem?.nama_barang }}
              </div>
              <div style="font-size: 0.8rem; margin-top: 4px;">
                Stok saat ini: <strong>{{ activeStockItem?.stok_akhir }} unit</strong>
              </div>
            </div>

            <!-- Tampilan Tabel Format: HARGA LAMA | HARGA BARU MODAL SATUAN (seperti di foto 2) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div class="form-group">
                <label class="form-label" style="color: #475569;">HARGA LAMA (MOD)</label>
                <div class="form-input" style="background: #F1F5F9; font-family: monospace; font-weight: 800; font-size: 1.05rem; color: var(--color-primary); text-align: center;">
                  {{ activeStockItem?.MOD || '-' }}
                </div>
                <p class="form-help">Kode MOD saat ini.</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="harga_baru_modal">HARGA BARU MODAL SATUAN</label>
                <select
                  id="harga_baru_modal"
                  v-model="tambahStokForm.harga_baru_modal_satuan"
                  class="form-select"
                  style="font-family: monospace; font-weight: 800; font-size: 1rem; color: var(--color-primary);"
                  required
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
                <p class="form-help">Pilih kode huruf modal dari Master MOD.</p>
              </div>
            </div>

            <!-- Warning jika modal baru > harga jual saat ini -->
            <div
              v-if="isTambahStokModalLebihTinggi"
              class="badge badge-danger"
              style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 10px 14px; border-radius: 8px; font-size: 0.825rem; line-height: 1.4; text-align: left;"
            >
              <AlertTriangle :size="18" style="flex-shrink: 0;" />
              <span>
                <strong>Peringatan Jual Rugi:</strong> Modal baru <strong>{{ selectedTambahStokMod.nama_mod }}</strong> (Rp {{ formatNumber(selectedTambahStokMod.harga_beli) }}) lebih tinggi dari Harga Jual barang saat ini (Rp {{ formatNumber(activeStockItem?.harga_jual) }}).
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label" for="jumlah_masuk">Jumlah Masuk (Unit)</label>
                <input
                  id="jumlah_masuk"
                  v-model.number="tambahStokForm.jumlah_masuk"
                  type="number"
                  class="form-input num"
                  min="1"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="tanggal_masuk">Tanggal Transaksi</label>
                <input
                  id="tanggal_masuk"
                  v-model="tambahStokForm.tanggal"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeTambahStokModal" class="btn btn-secondary">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="tambahStokSaving">
              {{ tambahStokSaving ? 'Menyimpan...' : 'Simpan & Tambah Stok' }}
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
import api from '../api';
import {
  Package,
  Plus,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-vue-next';

const items = ref([]);
const categories = ref([]);
const registeredMods = ref([]);
const loading = ref(true);

const fetchMods = async () => {
  try {
    const res = await api.get('/mod');
    registeredMods.value = res.data || [];
  } catch (err) {
    console.error('Failed to load mods:', err);
  }
};

// Deteksi apakah Harga Beli (MOD) > Harga Jual
const isModalLebihTinggi = (item) => {
  const modal = parseFloat(item.modal_harga_beli || 0);
  const jual = parseFloat(item.harga_jual || 0);
  return modal > 0 && modal > jual;
};

// Form Tambah/Edit Barang: Cek MOD vs Harga Jual
const selectedFormMod = computed(() => {
  if (!itemForm.MOD) return null;
  return registeredMods.value.find(m => m.nama_mod === itemForm.MOD) || null;
});

const isFormModalLebihTinggi = computed(() => {
  if (!selectedFormMod.value) return false;
  const modal = parseFloat(selectedFormMod.value.harga_beli || 0);
  const jual = parseFloat(itemForm.harga_jual || 0);
  return modal > 0 && modal > jual;
});

// Modal Tambah Stok: Cek MOD vs Harga Jual
const selectedTambahStokMod = computed(() => {
  if (!tambahStokForm.harga_baru_modal_satuan) return null;
  return registeredMods.value.find(m => m.nama_mod === tambahStokForm.harga_baru_modal_satuan) || null;
});

const isTambahStokModalLebihTinggi = computed(() => {
  if (!selectedTambahStokMod.value || !activeStockItem.value) return false;
  const modal = parseFloat(selectedTambahStokMod.value.harga_beli || 0);
  const jual = parseFloat(activeStockItem.value.harga_jual || 0);
  return modal > 0 && modal > jual;
});

const filters = reactive({
  search: '',
  kategori_id: '',
  low_stock: false
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1
});

// Modal Tambah / Edit Barang State
const showItemModal = ref(false);
const editingId = ref(null);
const itemSaving = ref(false);
const itemModalError = ref('');
const itemForm = reactive({
  nama_barang: '',
  kategori_id: '',
  merk: '',
  stok_awal: 0,
  MOD: '',
  harga_jual: 0,
  keterangan: ''
});

// Modal Tambah Stok State
const showTambahStokModal = ref(false);
const activeStockItem = ref(null);
const tambahStokSaving = ref(false);
const tambahStokError = ref('');
const tambahStokForm = reactive({
  harga_baru_modal_satuan: '',
  jumlah_masuk: 1,
  tanggal: new Date().toISOString().split('T')[0]
});

let searchTimeout = null;
const onSearchChange = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    fetchBarang();
  }, 350);
};

const fetchCategories = async () => {
  try {
    const res = await api.get('/kategori');
    categories.value = res.data.data;
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
};

const fetchBarang = async () => {
  loading.value = true;
  try {
    const res = await api.get('/barang', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        kategori_id: filters.kategori_id,
        low_stock: filters.low_stock
      }
    });
    items.value = res.data.data;
    pagination.total = res.data.pagination.total;
    pagination.totalPages = res.data.pagination.totalPages;
  } catch (err) {
    console.error('Failed to load items:', err);
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage) => {
  pagination.page = newPage;
  fetchBarang();
};

const openCreateModal = () => {
  editingId.value = null;
  itemForm.nama_barang = '';
  itemForm.kategori_id = categories.value.length > 0 ? categories.value[0].id : '';
  itemForm.merk = '';
  itemForm.stok_awal = 0;
  itemForm.MOD = '';
  itemForm.harga_jual = 0;
  itemForm.keterangan = '';
  itemModalError.value = '';
  showItemModal.value = true;
};

const openEditModal = (item) => {
  editingId.value = item.id;
  itemForm.nama_barang = item.nama_barang;
  itemForm.kategori_id = item.kategori_id;
  itemForm.merk = item.merk;
  itemForm.MOD = item.MOD || '';
  itemForm.harga_jual = Number(item.harga_jual);
  itemForm.keterangan = item.keterangan || '';
  itemModalError.value = '';
  showItemModal.value = true;
};

const closeItemModal = () => {
  showItemModal.value = false;
};

const saveBarang = async () => {
  itemSaving.value = true;
  itemModalError.value = '';
  try {
    if (editingId.value) {
      await api.put(`/barang/${editingId.value}`, itemForm);
    } else {
      await api.post('/barang', itemForm);
    }
    closeItemModal();
    fetchBarang();
  } catch (err) {
    itemModalError.value = err.response?.data?.error || 'Gagal menyimpan barang.';
  } finally {
    itemSaving.value = false;
  }
};

const openTambahStokModal = (item) => {
  activeStockItem.value = item;
  tambahStokForm.harga_baru_modal_satuan = item.MOD || '';
  tambahStokForm.jumlah_masuk = 10;
  tambahStokForm.tanggal = new Date().toISOString().split('T')[0];
  tambahStokError.value = '';
  showTambahStokModal.value = true;
};

const closeTambahStokModal = () => {
  showTambahStokModal.value = false;
};

const submitTambahStok = async () => {
  if (!activeStockItem.value) return;
  tambahStokSaving.value = true;
  tambahStokError.value = '';
  try {
    await api.post(`/barang/${activeStockItem.value.id}/tambah-stok`, tambahStokForm);
    closeTambahStokModal();
    fetchBarang();
  } catch (err) {
    tambahStokError.value = err.response?.data?.error || 'Gagal menambahkan stok.';
  } finally {
    tambahStokSaving.value = false;
  }
};

const confirmDelete = async (item) => {
  if (confirm(`Apakah Anda yakin ingin menghapus atau mengarsipkan barang [${item.kode_barang}] ${item.nama_barang}?`)) {
    try {
      await api.delete(`/barang/${item.id}`);
      fetchBarang();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus barang.');
    }
  }
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString('id-ID');
};

onMounted(() => {
  fetchCategories();
  fetchMods();
  fetchBarang();
});
</script>
