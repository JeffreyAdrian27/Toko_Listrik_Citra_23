const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const kategoriRoutes = require('./routes/kategoriRoutes');
const barangRoutes = require('./routes/barangRoutes');
const penjualanRoutes = require('./routes/penjualanRoutes');
const pembelianRoutes = require('./routes/pembelianRoutes');
const laporanRoutes = require('./routes/laporanRoutes');
const pegawaiRoutes = require('./routes/pegawaiRoutes');
const activityRoutes = require('./routes/activityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const modRoutes = require('./routes/modRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Anti-Dorking per PRD 5.1
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false // Allows API communication cleanly
}));

// HTTP Header Anti-Indexing (Anti-Dorking)
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});

// Serve robots.txt directly
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /\n');
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kategori', kategoriRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/penjualan', penjualanRoutes);
app.use('/api/pembelian', pembelianRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/pegawai', pegawaiRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mod', modRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', store: 'Toko Listrik Citra 23 Palu', time: new Date() });
});

// 404 Handler (Generic, no directory listing or internal paths leaked)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// Generic Error Handler (No stack trace or SQL leakage per PRD 5.1)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
});

app.listen(PORT, () => {
  console.log(`Server Toko Listrik Citra 23 running on port ${PORT}`);
});
