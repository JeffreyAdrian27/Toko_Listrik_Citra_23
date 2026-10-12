import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import './style.css';
import App from './App.vue';
import { initSyncService } from './services/syncManager';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Inisialisasi Deteksi Jaringan & Auto-Sync Offline
initSyncService();

app.mount('#app');
