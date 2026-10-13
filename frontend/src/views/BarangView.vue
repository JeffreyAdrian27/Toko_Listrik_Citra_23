<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Package :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Inventaris & Stok Barang</h3>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- <button @click="downloadTemplate" class="btn btn-outline-primary btn-sm" title="Unduh Template Excel Toko Citra Listrik">
            <Download :size="15" />
            <span>Unduh Template</span>
          </button> -->
          <button @click="openImportModal" class="btn btn-sm" style="background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; font-weight: 600;" title="Upload Excel untuk Tambah & Update Stok Barang">
            <Upload :size="15" />
            <span>Import Excel</span>
          </button>
          <button @click="openCreateModal" class="btn btn-primary btn-sm">
            <Plus :size="16" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
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
            <select v-model="filters.kategori_id" @change="onFilterChange" class="form-select">
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
              @change="onFilterChange"
              style="accent-color: var(--color-primary); width: 16px; height: 16px;"
            />
            <span style="color: var(--status-danger);">Hanya Stok Kritis (&le; 5)</span>
          </label>
        </div>

        <LoadingSpinner
          v-if="loading"
          text="Memuat inventaris produk..."
          subtext="Menyinkronkan stok, kategori, dan master kode MOD..."
          minHeight="240px"
        />

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
                  <template v-if="parseFloat(item.harga_jual || 0) <= 0">
                    <span
                      class="badge"
                      style="background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 6px;"
                      title="Harga jual belum ditentukan (Rp 0). Produk ini disembunyikan dari kasir/penjualan sampai harga diisi."
                    >
                      <AlertTriangle :size="12" />
                      <span>Belum Diatur (Rp 0)</span>
                    </span>
                  </template>
                  <template v-else>
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
                  </template>
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
                    <!-- Tombol Tambah Stok (Redirect ke Pembelian) -->
                    <button
                      @click="goToPembelian(item)"
                      class="btn btn-sm btn-outline-primary"
                      title="Input Pembelian & Tambah Stok"
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
              Sebelumnya
            </button>
            <button
              v-for="p in displayedPages"
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
              Selanjutnya
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

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
              <!-- Input Harga Beli / Modal (Rp) -->
              <div class="form-group">
                <label class="form-label" for="harga_beli">Harga Beli / Modal (Rp)</label>
                <input
                  id="harga_beli"
                  v-model.number="itemForm.harga_beli"
                  @input="onItemHargaBeliInput"
                  type="number"
                  min="0"
                  step="100"
                  class="form-input num"
                  placeholder="Contoh: 54000"
                />
                <p class="form-help">
                  <span v-if="itemForm.harga_beli > 0" style="color: #059669; font-weight: 600;">
                    Rp {{ formatNumber(itemForm.harga_beli) }}
                  </span>
                  <span v-else>Modal kulakan satuan produk.</span>
                </p>
              </div>

              <!-- MOD Ter-generate Otomatis -->
              <div class="form-group">
                <label class="form-label" for="mod_input">MOD (Kode Huruf)</label>
                <input
                  id="mod_input"
                  v-model="itemForm.MOD"
                  type="text"
                  class="form-input"
                  placeholder="Auto..."
                  style="text-transform: uppercase; font-family: monospace; font-weight: 800; color: var(--color-primary); text-align: center; font-size: 1.05rem;"
                  disabled
                />
                <p class="form-help">Auto dari harga beli.</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="harga_jual">Harga Jual Satuan (Rp) <span style="color: red;">*</span></label>
                <input
                  id="harga_jual"
                  v-model.number="itemForm.harga_jual"
                  type="number"
                  class="form-input num"
                  placeholder="Rp"
                  min="0"
                  required
                />
                <p class="form-help">Harga jual ke konsumen.</p>
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
                <strong>Peringatan Jual Rugi:</strong> Modal MOD <strong>{{ itemForm.MOD }}</strong> (Perkiraan Rp {{ formatNumber(itemForm.harga_beli || modToHarga(itemForm.MOD)) }}) lebih tinggi dari Harga Jual (Rp {{ formatNumber(itemForm.harga_jual) }}).
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

    <!-- Modal Import Excel -->
    <div v-if="showImportModal" class="modal-backdrop" @click.self="closeImportModal">
      <div class="modal-content" style="max-width: 650px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <FileSpreadsheet :size="20" style="color: #10B981;" />
            <h3 style="margin: 0; font-size: 1.15rem;">Import Barang dari Excel</h3>
          </div>
          <button @click="closeImportModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Petunjuk dan Info Box -->
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; font-size: 0.85rem; color: #166534; line-height: 1.5;">
            <div style="font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>Cara Kerja Sistem Import Otomatis:</span>
            </div>
            <ul style="margin: 0; padding-left: 18px;">
              <li>Sistem akan memeriksa <strong>Nama Barang</strong> pada file Excel.</li>
              <li><strong>Jika nama barang sudah ada</strong>: Stok barang akan otomatis ditambahkan dan sandi MOD diperbarui jika ada perubahan harga.</li>
              <li><strong>Jika barang belum ada</strong>: Barang baru otomatis dibuat dengan kode barang terstandar Toko Citra 23.</li>
              <li>Riwayat pasokan masuk otomatis tercatat rapi pada menu Pembelian.</li>
            </ul>
          </div>

          <!-- Tombol Download Template -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <div>
              <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-main);">Belum punya template Excel?</div>
              <div style="font-size: 0.775rem; color: var(--text-muted);">Gunakan format Excel standar Toko Citra Listrik</div>
            </div>
            <button @click="downloadTemplate" class="btn btn-outline-primary btn-sm">
              <Download :size="14" />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          <!-- File Upload Zone -->
          <div
            class="import-dropzone"
            :class="{ active: isDragging, 'has-file': !!selectedExcelFile }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onFileDrop"
            @click="triggerFileInput"
            style="border: 2px dashed #94A3B8; border-radius: 10px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: #FAFAFA;"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx, .xls"
              style="display: none;"
              @change="onFileSelected"
            />
            <div v-if="!selectedExcelFile">
              <FileSpreadsheet :size="36" style="color: #64748B; margin-bottom: 10px;" />
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">
                Pilih atau seret file Excel ke sini (.xlsx / .xls)
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                Maksimal ukuran file: 10 MB
              </div>
            </div>
            <div v-else style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <FileSpreadsheet :size="32" style="color: #10B981;" />
              <div style="text-align: left;">
                <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">{{ selectedExcelFile.name }}</div>
                <div style="font-size: 0.8rem; color: #64748B;">{{ (selectedExcelFile.size / 1024).toFixed(1) }} KB</div>
              </div>
              <button @click.stop="clearSelectedFile" class="btn btn-sm btn-secondary" style="margin-left: 12px; padding: 4px 8px;">
                Ganti
              </button>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="importError" class="badge badge-danger" style="display: block; margin-top: 14px; padding: 10px; text-align: left; font-size: 0.85rem;">
            {{ importError }}
          </div>

          <!-- Success Summary Alert -->
          <div v-if="importSummary" style="margin-top: 16px; background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 14px 16px;">
            <div style="display: flex; align-items: center; gap: 8px; color: #15803D; font-weight: 700; font-size: 0.95rem; margin-bottom: 8px;">
              <CheckCircle2 :size="18" />
              <span>{{ importSuccessMessage }}</span>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
              <span class="badge badge-success" style="padding: 6px 12px; font-size: 0.8rem;">
                {{ importSummary.created }} Barang Baru Dibuat
              </span>
              <span class="badge badge-blue" style="padding: 6px 12px; font-size: 0.8rem;">
                {{ importSummary.updated }} Barang Ditambah Stok &amp; MOD
              </span>
              <span v-if="importSummary.skipped" class="badge" style="background: #E2E8F0; color: #475569; padding: 6px 12px; font-size: 0.8rem;">
                {{ importSummary.skipped }} Baris Dilewati (Kosong)
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="closeImportModal" class="btn btn-secondary">
            {{ importSummary ? 'Tutup' : 'Batal' }}
          </button>
          <button
            v-if="!importSummary"
            type="button"
            @click="submitImportExcel"
            class="btn btn-primary"
            :disabled="!selectedExcelFile || importLoading"
            style="background: #059669; border-color: #059669;"
          >
            <Upload :size="15" />
            <span>{{ importLoading ? 'Memproses Import...' : 'Mulai Import Excel' }}</span>
          </button>
        </div>
      </div>
    </div>


  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
