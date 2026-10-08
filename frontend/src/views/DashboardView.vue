<template>
  <AppLayout>
    <div v-if="loading" style="text-align: center; padding: 40px; color: var(--text-muted);">
      Memuat data ringkasan dashboard...
    </div>

    <div v-else>
      <!-- Stats Overview Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-label">Omzet Hari Ini</div>
            <div class="stat-value amount">Rp {{ formatNumber(stats.summary?.omzet_hari_ini || 0) }}</div>
            <div class="stat-sub">{{ stats.summary?.transaksi_hari_ini || 0 }} transaksi berhasil</div>
          </div>
          <div class="stat-icon blue">
            <Coins :size="24" />
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-label">Omzet Bulan Ini</div>
            <div class="stat-value amount">Rp {{ formatNumber(stats.summary?.omzet_bulan_ini || 0) }}</div>
            <div class="stat-sub">Total penjualan bulan berjalan</div>
          </div>
          <div class="stat-icon blue">
            <TrendingUp :size="24" />
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-label">Estimasi Laba Kotor</div>
            <div class="stat-value amount" style="color: var(--status-success);">
              Rp {{ formatNumber(stats.summary?.laba_bulan_ini || 0) }}
            </div>
            <div class="stat-sub">Omzet dikurangi HPP modal</div>
          </div>
          <div class="stat-icon green">
            <CheckCircle :size="24" />
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-label">Stok Kritis / Menipis</div>
            <div class="stat-value amount" :style="{ color: (stats.summary?.stok_menipis || 0) > 0 ? 'var(--status-danger)' : 'var(--text-main)' }">
              {{ stats.summary?.stok_menipis || 0 }}
            </div>
            <div class="stat-sub">
              <router-link to="/barang" style="color: var(--color-primary); text-decoration: none; font-weight: 600;">
                Lihat barang (stok &le; 5) &rarr;
              </router-link>
            </div>
          </div>
          <div class="stat-icon" :class="(stats.summary?.stok_menipis || 0) > 0 ? 'red' : 'amber'">
            <AlertTriangle :size="24" />
          </div>
        </div>
      </div>

      <!-- Quick Actions Banner -->
      <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, #005CE6 0%, #0045B0 100%); color: #FFFFFF;">
        <div style="padding: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: gap: 16px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700;">Aksi Cepat Operasional Kasir</h3>
            <p style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px;">Pilih menu transaksi harian toko dengan cepat.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <router-link to="/penjualan" class="btn" style="background: #FFFFFF; color: #005CE6; font-weight: 700;">
              <ShoppingCart :size="16" />
              <span>Input Penjualan</span>
            </router-link>
            <router-link to="/pembelian" class="btn" style="background: rgba(255,255,255,0.18); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.3);">
              <Truck :size="16" />
              <span>Tambah Pembelian / Stok</span>
            </router-link>
            <router-link to="/laporan" class="btn" style="background: rgba(255,255,255,0.18); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.3);">
              <BarChart3 :size="16" />
              <span>Cek Laporan Laba/Rugi</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- 2 Columns: Top Selling Items & Recent Sales -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 24px;">
        <!-- Top Selling Items -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Award :size="18" style="color: #005CE6;" />
              <span>Barang Terlaris (Top 5)</span>
            </h3>
            <router-link to="/barang" class="btn btn-sm btn-secondary">
              Inventaris Lengkap
            </router-link>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Barang</th>
                  <th style="text-align: right;">Terjual</th>
                  <th style="text-align: right;">Total Omzet</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.top_items" :key="item.kode_barang">
                  <td>
                    <span class="badge badge-blue">{{ item.kode_barang }}</span>
                  </td>
                  <td style="font-weight: 600;">{{ item.nama_barang }}</td>
                  <td class="num" style="text-align: right; font-weight: 700;">
                    {{ item.total_terjual }} unit
                  </td>
                  <td class="num" style="text-align: right; font-weight: 700; color: var(--color-primary);">
                    Rp {{ formatNumber(item.total_omzet) }}
                  </td>
                </tr>
                <tr v-if="!stats.top_items || stats.top_items.length === 0">
                  <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">
                    Belum ada riwayat penjualan.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Clock :size="18" style="color: #005CE6;" />
              <span>Transaksi Penjualan Terakhir</span>
            </h3>
            <router-link to="/penjualan" class="btn btn-sm btn-secondary">
              Lihat Kasir
            </router-link>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Barang</th>
                  <th style="text-align: right;">Qty</th>
                  <th style="text-align: right;">Subtotal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in stats.recent_sales" :key="tx.id" :class="{ 'row-voided': tx.status === 'batal' }">
                  <td style="font-size: 0.8rem; color: var(--text-muted);">
                    {{ formatDate(tx.tanggal) }}
                  </td>
                  <td>
                    <div style="font-weight: 600; font-size: 0.85rem;">{{ tx.nama_barang }}</div>
                    <div style="font-size: 0.75rem; color: var(--text-subtle);">Oleh: {{ tx.kasir_nama || 'Kasir' }}</div>
                  </td>
                  <td class="num" style="text-align: right;">{{ tx.jumlah }}</td>
                  <td class="num" style="text-align: right; font-weight: 600;">
                    Rp {{ formatNumber(tx.omzet_penjualan) }}
                  </td>
                  <td>
                    <span class="badge" :class="tx.status === 'aktif' ? 'badge-success' : 'badge-danger'">
                      {{ tx.status === 'aktif' ? 'Selesai' : 'Batal' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!stats.recent_sales || stats.recent_sales.length === 0">
                  <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
                    Belum ada transaksi tercatat.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';
import {
  Coins,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Truck,
  BarChart3,
  Award,
  Clock
} from 'lucide-vue-next';

const stats = ref({});
const loading = ref(true);

const fetchDashboardStats = async () => {
  loading.value = true;
  try {
    const res = await api.get('/dashboard/stats');
    stats.value = res.data;
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  } finally {
    loading.value = false;
  }
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString('id-ID');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

onMounted(() => {
  fetchDashboardStats();
});
</script>
