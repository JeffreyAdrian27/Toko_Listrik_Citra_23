import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import KategoriView from '../views/KategoriView.vue';
import BarangView from '../views/BarangView.vue';
import PenjualanView from '../views/PenjualanView.vue';
import PembelianView from '../views/PembelianView.vue';
import LaporanView from '../views/LaporanView.vue';
import PegawaiView from '../views/PegawaiView.vue';
import ModView from '../views/ModView.vue';
import AuditLogView from '../views/AuditLogView.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPasswordView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/kategori',
    name: 'Kategori',
    component: KategoriView,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/mod',
    name: 'MasterMod',
    component: ModView,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/barang',
    name: 'Barang',
    component: BarangView,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/penjualan',
    name: 'Penjualan',
    component: PenjualanView,
    meta: { requiresAuth: true } // Admin & Pegawai
  },
  {
    path: '/pembelian',
    name: 'Pembelian',
    component: PembelianView,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/laporan',
    name: 'Laporan',
    component: LaporanView,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/akun-pegawai',
    name: 'AkunPegawai',
    component: PegawaiView,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: (to) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) return '/login';
      return auth.isAdmin ? '/' : '/penjualan';
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation Guard per PRD 5.2 & 5.4
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    if (auth.isAuthenticated) {
      return next(auth.isAdmin ? '/' : '/penjualan');
    }
    return next();
  }

  if (!auth.isAuthenticated) {
    return next('/login');
  }

  // Role check: If route requires admin and user is pegawai -> bounce to /penjualan
  if (to.meta.role === 'admin' && !auth.isAdmin) {
    return next('/penjualan');
  }

  next();
});

export default router;