import { db } from '../db/clientDb';
import { isOnline, queueOfflineAction } from '../services/syncManager';
import { hargaToMod, modToHarga } from '../utils/modHelper';
import {
  Package,
  Plus,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-vue-next';

const router = useRouter();
const items = ref([]);
const categories = ref([]);
const loading = ref(true);

// Deteksi apakah Harga Beli (MOD) > Harga Jual
const isModalLebihTinggi = (item) => {
  const modal = parseFloat(item.modal_harga_beli || 0) || modToHarga(item.MOD || '');
  const jual = parseFloat(item.harga_jual || 0);
  return modal > 0 && modal > jual;
};

// Form Tambah/Edit Barang: Cek MOD vs Harga Jual
const isFormModalLebihTinggi = computed(() => {
  const modal = itemForm.harga_beli ? parseFloat(itemForm.harga_beli) : modToHarga(itemForm.MOD);
  const jual = parseFloat(itemForm.harga_jual || 0);
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

const displayedPages = computed(() => {
  const total = pagination.totalPages || 1;
  if (total <= 5) {
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(1, Math.min(pagination.page, total - 4));
  const pages = [];
  for (let i = 0; i < 5; i++) {
    pages.push(start + i);
  }
  return pages;
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
  harga_beli: 0,
  MOD: '',
  harga_jual: 0,
  keterangan: ''
});

const onItemHargaBeliInput = () => {
  if (itemForm.harga_beli > 0) {
    itemForm.MOD = hargaToMod(itemForm.harga_beli);
  } else {
    itemForm.MOD = '';
  }
};

const onItemModInput = () => {
  if (itemForm.MOD && itemForm.MOD.trim()) {
    itemForm.MOD = itemForm.MOD.toUpperCase();
    const calculated = modToHarga(itemForm.MOD);
    if (calculated > 0) {
      itemForm.harga_beli = calculated;
    }
  }
};

let searchTimeout = null;
const onSearchChange = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    fetchBarang();
  }, 350);
};

const onFilterChange = () => {
  pagination.page = 1;
  fetchBarang();
};

const fetchCategories = async () => {
  if (!isOnline.value) {
    try {
      categories.value = await db.kategori.toArray();
    } catch (e) {}
    return;
  }
  try {
    const res = await api.get('/kategori');
    categories.value = res.data.data;
  } catch (err) {
    console.warn('Failed to load categories from server, fallback to local:', err);
    try {
      categories.value = await db.kategori.toArray();
    } catch (e) {}
  }
};

const fetchBarang = async () => {
  loading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 400));

  if (!isOnline.value) {
    try {
      const allLocal = await db.barang.toArray();
      let filtered = allLocal;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(b => (b.nama_barang || '').toLowerCase().includes(q) || (b.kode_barang || '').toLowerCase().includes(q));
      }
      if (filters.kategori_id) {
        filtered = filtered.filter(b => String(b.kategori_id) === String(filters.kategori_id));
      }
      if (filters.low_stock) {
        filtered = filtered.filter(b => (b.stok_akhir || 0) <= 5);
      }
      pagination.total = filtered.length;
      pagination.totalPages = Math.ceil(filtered.length / pagination.limit) || 1;
      const start = (pagination.page - 1) * pagination.limit;
      items.value = filtered.slice(start, start + pagination.limit);
    } catch (localErr) {
      console.error('Dexie read failed:', localErr);
    } finally {
      loading.value = false;
    }
    return;
  }

  try {
    const [res] = await Promise.all([
      api.get('/barang', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: filters.search,
          kategori_id: filters.kategori_id,
          low_stock: filters.low_stock
        }
      }),
      minDelay
    ]);
    items.value = res.data.data;
    pagination.total = res.data.pagination.total;
    pagination.totalPages = res.data.pagination.totalPages || 1;

    // Jika filter mengubah total halaman sehingga page aktif berada di luar jangkauan
    if (pagination.page > pagination.totalPages && pagination.totalPages > 0) {
      pagination.page = 1;
      fetchBarang();
      return;
    }
  } catch (err) {
    console.warn('Gagal memuat barang dari server, fallback ke database lokal:', err);
    try {
      const allLocal = await db.barang.toArray();
      let filtered = allLocal;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(b => (b.nama_barang || '').toLowerCase().includes(q) || (b.kode_barang || '').toLowerCase().includes(q));
      }
      if (filters.kategori_id) {
        filtered = filtered.filter(b => String(b.kategori_id) === String(filters.kategori_id));
      }
      if (filters.low_stock) {
        filtered = filtered.filter(b => (b.stok_akhir || 0) <= 5);
      }
      pagination.total = filtered.length;
      pagination.totalPages = Math.ceil(filtered.length / pagination.limit) || 1;
      const start = (pagination.page - 1) * pagination.limit;
      items.value = filtered.slice(start, start + pagination.limit);
    } catch (localErr) {
      console.error('Dexie read failed:', localErr);
    }
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
  itemForm.harga_beli = 0;
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
  itemForm.harga_beli = item.modal_harga_beli ? parseFloat(item.modal_harga_beli) : (item.MOD ? modToHarga(item.MOD) : 0);
  itemForm.MOD = item.MOD || (itemForm.harga_beli > 0 ? hargaToMod(itemForm.harga_beli) : '');
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

  const saveOffline = async () => {
    if (editingId.value) {
      await db.barang.update(editingId.value, {
        nama_barang: itemForm.nama_barang,
        kategori_id: itemForm.kategori_id,
        merk: itemForm.merk,
        modal_harga_beli: itemForm.harga_beli,
        MOD: itemForm.MOD,
        harga_jual: itemForm.harga_jual,
        keterangan: itemForm.keterangan
      });
      await queueOfflineAction(
        `/barang/${editingId.value}`,
        'PUT',
        { ...itemForm },
        `Ubah Barang: ${itemForm.nama_barang}`
      );
    } else {
      const tempId = 'offline_b_' + Date.now();
      const cleanMerk = itemForm.merk ? itemForm.merk.trim().replace(/[^a-zA-Z]/g, '').toUpperCase() : '';
      let merkPrefix = 'NN';
      if (cleanMerk) {
        merkPrefix = cleanMerk.length >= 3 ? cleanMerk.substring(0, 3) : cleanMerk.padEnd(3, 'X');
      }
      const newKode = 'C23' + merkPrefix + Math.floor(10000 + Math.random() * 90000);
      await db.barang.add({
        id: tempId,
        kode_barang: newKode,
        nama_barang: itemForm.nama_barang,
        kategori_id: itemForm.kategori_id,
        merk: itemForm.merk,
        stok_akhir: Number(itemForm.stok_awal) || 0,
        modal_harga_beli: itemForm.harga_beli,
        MOD: itemForm.MOD,
        harga_jual: itemForm.harga_jual,
        keterangan: itemForm.keterangan,
        is_offline: true
      });
      await queueOfflineAction(
        '/barang',
        'POST',
        { ...itemForm },
        `Tambah Barang: ${itemForm.nama_barang}`
      );
    }
    closeItemModal();
    await fetchBarang();
  };

  if (!isOnline.value) {
    try {
      await saveOffline();
    } catch (e) {
      console.error('Offline save barang failed:', e);
      itemModalError.value = 'Gagal menyimpan barang ke database lokal perangkat.';
    } finally {
      itemSaving.value = false;
    }
    return;
  }

  try {
    if (editingId.value) {
      await api.put(`/barang/${editingId.value}`, itemForm);
    } else {
      await api.post('/barang', itemForm);
    }
    closeItemModal();
    fetchBarang();
  } catch (err) {
    if (!err.response) {
      console.warn('Jaringan terputus saat simpan barang, beralih ke offline...');
      try {
        await saveOffline();
        return;
      } catch (e) {}
    }
    itemModalError.value = err.response?.data?.error || 'Gagal menyimpan barang.';
  } finally {
    itemSaving.value = false;
  }
};

