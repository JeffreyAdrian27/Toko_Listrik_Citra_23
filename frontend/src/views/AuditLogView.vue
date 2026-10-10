<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <ShieldCheck :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Audit Trail & Rekam Jejak Aktivitas Sistem</h3>
        </div>
        <span class="badge badge-blue">Append-Only Immutable Log</span>
      </div>

      <div class="card-body">
        <div class="card" style="background: #F8FAFC; border-left: 4px solid var(--color-primary); margin-bottom: 20px;">
          <div style="padding: 14px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
            <strong>Integritas Data (PRD FR-LOG-3):</strong> Seluruh aktivitas penting termasuk login, transaksi penjualan, pembatalan (void), perubahan inventaris, serta upaya akses tidak sah (403 Forbidden) otomatis dicatat permanen dan tidak dapat diubah atau dihapus.
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
          <div style="width: 200px;">
            <label class="form-label" style="font-size: 0.75rem;">Filter Tanggal</label>
            <input v-model="filterDate" @change="fetchAuditLogs" type="date" class="form-input" />
          </div>

          <div style="flex: 1; min-width: 240px;">
            <label class="form-label" style="font-size: 0.75rem;">Cari Aksi / Aktivitas</label>
            <div class="search-input-box">
              <Search :size="16" class="icon" />
              <input
                v-model="filterAction"
                @input="fetchAuditLogs"
                type="text"
                class="form-input"
                placeholder="Cari login, void, penjualan, 403..."
              />
            </div>
          </div>

          <button @click="resetFilters" class="btn btn-secondary" style="height: 42px; margin-top: auto;">
            Reset Filter
          </button>
        </div>

        <LoadingSpinner
          v-if="loading"
          text="Memuat rekam jejak audit..."
          subtext="Mengambil catatan aktivitas operasional & keamanan..."
          minHeight="200px"
        />

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 160px;">Waktu Kejadian</th>
                <th>Pengguna</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>Detail Aktivitas</th>
                <th>Alamat IP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                  {{ formatFullDateTime(log.waktu) }}
                </td>
                <td>
                  <div style="font-weight: 600; font-size: 0.85rem;">{{ log.user_nama || 'Sistem' }}</div>
                  <span class="badge" :class="log.role === 'admin' ? 'badge-blue' : 'badge-warning'" style="font-size: 0.7rem;">
                    {{ log.role || 'System' }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="getActionBadgeClass(log.aksi)">
                    {{ log.aksi }}
                  </span>
                </td>
                <td style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">
                  {{ log.entitas }}
                </td>
                <td style="font-size: 0.85rem; line-height: 1.4;">
                  {{ log.detail }}
                </td>
                <td style="font-size: 0.8rem; font-family: monospace; color: var(--text-subtle);">
                  {{ log.ip_address || '127.0.0.1' }}
                </td>
              </tr>
              <tr v-if="logs.length === 0">
                <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
                  Tidak ada catatan audit yang sesuai kriteria pencarian.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
import { ShieldCheck, Search } from 'lucide-vue-next';

const logs = ref([]);
const loading = ref(true);

const filterDate = ref('');
const filterAction = ref('');

const fetchAuditLogs = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filterDate.value) params.tanggal = filterDate.value;
    if (filterAction.value.trim()) params.aksi = filterAction.value.trim();

    const minDelay = new Promise(resolve => setTimeout(resolve, 400));
    const [res] = await Promise.all([
      api.get('/audit-log', { params }),
      minDelay
    ]);
    logs.value = res.data.data;
  } catch (err) {
    console.error('Failed to load audit logs:', err);
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filterDate.value = '';
  filterAction.value = '';
  fetchAuditLogs();
};

const getActionBadgeClass = (aksi) => {
  if (aksi.includes('Void') || aksi.includes('Ditolak') || aksi.includes('Gagal') || aksi.includes('Terblokir')) {
    return 'badge-danger';
  }
  if (aksi.includes('Berhasil') || aksi.includes('Tambah') || aksi.includes('Inisialisasi')) {
    return 'badge-success';
  }
  return 'badge-blue';
};

const formatFullDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('id-ID')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

onMounted(() => {
  fetchAuditLogs();
});
</script>
