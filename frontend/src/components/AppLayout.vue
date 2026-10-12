<template>
  <div class="app-container">
    <!-- Backdrop Overlay saat Sidebar Mobile Terbuka -->
    <div
      v-if="mobileMenuOpen"
      class="sidebar-backdrop"
      @click="mobileMenuOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-header">
        <div class="brand-icon-box">
          <Zap :size="22" stroke-width="2.5" />
        </div>
        <div class="brand-info">
          <h1>CITRA 23</h1>
          <span>Toko Listrik Palu</span>
        </div>
        <!-- Tombol Close (X) di dalam sidebar saat layar kecil -->
        <button
          @click="mobileMenuOpen = false"
          class="mobile-close-btn"
          aria-label="Tutup Menu Navigasi"
        >
          <X :size="18" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <!-- Admin Navigation -->
        <template v-if="auth.isAdmin">
          <router-link
            to="/"
            class="nav-link"
            :class="{ active: route.path === '/' }"
            @click="mobileMenuOpen = false"
          >
            <LayoutDashboard :size="18" class="icon" />
            <span>Dashboard</span>
          </router-link>

          <router-link
            to="/kategori"
            class="nav-link"
            :class="{ active: route.path === '/kategori' }"
            @click="mobileMenuOpen = false"
          >
            <Layers :size="18" class="icon" />
            <span>Kategori</span>
          </router-link>

          <router-link
            to="/barang"
            class="nav-link"
            :class="{ active: route.path === '/barang' }"
            @click="mobileMenuOpen = false"
          >
            <Package :size="18" class="icon" />
            <span>Data Barang</span>
          </router-link>
        </template>

        <!-- Common for Admin & Pegawai -->
        <router-link
          to="/penjualan"
          class="nav-link"
          :class="{ active: route.path === '/penjualan' }"
          @click="mobileMenuOpen = false"
        >
          <ShoppingCart :size="18" class="icon" />
          <span>Penjualan</span>
        </router-link>

        <!-- Admin Continued -->
        <template v-if="auth.isAdmin">
          <router-link
            to="/pembelian"
            class="nav-link"
            :class="{ active: route.path === '/pembelian' }"
            @click="mobileMenuOpen = false"
          >
            <Truck :size="18" class="icon" />
            <span>Pembelian / Stok</span>
          </router-link>

          <router-link
            to="/laporan"
            class="nav-link"
            :class="{ active: route.path === '/laporan' }"
            @click="mobileMenuOpen = false"
          >
            <BarChart3 :size="18" class="icon" />
            <span>Laporan Keuangan</span>
          </router-link>

          <router-link
            to="/akun-pegawai"
            class="nav-link"
            :class="{ active: route.path === '/akun-pegawai' }"
            @click="mobileMenuOpen = false"
          >
            <Users :size="18" class="icon" />
            <span>Akun Pegawai</span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="user-profile-card">
          <div class="user-avatar">
            {{ userInitials }}
          </div>
          <div class="user-meta">
            <div class="user-name" :title="auth.user?.nama">{{ auth.user?.nama }}</div>
            <span class="user-role-badge" :class="auth.isAdmin ? 'badge-admin' : 'badge-pegawai'">
              {{ auth.user?.role }}
            </span>
          </div>
          <button @click="handleLogout" class="btn btn-sm btn-secondary" title="Keluar dari sistem" style="padding: 6px 8px;">
            <LogOut :size="15" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Wrapper -->
    <div class="main-wrapper">
      <header class="top-navbar">
        <!-- Bagian Kiri: Tombol Hamburger & Judul Halaman -->
        <div class="navbar-left">
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="hamburger-btn"
            id="menu-toggle-btn"
            aria-label="Buka Menu"
          >
            <Menu :size="20" />
          </button>
          <div class="page-title-box">
            <h2>{{ currentRouteTitle }}</h2>
            <p class="navbar-date">{{ todayDateFormatted }}</p>
          </div>
        </div>

        <!-- Bagian Kanan: Status Sinkronisasi, Lonceng Notifikasi & Badge Toko -->
        <div class="navbar-right" style="display: flex; align-items: center; gap: 12px;">
          <!-- Indikator Jaringan & Status Auto-Sync Offline -->
          <div style="display: flex; align-items: center;">
            <!-- Mode Online & Tersinkron -->
            <button
              v-if="isOnline && pendingCount === 0"
              @click="handleManualCatalogRefresh"
              class="badge badge-success"
              style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-weight: 700; font-size: 0.78rem; border: none; cursor: pointer;"
              title="Terhubung ke Server MySQL. Klik untuk memperbarui salinan data lokal."
            >
              <Wifi :size="14" />
              <span class="desktop-sync-text">Online</span>
            </button>

            <!-- Ada Antrean Offline / Sedang Sinkronisasi -->
            <button
              v-else-if="isOnline && pendingCount > 0"
              @click="handleManualSync"
              class="btn btn-sm btn-primary"
              style="display: flex; align-items: center; gap: 6px; padding: 5px 12px; font-weight: 700; font-size: 0.78rem; border-radius: 20px;"
              :title="`Ada ${pendingCount} transaksi offline menunggu sinkronisasi. Klik untuk sinkronkan sekarang!`"
            >
              <RefreshCw :size="13" :class="{ 'spin-icon': isSyncing }" />
              <span>{{ isSyncing ? 'Menyinkronkan...' : `${pendingCount} Antrean Sync` }}</span>
            </button>

            <!-- Mode Offline Aktif -->
            <div
              v-else
              class="badge badge-warning"
              style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-weight: 700; font-size: 0.78rem; background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;"
              :title="pendingCount > 0 ? `Mode Offline: ${pendingCount} data tersimpan di perangkat dan akan otomatis dikirim saat online.` : 'Mode Offline: Internet terputus. Data disimpan di perangkat.'"
            >
              <WifiOff :size="14" style="color: #D97706;" />
              <span>Offline {{ pendingCount > 0 ? `(${pendingCount})` : '' }}</span>
            </div>
          </div>

          <!-- Ikon Lonceng Notifikasi Log Aktivitas -->
          <div style="position: relative;">
            <button
              @click.stop="toggleBellDropdown"
              class="bell-btn"
              :class="{ 'has-unread': unreadCount > 0 }"
              title="Notifikasi Aktivitas (Barang, Penjualan, Pembelian)"
            >
              <Bell :size="19" />
              <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount }}</span>
            </button>

            <!-- Dropdown Log Notifikasi -->
            <div v-if="showBellDropdown" class="bell-dropdown" @click.stop>
              <div class="bell-dropdown-header">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">
                    Log Aktivitas Toko
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Riwayat 30 hari terakhir
                  </div>
                </div>
                <button
                  v-if="unreadCount > 0"
                  @click="markAllRead"
                  class="btn btn-sm btn-secondary"
                  style="font-size: 0.72rem; padding: 2px 8px; font-weight: 600;"
                  title="Tandai semua sudah dibaca"
                >
                  Tandai Dibaca
                </button>
              </div>

              <div class="bell-dropdown-body">
                <div
                  v-for="log in activityLogs"
                  :key="log.id"
                  class="bell-item"
                  :class="{ unread: !log.is_read }"
                >
                  <div class="bell-item-icon" :class="log.tipe">
                    <Package v-if="log.tipe === 'barang'" :size="16" />
                    <ShoppingCart v-else-if="log.tipe === 'penjualan'" :size="16" />
                    <Truck v-else-if="log.tipe === 'pembelian'" :size="16" />
                    <Layers v-else-if="log.tipe === 'kategori'" :size="16" />
                    <Bell v-else :size="16" />
                  </div>
                  <div class="bell-item-content" style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                      <div class="bell-item-title">{{ log.judul }}</div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span v-if="!log.is_read" class="unread-dot" title="Belum dibaca"></span>
                        <button
                          @click.stop="deleteSingleLog(log.id)"
                          class="btn-dismiss-log"
                          title="Hapus notifikasi ini"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                    <div class="bell-item-detail">{{ log.detail }}</div>
                    <div class="bell-item-time">{{ formatTimeAgo(log.created_at) }}</div>
                  </div>
                </div>

                <div v-if="activityLogs.length === 0" style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                  Belum ada log aktivitas dalam 30 hari terakhir.
                </div>
              </div>
            </div>
          </div>

          <!-- Badge Brand Toko (Otomatis disembunyikan di layar kecil agar lega) -->
          <div class="badge badge-blue desktop-brand-badge">
            <Zap :size="14" />
            <span>Citra 23 Palu</span>
          </div>
        </div>
      </header>

      <main class="content-body" @click="closeBellDropdown">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api';