const goToPembelian = (item) => {
  router.push({
    path: '/pembelian',
    query: { barang_id: item.id }
  });
};

const confirmDelete = async (item) => {
  if (confirm(`Apakah Anda yakin ingin menghapus atau mengarsipkan barang [${item.kode_barang}] ${item.nama_barang}?`)) {
    if (!isOnline.value) {
      try {
        await db.barang.delete(item.id);
        await queueOfflineAction(
          `/barang/${item.id}`,
          'DELETE',
          {},
          `Hapus Barang: [${item.kode_barang}] ${item.nama_barang}`
        );
        fetchBarang();
      } catch (e) {
        alert('Gagal menghapus barang di mode offline.');
      }
      return;
    }

    try {
      await api.delete(`/barang/${item.id}`);
      fetchBarang();
    } catch (err) {
      if (!err.response) {
        await db.barang.delete(item.id);
        await queueOfflineAction(
          `/barang/${item.id}`,
          'DELETE',
          {},
          `Hapus Barang: [${item.kode_barang}] ${item.nama_barang}`
        );
        fetchBarang();
        return;
      }
      alert(err.response?.data?.error || 'Gagal menghapus barang.');
    }
  }
};

// State & Methods Import Excel
const showImportModal = ref(false);
const selectedExcelFile = ref(null);
const fileInputRef = ref(null);
const isDragging = ref(false);
const importLoading = ref(false);
const importError = ref('');
const importSummary = ref(null);
const importSuccessMessage = ref('');

