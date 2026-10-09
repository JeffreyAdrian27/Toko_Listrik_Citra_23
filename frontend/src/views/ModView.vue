<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <KeyRound :size="22" style="color: var(--color-primary);" />
          <div>
            <h3 class="card-title">Master Data MOD (Sandi Harga Modal)</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
              Kelola daftar kode huruf MOD &amp; harga beli riil toko untuk perhitungan otomatis Laba Rugi.
            </p>
          </div>
        </div>
        <button @click="openCreateModal" class="btn btn-primary btn-sm">
          <Plus :size="16" />
          <span>Tambah Kode MOD</span>
        </button>
      </div>

      <div class="card-body">
        <!-- Stat Cards -->
        <div class="stats-grid" style="margin-bottom: 24px;">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">Total Kode MOD</div>
              <div class="stat-value amount" style="color: var(--color-primary);">
                {{ modList.length }} Kode
              </div>
              <div class="stat-sub">Sandi aktif terdaftar</div>
            </div>
            <div class="stat-icon blue">
              <KeyRound :size="24" />
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">Rata-rata Harga Modal</div>
              <div class="stat-value amount">
                Rp {{ formatNumber(avgHargaBeli) }}
              </div>
              <div class="stat-sub">Dari seluruh kode MOD</div>
            </div>
            <div class="stat-icon green">
              <Coins :size="24" />
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">MOD Tertinggi</div>
              <div class="stat-value amount" style="color: #0284C7;">
                {{ highestMod ? `${highestMod.nama_mod} (Rp ${formatNumber(highestMod.harga_beli)})` : '-' }}
              </div>
              <div class="stat-sub">Nominal kulakan tertinggi</div>
            </div>
            <div class="stat-icon blue">
              <TrendingUp :size="24" />
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">Total Penggunaan</div>
              <div class="stat-value amount" style="color: #7C3AED;">
                {{ totalBarangPakai }} Barang
              </div>
              <div class="stat-sub">Terkoneksi ke data stok</div>
            </div>
            <div class="stat-icon" style="background: #F3E8FF; color: #7C3AED;">
              <PackageCheck :size="24" />
            </div>
          </div>
        </div>

        <!-- Info Box PRD -->
        <div class="card" style="background: #F8FAFC; border-left: 4px solid var(--color-primary); margin-bottom: 20px;">
          <div style="padding: 12px 16px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
            <strong>Petunjuk Master MOD:</strong> Hanya memuat <strong>Nama/Kode MOD</strong> dan <strong>Harga Beli Asli</strong>. Kode yang didaftarkan di sini akan muncul sebagai opsi pilihan di menu Pembelian dan Barang untuk otomatisasi perhitungan Laba Rugi.
          </div>
        </div>

        <!-- Filter / Pencarian -->
        <div class="filter-bar" style="margin-bottom: 20px;">
          <div class="search-box" style="flex: 1; max-width: 380px;">
            <input
              v-model="searchQuery"
              @input="page = 1"
              type="text"
              class="form-input"
              placeholder="Cari kode MOD..."
            />
          </div>
          <button @click="fetchMods" class="btn btn-secondary btn-sm" title="Segarkan Data">
            <RefreshCw :size="16" />
            <span>Segarkan</span>
          </button>
        </div>

        <!-- Tabel MOD (Tanpa Keterangan) -->
        <div v-if="loading" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Memuat daftar Master MOD...
        </div>

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 60px;">No</th>
                <th style="width: 220px;">Nama / Kode MOD</th>
                <th style="text-align: right; width: 240px;">Harga Beli (Modal Rp)</th>
                <th style="text-align: center; width: 180px;">Barang Terkait</th>
                <th style="text-align: right; width: 160px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, idx) in paginatedMods" :key="m.id">
                <td>{{ (page - 1) * pageSize + idx + 1 }}</td>
                <td>
                  <span class="badge" style="background: #EBF3FF; color: #005CE6; font-family: monospace; font-size: 0.95rem; font-weight: 800; padding: 5px 14px; letter-spacing: 0.05em;">
                    {{ m.nama_mod }}
                  </span>
                </td>
                <td style="text-align: right; font-weight: 700; color: #0F172A; font-size: 0.95rem;">
                  Rp {{ formatNumber(m.harga_beli) }}
                </td>
                <td style="text-align: center;">
                  <span class="badge" :class="m.total_barang_pakai > 0 ? 'badge-blue' : ''" style="background: #F1F5F9; color: #475569;">
                    {{ m.total_barang_pakai || 0 }} barang
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    <button
                      @click="openEditModal(m)"
                      class="btn btn-sm btn-secondary"
                      title="Ubah MOD"
                      style="padding: 6px 10px;"
                    >
                      <Edit2 :size="14" />
                      <span>Edit</span>
                    </button>
                    <button
                      @click="confirmDelete(m)"
                      class="btn btn-sm btn-secondary"
                      style="color: #DC2626; border-color: #FECACA; padding: 6px 10px;"
                      title="Hapus MOD"
                    >
                      <Trash2 :size="14" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredMods.length === 0">
                <td colspan="5" style="text-align: center; padding: 36px; color: var(--text-muted);">
                  Tidak ada data kode MOD yang cocok dengan pencarian.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Master MOD (10 Item per Halaman) -->
        <div v-if="filteredMods.length > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan halaman <strong>{{ page }}</strong> dari <strong>{{ totalPages }}</strong> (Total <strong>{{ filteredMods.length }}</strong> kode MOD &bull; 10 per halaman)
          </span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button
              @click="page--"
              :disabled="page <= 1"
              class="btn btn-sm btn-secondary"
            >
              &larr; Sebelumnya
            </button>
            <button
              v-for="p in totalPages"
              :key="p"
              @click="page = p"
              class="btn btn-sm"
              :class="page === p ? 'btn-primary' : 'btn-secondary'"
              style="min-width: 32px; padding: 4px 8px; font-weight: 700;"
            >
              {{ p }}
            </button>
            <button
              @click="page++"
              :disabled="page >= totalPages"
              class="btn btn-sm btn-secondary"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Tambah / Edit MOD (Tanpa Keterangan) -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3>{{ isEditing ? 'Edit Master Data MOD' : 'Tambah Master Data MOD Baru' }}</h3>
          <button @click="closeModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>

        <form @submit.prevent="saveMod">
          <div class="modal-body">
            <div v-if="modalError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 10px; border-radius: 8px;">
              {{ modalError }}
            </div>

            <div class="form-group">
              <label class="form-label" for="nama_mod">Nama / Kode MOD <span style="color: red;">*</span></label>
              <input
                id="nama_mod"
                v-model="form.nama_mod"
                type="text"
                class="form-input"
                placeholder="Contoh: X, CA, DT, CDS, TBA"
                style="text-transform: uppercase; font-family: monospace; font-weight: 700;"
                required
                :disabled="saving"
              />
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block;">
                Kode huruf rahasia modal yang tertera di barang / buku toko.
              </span>
            </div>

            <div class="form-group">
              <label class="form-label" for="harga_beli">Harga Beli / Modal Asli (Rp) <span style="color: red;">*</span></label>
              <input
                id="harga_beli"
                v-model.number="form.harga_beli"
                type="number"
                min="0"
                step="100"
                class="form-input"
                placeholder="Contoh: 2500 atau 15000"
                required
                :disabled="saving"
              />
              <span style="font-size: 0.75rem; color: #005CE6; margin-top: 4px; display: block; font-weight: 600;">
                Terbaca: Rp {{ formatNumber(form.harga_beli) }}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn btn-secondary" :disabled="saving">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span>{{ saving ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah MOD') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';
