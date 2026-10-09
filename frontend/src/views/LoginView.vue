<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <div class="brand-badge">
          <Zap :size="28" stroke-width="2.5" />
        </div>
        <h2>CITRA 23 PALU</h2>
        <p>Sistem Terpusat Stok, Penjualan & Laba Rugi</p>
      </div>

      <div v-if="errorMessage" class="error-alert">
        <AlertCircle :size="18" />
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="submitLogin" class="login-form">
        <div class="form-group">
          <label class="form-label" for="username">Username</label>
          <div class="input-with-icon">
            <User :size="18" class="input-icon" />
            <input
              id="username"
              v-model="username"
              type="text"
              class="form-input"
              placeholder="Masukkan username"
              required
              autocomplete="username"
              :disabled="loading"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <div class="input-with-icon">
            <Lock :size="18" class="input-icon" />
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input password-input"
              placeholder="Masukkan password"
              required
              autocomplete="current-password"
              :disabled="loading"
            />
            <button
              type="button"
              class="password-toggle-btn"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Sembunyikan password' : 'Lihat password'"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Lihat password'"
              tabindex="-1"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <span v-if="loading">Memeriksa kredensial...</span>
          <span v-else style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>Masuk ke Sistem</span>
            <ArrowRight :size="18" />
          </span>
        </button>
      </form>

      <div class="login-footer">
        <div class="secure-tag">
          <ShieldCheck :size="14" />
          <span>Keamanan Terproteksi &bull; Palu, Sulawesi Tengah</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { Zap, User, Lock, ArrowRight, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

const submitLogin = async () => {
  if (!username.value || !password.value) return;
  loading.value = true;
  errorMessage.value = '';

  const res = await auth.login(username.value, password.value);
  loading.value = false;

  if (res.success) {
    if (res.role === 'admin') {
      router.push('/');
    } else {
      router.push('/penjualan');
    }
  } else {
    errorMessage.value = res.error;
  }
};
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 10%, #EBF3FF 0%, #F8FAFC 60%);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #FFFFFF;
  border-radius: 18px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 20px 25px -5px rgba(0, 92, 230, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
  padding: 36px 32px;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.brand-badge {
  width: 56px;
  height: 56px;
  background: #005CE6;
  color: #FFFFFF;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  box-shadow: 0 8px 20px rgba(0, 92, 230, 0.3);
}

.login-header h2 {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.02em;
}

.login-header p {
  font-size: 0.825rem;
  color: #64748B;
  margin-top: 4px;
}

.error-alert {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #DC2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.input-with-icon {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94A3B8;
}

.input-with-icon input {
  padding-left: 38px;
}

.password-input {
  padding-right: 42px !important;
}

.password-toggle-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.password-toggle-btn:hover {
  color: #005CE6;
  background: #F1F5F9;
}

.password-toggle-btn:focus-visible {
  outline: 2px solid #005CE6;
  outline-offset: 1px;
}

.btn-block {
  width: 100%;
  padding: 12px;
  font-size: 0.95rem;
  margin-top: 8px;
}

.login-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #F1F5F9;
  text-align: center;
}

.secure-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #64748B;
  font-weight: 500;
}
</style>