const openImportModal = () => {
  selectedExcelFile.value = null;
  importError.value = '';
  importSummary.value = null;
  importSuccessMessage.value = '';
  showImportModal.value = true;
};

const closeImportModal = () => {
  showImportModal.value = false;
  if (importSummary.value) {
    fetchBarang();
  }
};

const triggerFileInput = () => {
  if (fileInputRef.value) fileInputRef.value.click();
};

const onFileSelected = (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    selectedExcelFile.value = files[0];
    importError.value = '';
  }
};

const onFileDrop = (e) => {
  isDragging.value = false;
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      selectedExcelFile.value = file;
      importError.value = '';
    } else {
      importError.value = 'Harap unggah file dengan format Excel (.xlsx atau .xls).';
    }
  }
};

const clearSelectedFile = () => {
  selectedExcelFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const downloadTemplate = async () => {
  try {
    const response = await api.get('/barang/template-excel', {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Barang_Toko_Citra_23.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download template error:', err);
    alert('Gagal mengunduh template Excel.');
  }
};

const submitImportExcel = async () => {
  if (!selectedExcelFile.value) return;

  importLoading.value = true;
  importError.value = '';
  importSummary.value = null;

  try {
    const formData = new FormData();
    formData.append('file', selectedExcelFile.value);

    const res = await api.post('/barang/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    importSummary.value = res.data.summary;
    importSuccessMessage.value = res.data.message;

    // Refresh data barang dan kategori
    fetchCategories();
    fetchBarang();
  } catch (err) {
    console.error('Import excel error:', err);
    importError.value = err.response?.data?.error || 'Gagal memproses file Excel.';
  } finally {
    importLoading.value = false;
  }
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString('id-ID');
};

const handleCatalogUpdated = () => {
  fetchCategories();
  fetchBarang();
};

onMounted(() => {
  fetchCategories();
  fetchBarang();
  window.addEventListener('catalog-mirrored', handleCatalogUpdated);
  window.addEventListener('sync-complete', handleCatalogUpdated);
});

onUnmounted(() => {
  window.removeEventListener('catalog-mirrored', handleCatalogUpdated);
  window.removeEventListener('sync-complete', handleCatalogUpdated);
});
</script>