import {
  KeyRound,
  Plus,
  Coins,
  TrendingUp,
  PackageCheck,
  RefreshCw,
  Edit2,
  Trash2,
  X
} from 'lucide-vue-next';

const modList = ref([]);
const loading = ref(false);
const searchQuery = ref('');

// Pagination: 10 item per halaman
const page = ref(1);
const pageSize = 10;

const showModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const modalError = ref('');
const editId = ref(null);

const form = ref({
  nama_mod: '',
  harga_beli: 0
});

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

const fetchMods = async () => {
  loading.value = true;
  try {
    const res = await api.get('/mod');
    modList.value = res.data || [];
  } catch (err) {
    console.error('fetchMods error:', err);
    alert(err.response?.data?.error || 'Gagal memuat data Master MOD.');
  } finally {
    loading.value = false;
  }
};

const filteredMods = computed(() => {
  if (!searchQuery.value) return modList.value;
  const q = searchQuery.value.toLowerCase().trim();
  return modList.value.filter(m => m.nama_mod.toLowerCase().includes(q));
});

const totalPages = computed(() => {
  return Math.ceil(filteredMods.value.length / pageSize) || 1;
});

const paginatedMods = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredMods.value.slice(start, start + pageSize);
});

const avgHargaBeli = computed(() => {
  if (modList.value.length === 0) return 0;
  const total = modList.value.reduce((acc, m) => acc + parseFloat(m.harga_beli || 0), 0);
  return Math.round(total / modList.value.length);
});

const highestMod = computed(() => {
  if (modList.value.length === 0) return null;
  return [...modList.value].sort((a, b) => parseFloat(b.harga_beli) - parseFloat(a.harga_beli))[0];
});

const totalBarangPakai = computed(() => {
  return modList.value.reduce((acc, m) => acc + parseInt(m.total_barang_pakai || 0, 10), 0);
});

const openCreateModal = () => {
  isEditing.value = false;
  editId.value = null;
  form.value = {
    nama_mod: '',
    harga_beli: 0
  };
  modalError.value = '';
  showModal.value = true;
};

const openEditModal = (item) => {
  isEditing.value = true;
  editId.value = item.id;
  form.value = {
    nama_mod: item.nama_mod,
    harga_beli: parseFloat(item.harga_beli) || 0
  };
  modalError.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  modalError.value = '';
};

const saveMod = async () => {
  if (!form.value.nama_mod) {
    modalError.value = 'Nama / Kode MOD wajib diisi.';
    return;
  }

  saving.value = true;
  modalError.value = '';

  try {
    if (isEditing.value) {
      await api.put(`/mod/${editId.value}`, form.value);
    } else {
      await api.post('/mod', form.value);
    }
    closeModal();
    fetchMods();
  } catch (err) {
    modalError.value = err.response?.data?.error || 'Gagal menyimpan data master MOD.';
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (item) => {
  if (item.total_barang_pakai > 0) {
    alert(`Kode MOD "${item.nama_mod}" tidak dapat dihapus karena sedang dipakai oleh ${item.total_barang_pakai} barang.`);
    return;
  }

  if (confirm(`Apakah Anda yakin ingin menghapus kode MOD "${item.nama_mod}" (Rp ${formatNumber(item.harga_beli)})?`)) {
    try {
      await api.delete(`/mod/${item.id}`);
      fetchMods();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus kode MOD.');
    }
  }
};

onMounted(() => {
  fetchMods();
});
</script>
