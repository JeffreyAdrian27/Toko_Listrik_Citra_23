<template>
  <div class="reset-wrapper">
    <div class="reset-card">
      <div class="reset-header">
        <div class="brand-badge">
          <Zap :size="28" stroke-width="2.5" />
        </div>
        <h2>CITRA 23 PALU</h2>
        <p>Atur Ulang Password Administrator</p>
      </div>

      <!-- State 1: Memeriksa Token -->
      <div v-if="verifying" class="status-box">
        <Loader2 :size="32" class="spin-icon" />
        <p>Memverifikasi tautan pemulihan...</p>
      </div>

      <!-- State 2: Token Tidak Valid / Kadaluarsa -->
      <div v-else-if="tokenError" class="status-box error">
        <AlertTriangle :size="36" class="error-icon" />
        <h3>Tautan Tidak Valid</h3>
        <p>{{ tokenError }}</p>
        <router-link to="/login" class="btn btn-primary" style="margin-top: 16px;">
          Kembali ke Halaman Login
        </router-link>
      </div>

      <!-- State 3: Sukses Reset Password -->
      <div v-else-if="resetSuccess" class="status-box success">
        <CheckCircle2 :size="40" class="success-icon" />
        <h3>Password Berhasil Diperbarui!</h3>
        <p>Kata sandi akun Administrator Anda telah berhasil diubah. Silakan masuk kembali dengan password baru.</p>
        <router-link to="/login" class="btn btn-primary" style="margin-top: 20px; width: 100%;">
          Masuk ke Sistem Sekarang
        </router-link>
      </div>

      <!-- State 4: Form Input Password Baru -->
      <div v-else>
        <div v-if="formError" class="error-alert">
          <AlertCircle :size="18" />
          <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="submitReset" class="reset-form">
          <div class="form-group">
            <label class="form-label" for="new-password">Password Baru</label>
            <div class="input-with-icon">
              <Lock :size="18" class="input-icon" />
              <input
                id="new-password"
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                class="form-input password-input"
                placeholder="Minimal 6 karakter"
                required
                minlength="6"
                :disabled="loading"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="showNewPassword = !showNewPassword"
                tabindex="-1"
              >
                <EyeOff v-if="showNewPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="confirm-password">Konfirmasi Password Baru</label>
            <div class="input-with-icon">
              <Lock :size="18" class="input-icon" />
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="form-input password-input"
                placeholder="Ketik ulang password baru"
                required
                minlength="6"
                :disabled="loading"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="showConfirmPassword = !showConfirmPassword"
                tabindex="-1"
              >
                <EyeOff v-if="showConfirmPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" :disabled="loading" style="margin-top: 10px;">
            <span v-if="loading">Menyimpan password...</span>
            <span v-else>Simpan Password Baru</span>
          </button>

          <div style="text-align: center; margin-top: 16px;">
            <router-link to="/login" class="back-link">
              Batal &bull; Kembali ke Login
            </router-link>
          </div>
        </form>
      </div>

      <div class="reset-footer">
        <div class="secure-tag">
          <ShieldCheck :size="14" />
          <span>Keamanan Terenkripsi &bull; Toko Citra 23 Palu</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';
import {
  Zap,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Loader2
} from 'lucide-vue-next';

const route = useRoute();
const token = ref('');
const verifying = ref(true);
const tokenError = ref('');

const newPassword = ref('');
const confirmPassword = ref('');
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const loading = ref(false);
const formError = ref('');
const resetSuccess = ref(false);

onMounted(async () => {
  token.value = route.query.token || '';

  if (!token.value) {
    verifying.value = false;
    tokenError.value = 'Tautan pemulihan tidak memiliki token yang valid. Harap periksa kembali link di email Anda.';
    return;
  }

  try {
    await api.get(`/auth/verify-reset-token?token=${encodeURIComponent(token.value)}`);
    verifying.value = false;
  } catch (err) {
    verifying.value = false;
    tokenError.value = err.response?.data?.error || 'Tautan pemulihan sudah kadaluarsa (lebih dari 15 menit) atau tidak valid.';
  }
});

const submitReset = async () => {
  formError.value = '';

  if (newPassword.value.length < 6) {
    formError.value = 'Password baru minimal harus 6 karakter.';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'Konfirmasi password tidak cocok dengan password baru.';
    return;
  }

  loading.value = true;
  try {
    await api.post('/auth/reset-password', {
      token: token.value,
      new_password: newPassword.value
    });
    resetSuccess.value = true;
  } catch (err) {
    formError.value = err.response?.data?.error || 'Gagal mereset password. Silakan coba lagi.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.reset-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 10% 20%, rgba(0, 92, 230, 0.08) 0%, rgba(248, 250, 252, 1) 90%);
  padding: 24px;
}

.reset-card {
  width: 100%;
  max-width: 440px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 92, 230, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 36px 32px;
}

.reset-header {
  text-align: center;
  margin-bottom: 24px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #005CE6 0%, #0045B0 100%);
  color: #FFFFFF;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 92, 230, 0.25);
}

.reset-header h2 {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin: 0;
  color: #0F172A;
}

.reset-header p {
  color: #64748B;
  font-size: 0.85rem;
  margin: 4px 0 0;
}

.status-box {
  text-align: center;
  padding: 24px 16px;
}

.status-box.error h3 {
  color: #DC2626;
  font-size: 1.1rem;
  margin: 12px 0 6px;
}

.status-box.error p {
  color: #64748B;
  font-size: 0.85rem;
  margin: 0;
}

.error-icon {
  color: #DC2626;
}

.status-box.success h3 {
  color: #059669;
  font-size: 1.15rem;
  margin: 14px 0 6px;
}

.status-box.success p {
  color: #475569;
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.5;
}

.success-icon {
  color: #059669;
}

.spin-icon {
  animation: spin 1s linear infinite;
  color: #005CE6;
  margin-bottom: 12px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #FEF2F2;
  border: 1px solid #FECACA;
  color: #DC2626;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 18px;
  font-size: 0.85rem;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 0.825rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #94A3B8;
  pointer-events: none;
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 8px 12px 8px 38px;
  border: 1px solid #CBD5E1;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #0F172A;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: #005CE6;
  box-shadow: 0 0 0 3px rgba(0, 92, 230, 0.12);
}

.password-input {
  padding-right: 40px;
}

.password-toggle-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.password-toggle-btn:hover {
  color: #475569;
}

.btn-block {
  width: 100%;
  height: 42px;
  font-weight: 700;
}

.back-link {
  color: #64748B;
  font-size: 0.825rem;
  text-decoration: none;
  font-weight: 500;
}

.back-link:hover {
  color: #005CE6;
  text-decoration: underline;
}

.reset-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #F1F5F9;
  text-align: center;
}

.secure-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #94A3B8;
  font-size: 0.75rem;
}
</style>
