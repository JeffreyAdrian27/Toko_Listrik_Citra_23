import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isPegawai: (state) => state.user?.role === 'pegawai',
    userName: (state) => state.user?.nama || 'Pengguna'
  },

  actions: {
    async login(username, password) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/auth/login', { username, password });
        this.token = res.data.token;
        this.user = res.data.user;

        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));

        return { success: true, role: this.user.role };
      } catch (err) {
        this.error = err.response?.data?.error || 'Gagal login ke sistem.';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        if (this.token) {
          await api.post('/auth/logout');
        }
      } catch (e) {
        // Ignore logout errors
      } finally {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }
});