import {
  isOnline,
  isSyncing,
  pendingCount,
  processSyncQueue,
  mirrorCatalogFromServer,
  syncStatusMessage
} from '../services/syncManager';
import {
  Zap,
  LayoutDashboard,
  Layers,
  KeyRound,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const mobileMenuOpen = ref(false);

// Tutup drawer saat pindah rute
watch(() => route.path, () => {
  mobileMenuOpen.value = false;
});

// Notification Bell State
const showBellDropdown = ref(false);
const activityLogs = ref([]);
const unreadCount = ref(0);
let pollTimer = null;

const userInitials = computed(() => {
  if (!auth.user?.nama) return 'U';
  return auth.user.nama.substring(0, 2).toUpperCase();
});

const currentRouteTitle = computed(() => {
  switch (route.path) {
    case '/': return 'Dashboard Ikhtisar';
    case '/kategori': return 'Kelola Kategori';
    case '/barang': return 'Inventaris & Data Barang';
    case '/penjualan': return 'Kasir & Input Penjualan';
    case '/pembelian': return 'Pembelian & Stok Masuk';
    case '/laporan': return 'Laporan Keuangan';
    case '/akun-pegawai': return 'Manajemen Akun Pegawai';
    default: return 'Toko Listrik Citra 23 Palu';
  }
});

const todayDateFormatted = computed(() => {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
});

const fetchActivityLogs = async () => {
  try {
    const res = await api.get('/activity');
    activityLogs.value = res.data.data;
    unreadCount.value = res.data.unread;
  } catch (err) {
    console.error('Failed to load activity logs:', err);
  }
};

const toggleBellDropdown = () => {
  showBellDropdown.value = !showBellDropdown.value;
  if (showBellDropdown.value) {
    fetchActivityLogs();
  }
};

const closeBellDropdown = () => {
  showBellDropdown.value = false;
};

const deleteSingleLog = async (id) => {
  try {
    const target = activityLogs.value.find(l => l.id === id);
    await api.delete(`/activity/${id}`);
    activityLogs.value = activityLogs.value.filter(l => l.id !== id);
    if (target && !target.is_read) {
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  } catch (err) {
    console.error('Failed to delete single log:', err);
  }
};

const markAllRead = async () => {
  try {
    await api.post('/activity/mark-read');
    unreadCount.value = 0;
    // Log yang berumur <= 30 hari TETAP MUNCUL di daftar, statusnya saja yang menjadi sudah dibaca
    activityLogs.value.forEach(l => {
      l.is_read = 1;
    });
  } catch (err) {
    console.error('Failed to mark read:', err);
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit yang lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam yang lalu`;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const handleLogout = async () => {
  if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
    await auth.logout();
    router.push('/login');
  }
};

const handleManualSync = async () => {
  await processSyncQueue();
};

const handleManualCatalogRefresh = async () => {
  const ok = await mirrorCatalogFromServer();
  if (ok) {
    alert('Katalog lokal berhasil disinkronkan dari database server!');
  }
};

const handleActivityUpdated = () => {
  fetchActivityLogs();
};

onMounted(() => {
  fetchActivityLogs();
  window.addEventListener('activity-updated', handleActivityUpdated);
  // Polling setiap 5 detik agar notifikasi dari kasir/user lain langsung update secara otomatis
  pollTimer = setInterval(fetchActivityLogs, 5000);
});

onUnmounted(() => {
  window.removeEventListener('activity-updated', handleActivityUpdated);
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
/* Responsive Navbar Helpers */
.navbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-medium);
  background: #FFFFFF;
  color: var(--text-main);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.hamburger-btn:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.mobile-close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
  background: #FFFFFF;
  color: var(--text-muted);
  cursor: pointer;
  margin-left: auto;
}

.mobile-close-btn:hover {
  background: var(--status-danger-bg);
  color: var(--status-danger);
  border-color: var(--status-danger-border);
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  z-index: 95;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.bell-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-medium);
  background: #FFFFFF;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}

.bell-btn:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.bell-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--status-danger);
  color: #FFFFFF;
  font-size: 0.65rem;
  font-weight: 800;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #FFFFFF;
  animation: badgePop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes badgePop {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.bell-dropdown {
  position: absolute;
  top: 48px;
  right: 0;
  width: 360px;
  background: #FFFFFF;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  overflow: hidden;
  animation: modalPop 0.18s ease;
}

.bell-dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F8FAFC;
}

.bell-dropdown-body {
  max-height: 380px;
  overflow-y: auto;
}

.bell-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);
}

.bell-item:hover {
  background: #F8FAFC;
}

.bell-item.unread {
  background: #EFF6FF;
}

.bell-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bell-item-icon.barang {
  background: #DBEAFE;
  color: #1D4ED8;
}

.bell-item-icon.penjualan {
  background: #DCFCE7;
  color: #15803D;
}

.bell-item-icon.pembelian {
  background: #FEF3C7;
  color: #B45309;
}

.bell-item-icon.kategori {
  background: #EEF2FF;
  color: #4F46E5;
}

.bell-item-content {
  flex: 1;
  min-width: 0;
}

.bell-item-title {
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--text-main);
}

.bell-item-detail {
  font-size: 0.775rem;
  color: var(--text-muted);
  line-height: 1.35;
  margin-top: 2px;
}

.bell-item-time {
  font-size: 0.7rem;
  color: var(--text-subtle);
  margin-top: 4px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: var(--color-primary);
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.btn-dismiss-log {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.btn-dismiss-log:hover {
  background-color: #FEE2E2;
  color: #DC2626;
}

/* Penyesuaian Responsif Tablet & Layar Kecil */
@media (max-width: 900px) {
  .hamburger-btn {
    display: inline-flex !important;
  }
  .mobile-close-btn {
    display: inline-flex !important;
  }
  .desktop-brand-badge {
    display: none !important;
  }
  .bell-dropdown {
    width: 300px;
    right: -10px;
  }
}

@media (max-width: 580px) {
  .navbar-date {
    display: none !important;
  }
  .page-title-box h2 {
    font-size: 0.95rem !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bell-dropdown {
    width: 280px;
    right: -15px;
  }
}
.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
