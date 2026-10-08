<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Layers :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Daftar Kategori Produk Listrik</h3>
        </div>
        <button @click="openCreateModal" class="btn btn-primary btn-sm">
          <Plus :size="16" />
          <span>Tambah Kategori</span>
        </button>
      </div>

      <div class="card-body">
        <!-- Search Bar -->
        <div class="filter-bar">
          <div class="search-input-box">
            <Search :size="16" class="icon" />
            <input
              v-model="searchQuery"
              @input="fetchKategori"
              type="text"
              class="form-input"
              placeholder="Cari nama kategori..."
            />
          </div>
        </div>

        <div v-if="loading" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Memuat kategori...
        </div>

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 60px;">No</th>
                <th>Nama Kategori</th>
                <th style="text-align: center; width: 180px;">Jumlah Barang</th>
                <th style="text-align: right; width: 140px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(cat, idx) in categories" :key="cat.id">
                <td>{{ idx + 1 }}</td>
                <td style="font-weight: 600;">
                  {{ cat.nama_kategori }}
                </td>
                <td style="text-align: center;">
                  <span class="badge" :class="cat.total_barang > 0 ? 'badge-blue' : 'badge-warning'">
                    {{ cat.total_barang }} produk
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 8px;">
                    <button @click="openEditModal(cat)" class="btn btn-sm btn-secondary" title="Edit Kategori">
                      <Edit2 :size="14" />
                    </button>
                    <button @click="confirmDelete(cat)" class="btn btn-sm btn-danger" title="Hapus Kategori">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="categories.length === 0">
                <td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">
                  Tidak ada data kategori ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit) -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingId ? 'Ubah Nama Kategori' : 'Tambah Kategori Baru' }}</h3>
          <button @click="closeModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>
        <form @submit.prevent="saveKategori">
          <div class="modal-body">
            <div v-if="modalError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 8px;">
              {{ modalError }}
            </div>
            <div class="form-group">
              <label class="form-label" for="nama_kategori">Nama Kategori</label>
              <input
                id="nama_kategori"
                v-model="formNama"
                type="text"
                class="form-input"
                placeholder="Contoh: Lampu & Bohlam, MCB & Panel"
                required
                autofocus
              />
              <p class="form-help">Nama kategori harus unik dan belum digunakan sebelumnya.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn btn-secondary">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan Kategori' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';
import { Layers, Plus, Search, Edit2, Trash2, X } from 'lucide-vue-next';

const categories = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const showModal = ref(false);
const editingId = ref(null);
const formNama = ref('');
const modalError = ref('');
const saving = ref(false);

const fetchKategori = async () => {
  loading.value = true;
  try {
    const res = await api.get('/kategori', {
      params: { search: searchQuery.value }
    });
    categories.value = res.data.data;
  } catch (err) {
    console.error('Failed to load categories:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingId.value = null;
  formNama.value = '';
  modalError.value = '';
  showModal.value = true;
};

const openEditModal = (cat) => {
  editingId.value = cat.id;
  formNama.value = cat.nama_kategori;
  modalError.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveKategori = async () => {
  if (!formNama.value.trim()) return;
  saving.value = true;
  modalError.value = '';

  try {
    if (editingId.value) {
      await api.put(`/kategori/${editingId.value}`, {
        nama_kategori: formNama.value.trim()
      });
    } else {
      await api.post('/kategori', {
        nama_kategori: formNama.value.trim()
      });
    }
    closeModal();
    fetchKategori();
  } catch (err) {
    modalError.value = err.response?.data?.error || 'Gagal menyimpan kategori.';
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (cat) => {
  if (cat.total_barang > 0) {
    alert(`Kategori "${cat.nama_kategori}" tidak dapat dihapus karena masih digunakan oleh ${cat.total_barang} barang.`);
    return;
  }

  if (confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.nama_kategori}"?`)) {
    try {
      await api.delete(`/kategori/${cat.id}`);
      fetchKategori();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus kategori.');
    }
  }
};

onMounted(() => {
  fetchKategori();
});
</script>
