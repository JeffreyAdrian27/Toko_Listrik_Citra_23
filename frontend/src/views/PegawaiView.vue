<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Users :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Kelola Akun Pegawai Toko</h3>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button
            @click="fetchPegawai"
            class="btn btn-secondary btn-sm"
            :disabled="loading"
            style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;"
          >
            <RefreshCw :size="15" :class="{ 'spin-active': loading }" />
            <span>{{ loading ? 'Memuat...' : 'Segarkan' }}</span>
          </button>
          <button @click="openCreateModal" class="btn btn-primary btn-sm">
            <UserPlus :size="16" />
            <span>Tambah Akun Pegawai</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <div class="card" style="background: #F8FAFC; border-left: 4px solid var(--color-primary); margin-bottom: 20px;">
          <div style="padding: 14px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
            <strong>Catatan Keamanan (PRD FR-PGW-3):</strong> Akun Pegawai hanya memiliki akses ke menu <strong>Penjualan (Kasir)</strong>. Akun yang memiliki riwayat transaksi tidak dihapus permanen, melainkan dinonaktifkan agar jejak audit transaksi tetap utuh.
          </div>
        </div>

        <LoadingSpinner
          v-if="loading"
          text="Memuat data akun pegawai..."
          subtext="Mengambil daftar akun admin dan staf kasir..."
          minHeight="220px"
        />

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Pegawai</th>
                <th>Username</th>
                <th style="text-align: center;">Status Akun</th>
                <th>Terdaftar Sejak</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(pgw, idx) in pegawaiList" :key="pgw.id">
                <td>{{ idx + 1 }}</td>
                <td style="font-weight: 600;">{{ pgw.nama }}</td>
                <td>
                  <span class="badge badge-blue">@{{ pgw.username }}</span>
                </td>
                <td style="text-align: center;">
                  <span class="badge" :class="pgw.is_active ? 'badge-success' : 'badge-danger'">
                    {{ pgw.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td style="font-size: 0.8rem; color: var(--text-muted);">
                  {{ formatDate(pgw.created_at) }}
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    <!-- Toggle Status Aktif / Nonaktif -->
                    <button
                      @click="toggleActive(pgw)"
                      class="btn btn-sm"
                      :class="pgw.is_active ? 'btn-secondary' : 'btn-outline-primary'"
                      :title="pgw.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'"
                    >
                      <UserX v-if="pgw.is_active" :size="14" />
                      <UserCheck v-else :size="14" />
                      <span>{{ pgw.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</span>
                    </button>
                    <!-- Reset Password -->
                    <button
                      @click="openResetModal(pgw)"
                      class="btn btn-sm btn-secondary"
                      title="Reset Password"
                    >
                      <Key :size="14" />
                      <span>Reset Sandi</span>
                    </button>
                    <!-- Hapus Akun Pegawai -->
                    <button
                      @click="deletePegawai(pgw)"
                      class="btn btn-sm btn-outline-danger"
                      title="Hapus Akun Pegawai"
                    >
                      <Trash2 :size="14" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="pegawaiList.length === 0">
                <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
                  Belum ada akun pegawai terdaftar.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Tambah Pegawai -->
    <div v-if="showCreateModal" class="modal-backdrop" @mousedown="onBackdropMouseDown" @click="handleBackdropClick($event, closeCreateModal)">
      <div class="modal-content" style="max-width: 480px;" @mousedown.stop @click.stop>
        <div class="modal-header">
          <h3>Tambah Akun Pegawai Baru</h3>
          <button @click="closeCreateModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>
        <form @submit.prevent="createPegawai">
          <div class="modal-body">
            <div v-if="modalError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 8px;">
              {{ modalError }}
            </div>

            <div class="form-group">
              <label class="form-label" for="pgw_nama">Nama Lengkap Pegawai</label>
              <input
                id="pgw_nama"
                v-model="createForm.nama"
                type="text"
                class="form-input"
                placeholder="Contoh: Siti Rahma"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="pgw_user">Username</label>
              <input
                id="pgw_user"
                v-model="createForm.username"
                type="text"
                class="form-input"
                placeholder="Contoh: kasir1"
                required
              />
              <p class="form-help">Hanya huruf kecil, angka, dan tanpa spasi.</p>
            </div>

            <div class="form-group">
              <label class="form-label" for="pgw_pass">Password Awal</label>
              <div class="password-field-wrapper">
                <input
                  id="pgw_pass"
                  v-model="createForm.password"
                  :type="showCreatePassword ? 'text' : 'password'"
                  class="form-input password-input"
                  placeholder="Minimal 5 karakter"
                  required
                  minlength="5"
                />
                <button
                  type="button"
                  class="password-toggle-btn"
                  @click="showCreatePassword = !showCreatePassword"
                  :title="showCreatePassword ? 'Sembunyikan password' : 'Lihat password'"
                  :aria-label="showCreatePassword ? 'Sembunyikan password' : 'Lihat password'"
                  tabindex="-1"
                >
                  <EyeOff v-if="showCreatePassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeCreateModal" class="btn btn-secondary">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Membuat Akun...' : 'Simpan Akun Pegawai' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Reset Password -->
    <div v-if="showResetModal" class="modal-backdrop" @mousedown="onBackdropMouseDown" @click="handleBackdropClick($event, closeResetModal)">
      <div class="modal-content" style="max-width: 450px;" @mousedown.stop @click.stop>
        <div class="modal-header">
          <h3>Reset Password Pegawai</h3>
          <button @click="closeResetModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>
        <form @submit.prevent="submitResetPassword">
          <div class="modal-body">
            <div v-if="modalError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 8px;">
              {{ modalError }}
            </div>

            <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              Pegawai: <strong>{{ targetPegawai?.nama }}</strong> (@{{ targetPegawai?.username }})
            </div>

            <div class="form-group">
              <label class="form-label" for="new_pass">Password Baru</label>
              <div class="password-field-wrapper">
                <input
                  id="new_pass"
                  v-model="newPassword"
                  :type="showResetPassword ? 'text' : 'password'"
                  class="form-input password-input"
                  placeholder="Masukkan password baru"
                  required
                  minlength="5"
                />
                <button
                  type="button"
                  class="password-toggle-btn"
                  @click="showResetPassword = !showResetPassword"
                  :title="showResetPassword ? 'Sembunyikan password' : 'Lihat password'"
                  :aria-label="showResetPassword ? 'Sembunyikan password' : 'Lihat password'"
                  tabindex="-1"
                >
                  <EyeOff v-if="showResetPassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeResetModal" class="btn btn-secondary">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Perbarui Password' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
import { onBackdropMouseDown, handleBackdropClick } from '../utils/modalHelper';
import { Users, UserPlus, UserX, UserCheck, Key, X, RefreshCw, Eye, EyeOff, Trash2 } from 'lucide-vue-next';

const pegawaiList = ref([]);
const loading = ref(true);

const showCreateModal = ref(false);
const showResetModal = ref(false);
const showResetPassword = ref(false);
const showCreatePassword = ref(false);
const targetPegawai = ref(null);
const newPassword = ref('');
const modalError = ref('');
const saving = ref(false);

const createForm = reactive({
  nama: '',
  username: '',
  password: ''
});

const fetchPegawai = async () => {
  loading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 450));
  try {
    const [res] = await Promise.all([
      api.get('/pegawai'),
      minDelay
    ]);
    pegawaiList.value = res.data.data;
  } catch (err) {
    console.error('Failed to load pegawai:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  createForm.nama = '';
  createForm.username = '';
  createForm.password = '';
  showCreatePassword.value = false;
  modalError.value = '';
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
};

const createPegawai = async () => {
  saving.value = true;
  modalError.value = '';
  try {
    await api.post('/pegawai', createForm);
    closeCreateModal();
    fetchPegawai();
  } catch (err) {
    modalError.value = err.response?.data?.error || 'Gagal membuat akun pegawai.';
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (pgw) => {
  const newStatus = !pgw.is_active;
  const actionName = newStatus ? 'mengaktifkan' : 'menonaktifkan';
  if (confirm(`Apakah Anda yakin ingin ${actionName} akun "${pgw.nama}"?`)) {
    try {
      await api.put(`/pegawai/${pgw.id}`, {
        nama: pgw.nama,
        is_active: newStatus
      });
      fetchPegawai();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status pegawai.');
    }
  }
};

const openResetModal = (pgw) => {
  targetPegawai.value = pgw;
  newPassword.value = '';
  showResetPassword.value = false;
  modalError.value = '';
  showResetModal.value = true;
};

const closeResetModal = () => {
  showResetModal.value = false;
};

const submitResetPassword = async () => {
  if (!targetPegawai.value || !newPassword.value) return;
  saving.value = true;
  modalError.value = '';
  try {
    await api.post(`/pegawai/${targetPegawai.value.id}/reset-password`, {
      password_baru: newPassword.value
    });
    alert('Password pegawai berhasil direset!');
    closeResetModal();
  } catch (err) {
    modalError.value = err.response?.data?.error || 'Gagal mereset password.';
  } finally {
    saving.value = false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const deletePegawai = async (pgw) => {
  if (confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN akun pegawai "${pgw.nama}" (@${pgw.username})?\n\nTindakan ini tidak dapat dibatalkan.`)) {
    try {
      const res = await api.delete(`/pegawai/${pgw.id}`);
      alert(res.data.message || 'Akun pegawai berhasil dihapus.');
      fetchPegawai();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus akun pegawai.');
    }
  }
};

onMounted(() => {
  fetchPegawai();
});
</script>

<style scoped>
.password-field-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-input {
  width: 100%;
  padding-right: 42px;
}

.password-toggle-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.password-toggle-btn:hover {
  color: #1E293B;
  background-color: #F1F5F9;
}

.password-toggle-btn:focus-visible {
  outline: 2px solid #005CE6;
  outline-offset: 1px;
}
</style>
