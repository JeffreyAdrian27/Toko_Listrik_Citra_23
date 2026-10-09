<template>
  <AppLayout>
    <!-- Filter Periode & Action Ekspor -->
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <BarChart3 :size="20" style="color: var(--color-primary);" />
          <div>
            <h3 class="card-title">Laporan Laba Rugi &amp; Keuangan Toko Citra 23</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
              Perhitungan Omzet, HPP berdasarkan Master MOD, dan estimasi keuntungan bersih toko.
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button @click="exportToPDF" class="btn btn-sm btn-secondary" style="font-weight: 700; color: #DC2626; border-color: #FECACA;">
            <FileText :size="16" />
            <span>Ekspor PDF</span>
          </button>
          <button @click="exportToExcel" class="btn btn-sm btn-secondary" style="font-weight: 700; color: #059669; border-color: #A7F3D0;">
            <FileSpreadsheet :size="16" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <div class="filter-bar" style="align-items: flex-end;">
          <div style="width: 170px;">
            <label class="form-label" style="font-size: 0.75rem;">Mode Filter</label>
            <select v-model="filterMode" class="form-select">
              <option value="bulan">Per Bulan</option>
              <option value="tahun">Per Tahun</option>
              <option value="range">Rentang Tanggal</option>
            </select>
          </div>

          <template v-if="filterMode === 'bulan'">
            <div style="width: 160px;">
              <label class="form-label" style="font-size: 0.75rem;">Bulan</label>
              <select v-model="filterMonth" class="form-select">
                <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
              </select>
            </div>
            <div style="width: 120px;">
              <label class="form-label" style="font-size: 0.75rem;">Tahun</label>
              <select v-model="filterYear" class="form-select">
                <option v-for="y in [2024, 2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </template>

          <template v-else-if="filterMode === 'tahun'">
            <div style="width: 150px;">
              <label class="form-label" style="font-size: 0.75rem;">Pilih Tahun</label>
              <select v-model="filterYear" class="form-select">
                <option v-for="y in [2024, 2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </template>

          <template v-else>
            <div style="width: 170px;">
              <label class="form-label" style="font-size: 0.75rem;">Dari Tanggal</label>
              <input v-model="filterStartDate" type="date" class="form-input" />
            </div>
            <div style="width: 170px;">
              <label class="form-label" style="font-size: 0.75rem;">Sampai Tanggal</label>
              <input v-model="filterEndDate" type="date" class="form-input" />
            </div>
          </template>

          <button @click="fetchLaporan(true)" class="btn btn-primary" style="height: 42px;">
            <RefreshCw :size="16" />
            <span>Tampilkan Laporan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Ringkasan Cards Finansial (Laba Rugi Otomatis dari MOD) -->
    <div class="stats-grid">
      <!-- 1. Omzet Penjualan -->
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Total Omzet Penjualan</div>
          <div class="stat-value amount" style="color: var(--color-primary);">
            Rp {{ formatNumber(reportData.ringkasan?.total_omzet) }}
          </div>
          <div class="stat-sub">Periode: {{ activePeriodLabel }}</div>
        </div>
        <div class="stat-icon blue">
          <TrendingUp :size="24" />
        </div>
      </div>

      <!-- 2. Total Modal HPP (Dari Master MOD) -->
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Total Modal (HPP MOD)</div>
          <div class="stat-value amount" style="color: #64748B;">
            Rp {{ formatNumber(reportData.ringkasan?.total_modal_hpp) }}
          </div>
          <div class="stat-sub">Harga pokok barang terjual</div>
        </div>
        <div class="stat-icon" style="background: #F1F5F9; color: #475569;">
          <Coins :size="24" />
        </div>
      </div>

      <!-- 3. Estimasi Laba Kotor (Omzet - HPP) -->
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Estimasi Laba Kotor</div>
          <div
            class="stat-value amount"
            :style="{ color: (reportData.ringkasan?.total_laba_kotor || 0) >= 0 ? '#059669' : '#DC2626' }"
          >
            Rp {{ formatNumber(reportData.ringkasan?.total_laba_kotor) }}
          </div>
          <div class="stat-sub">
            Margin: <strong>{{ reportData.ringkasan?.margin_laba_persen || 0 }}%</strong>
          </div>
        </div>
        <div
          class="stat-icon"
          :style="{
            background: (reportData.ringkasan?.total_laba_kotor || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
            color: (reportData.ringkasan?.total_laba_kotor || 0) >= 0 ? '#059669' : '#DC2626'
          }"
        >
          <DollarSign :size="24" />
        </div>
      </div>

      <!-- 4. Total Volume Penjualan -->
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Total Unit Terjual</div>
          <div class="stat-value amount">
            {{ reportData.ringkasan?.total_qty_terjual || 0 }} unit
          </div>
          <div class="stat-sub">Pasokan masuk: +{{ reportData.ringkasan?.total_pembelian_unit || 0 }} unit</div>
        </div>
        <div class="stat-icon blue">
          <Receipt :size="24" />
        </div>
      </div>
    </div>

    <!-- Rincian Penjualan per Barang & Kode MOD -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Rincian Penjualan, Nilai MOD &amp; Keuntungan per Barang</h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          Periode: <strong>{{ activePeriodLabel }}</strong>
        </span>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th style="width: 110px;">Tanggal</th>
              <th>Kode Barang</th>
              <th>Nama Produk</th>
              <th style="text-align: center; width: 100px;">MOD</th>
              <th style="text-align: right; width: 130px;">Modal/Unit</th>
              <th style="text-align: center; width: 100px;">Terjual</th>
              <th style="text-align: right; width: 140px;">Total Omzet</th>
              <th style="text-align: right; width: 140px;">Total Modal</th>
              <th style="text-align: right; width: 150px;">Laba Kotor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in paginatedRincian" :key="idx">
              <td>{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td style="font-size: 0.825rem; color: #475569; font-weight: 500; white-space: nowrap;">
                {{ formatDate(item.tanggal) }}
              </td>
              <td><span class="badge badge-blue">{{ item.kode_barang }}</span></td>
              <td style="font-weight: 600;">{{ item.nama_barang }}</td>
              <td style="text-align: center;">
                <span class="badge" style="background: #EBF3FF; color: #005CE6; font-family: monospace; font-weight: 800; font-size: 0.85rem;">
                  {{ item.MOD_kode || '-' }}
                </span>
              </td>
              <td class="num" style="text-align: right; color: #64748B;">
                Rp {{ formatNumber(item.harga_beli_modal) }}
              </td>
              <td class="num" style="text-align: center; font-weight: 700;">{{ item.total_terjual }} unit</td>
              <td class="num" style="text-align: right; font-weight: 700; color: var(--color-primary);">
                Rp {{ formatNumber(item.total_omzet) }}
              </td>
              <td class="num" style="text-align: right; color: #64748B;">
                Rp {{ formatNumber(item.total_modal_hpp) }}
              </td>
              <td
                class="num"
                style="text-align: right; font-weight: 700;"
                :style="{ color: Number(item.total_laba_kotor) >= 0 ? '#059669' : '#DC2626' }"
              >
                Rp {{ formatNumber(item.total_laba_kotor) }}
              </td>
            </tr>
            <tr v-if="!reportData.rincian_barang || reportData.rincian_barang.length === 0">
              <td colspan="10" style="text-align: center; padding: 32px; color: var(--text-muted);">
                Tidak ada data transaksi pada periode ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Rincian Penjualan (5 Penjualan per Halaman) -->
      <div v-if="reportData.rincian_barang && reportData.rincian_barang.length > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          Menampilkan halaman <strong>{{ currentPage }}</strong> dari <strong>{{ totalPages }}</strong> (Total <strong>{{ reportData.rincian_barang.length }}</strong> penjualan &bull; 5 per halaman)
        </span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button
            @click="currentPage--"
            :disabled="currentPage <= 1"
            class="btn btn-sm btn-secondary"
            title="Halaman Sebelumnya"
          >
            &larr; Sebelumnya
          </button>
          
          <button
            v-for="p in totalPages"
            :key="p"
            @click="currentPage = p"
            class="btn btn-sm"
            :class="currentPage === p ? 'btn-primary' : 'btn-secondary'"
            style="min-width: 32px; padding: 4px 8px; font-weight: 700;"
          >
            {{ p }}
          </button>

          <button
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="btn btn-sm btn-secondary"
            title="Halaman Selanjutnya"
          >
            Selanjutnya &rarr;
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  DollarSign,
  Coins,
  FileText,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-vue-next';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const filterMode = ref('bulan');
const filterMonth = ref(new Date().getMonth() + 1);
const filterYear = ref(new Date().getFullYear());
const filterStartDate = ref(new Date().toISOString().split('T')[0]);
const filterEndDate = ref(new Date().toISOString().split('T')[0]);

const reportData = ref({
  ringkasan: {
    total_omzet: 0,
    total_modal_hpp: 0,
    total_laba_kotor: 0,
    margin_laba_persen: 0,
    total_qty_terjual: 0,
    total_pembelian_unit: 0,
    total_biaya_pembelian: 0,
    total_transaksi_beli: 0
  },
  rincian_barang: []
});

const activePeriodLabel = computed(() => {
  if (filterMode.value === 'bulan') {
    return `${monthNames[filterMonth.value - 1]} ${filterYear.value}`;
  }
  if (filterMode.value === 'tahun') {
    return `Tahun ${filterYear.value} (1 Tahun Penuh)`;
  }
  return `${filterStartDate.value} s/d ${filterEndDate.value}`;
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

// Pagination Rincian Penjualan: 5 penjualan per halaman
const currentPage = ref(1);
const pageSize = 5;

const paginatedRincian = computed(() => {
  const list = reportData.value.rincian_barang || [];
  const start = (currentPage.value - 1) * pageSize;
  return list.slice(start, start + pageSize);
});

const totalPages = computed(() => {
  const count = (reportData.value.rincian_barang || []).length;
  return Math.ceil(count / pageSize) || 1;
});

const fetchLaporan = async (resetPage = false) => {
  if (resetPage) currentPage.value = 1;
  try {
    const params = {};
    if (filterMode.value === 'bulan') {
      params.bulan = filterMonth.value;
      params.tahun = filterYear.value;
    } else if (filterMode.value === 'tahun') {
      params.tahun = filterYear.value;
      // bulan tidak dikirim agar backend mengambil seluruh bulan dalam tahun tersebut
    } else {
      params.dari_tanggal = filterStartDate.value;
      params.sampai_tanggal = filterEndDate.value;
    }

    const res = await api.get('/laporan/laba-rugi', { params });
    reportData.value = res.data;
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value);
    }
  } catch (err) {
    console.error('fetchLaporan error:', err);
  }
};

// Export to PDF
const exportToPDF = () => {
  const doc = new jsPDF('p', 'mm', 'a4');

  const title = 'Laporan Laba Rugi & Keuangan';
  const subtitle = `Toko Listrik Citra 23 Palu | Periode: ${activePeriodLabel.value}`;

  // Header Banner
  doc.setFillColor(0, 92, 230); // #005CE6
  doc.rect(0, 0, 210, 28, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 14, 22);

  // Summary Metrics Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Keuangan:', 14, 38);

  const ringkasan = reportData.value.ringkasan || {};
  const summaryRows = [
    ['Total Penjualan (Omzet)', `Rp ${formatNumber(ringkasan.total_omzet)}`],
    ['Total Modal HPP (Berdasarkan MOD)', `Rp ${formatNumber(ringkasan.total_modal_hpp)}`],
    ['Estimasi Laba Kotor', `Rp ${formatNumber(ringkasan.total_laba_kotor)} (Margin ${ringkasan.margin_laba_persen || 0}%)`],
    ['Total Barang Terjual', `${ringkasan.total_qty_terjual || 0} unit`],
    ['Total Pasokan Masuk', `${ringkasan.total_pembelian_unit || 0} unit`]
  ];

  autoTable(doc, {
    startY: 42,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 85 } }
  });

  // Table of Items
  const tableData = (reportData.value.rincian_barang || []).map((it, idx) => [
    idx + 1,
    formatDate(it.tanggal),
    it.kode_barang,
    it.nama_barang,
    it.MOD_kode || '-',
    `Rp ${formatNumber(it.harga_beli_modal)}`,
    `${it.total_terjual}`,
    `Rp ${formatNumber(it.total_omzet)}`,
    `Rp ${formatNumber(it.total_modal_hpp)}`,
    `Rp ${formatNumber(it.total_laba_kotor)}`
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['No', 'Tanggal', 'Kode', 'Nama Barang', 'MOD', 'Modal/Unit', 'Qty', 'Omzet', 'HPP', 'Laba Kotor']],
    body: tableData,
    headStyles: { fillColor: [0, 92, 230], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Halaman ${i} dari ${pageCount}`, 14, 290);
  }

  doc.save(`Laporan_Laba_Rugi_Citra23_${activePeriodLabel.value.replace(/\s+/g, '_')}.pdf`);
};

// Export to Excel
const exportToExcel = () => {
  const dataRows = (reportData.value.rincian_barang || []).map((it, idx) => ({
    'No': idx + 1,
    'Tanggal': formatDate(it.tanggal),
    'Kode Barang': it.kode_barang,
    'Nama Barang': it.nama_barang,
    'Kode MOD': it.MOD_kode || '-',
    'Modal Satuan (Rp)': Number(it.harga_beli_modal),
    'Qty Terjual': Number(it.total_terjual),
    'Total Omzet (Rp)': Number(it.total_omzet),
    'Total Modal HPP (Rp)': Number(it.total_modal_hpp),
    'Laba Kotor (Rp)': Number(it.total_laba_kotor)
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rincian Laba Rugi');

  XLSX.writeFile(workbook, `Laporan_Laba_Rugi_Citra23_${activePeriodLabel.value.replace(/\s+/g, '_')}.xlsx`);
};

onMounted(() => {
  fetchLaporan();
});
</script>
