<template>
  <AppLayout>
    <!-- Filter Periode & Action Ekspor -->
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <BarChart3 :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Laporan Penjualan & Keuangan Toko Citra 23</h3>
        </div>
        <div style="display: flex; gap: 10px;">
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

          <button @click="fetchLaporan" class="btn btn-primary" style="height: 42px;">
            <RefreshCw :size="16" />
            <span>Tampilkan Laporan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Ringkasan Cards Finansial -->
    <div class="stats-grid">
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

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Total Unit Terjual</div>
          <div class="stat-value amount">
            {{ reportData.ringkasan?.total_qty_terjual || 0 }} unit
          </div>
          <div class="stat-sub">Volume barang kelistrikan laku</div>
        </div>
        <div class="stat-icon" style="background: #F1F5F9; color: #475569;">
          <Receipt :size="24" />
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Total Pasokan Masuk</div>
          <div class="stat-value amount" style="color: var(--status-success);">
            +{{ reportData.ringkasan?.total_pembelian_unit || 0 }} unit
          </div>
          <div class="stat-sub">Pasokan stok yang dicatat</div>
        </div>
        <div class="stat-icon green">
          <Truck :size="24" />
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Transaksi Pembelian</div>
          <div class="stat-value amount">
            {{ reportData.ringkasan?.total_transaksi_beli || 0 }} kali
          </div>
          <div class="stat-sub">Frekuensi pasokan tercatat</div>
        </div>
        <div class="stat-icon blue">
          <DollarSign :size="24" />
        </div>
      </div>
    </div>

    <!-- Rincian Penjualan per Barang & Kode MOD -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Rincian Penjualan & Kode MOD per Barang</h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          Periode: <strong>{{ activePeriodLabel }}</strong>
        </span>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 60px;">No</th>
              <th>Kode Barang</th>
              <th>Nama Produk</th>
              <th style="text-align: center; width: 110px;">MOD</th>
              <th style="text-align: center;">Terjual</th>
              <th style="text-align: right;">Total Omzet</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in reportData.rincian_barang" :key="item.barang_id">
              <td>{{ idx + 1 }}</td>
              <td><span class="badge badge-blue">{{ item.kode_barang }}</span></td>
              <td style="font-weight: 600;">{{ item.nama_barang }}</td>
              <td style="text-align: center;">
                <span class="badge" style="background: #EBF3FF; color: #005CE6; font-family: monospace; font-weight: 800; font-size: 0.85rem;">
                  {{ item.MOD_kode || '-' }}
                </span>
              </td>
              <td class="num" style="text-align: center; font-weight: 700;">{{ item.total_terjual }} unit</td>
              <td class="num" style="text-align: right; font-weight: 700; color: var(--color-primary);">
                Rp {{ formatNumber(item.total_omzet) }}
              </td>
            </tr>
            <tr v-if="!reportData.rincian_barang || reportData.rincian_barang.length === 0">
              <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
                Tidak ada data transaksi pada periode ini.
              </td>
            </tr>
          </tbody>
        </table>
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
  Truck,
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
    total_qty_terjual: 0,
    total_pembelian_unit: 0,
    total_transaksi_beli: 0
  },
  rincian_barang: []
});

// Periode yang ditampilkan hanya diperbarui saat tombol "Tampilkan Laporan" diklik
const activePeriodLabel = ref('');

const fetchLaporan = async () => {
  try {
    const params = {};
    if (filterMode.value === 'bulan') {
      params.bulan = filterMonth.value;
      params.tahun = filterYear.value;
      activePeriodLabel.value = `${monthNames[filterMonth.value - 1]} ${filterYear.value}`;
    } else {
      params.dari_tanggal = filterStartDate.value;
      params.sampai_tanggal = filterEndDate.value;
      activePeriodLabel.value = `${filterStartDate.value} s/d ${filterEndDate.value}`;
    }

    const res = await api.get('/laporan/laba-rugi', { params });
    reportData.value = res.data;
  } catch (err) {
    console.error('Failed to load report:', err);
  }
};

const formatNumber = (num) => Number(num || 0).toLocaleString('id-ID');

// Export to PDF
const exportToPDF = () => {
  const doc = new jsPDF();
  const title = 'Laporan Penjualan — Toko Listrik Citra 23 Palu';
  const subtitle = `Periode: ${activePeriodLabel.value}`;

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
  doc.text('Ringkasan:', 14, 38);

  const ringkasan = reportData.value.ringkasan || {};
  const summaryRows = [
    ['Total Penjualan (Omzet)', `Rp ${formatNumber(ringkasan.total_omzet)}`],
    ['Total Barang Terjual', `${ringkasan.total_qty_terjual || 0} unit`],
    ['Total Pasokan Masuk', `${ringkasan.total_pembelian_unit || 0} unit`]
  ];

  autoTable(doc, {
    startY: 42,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
  });

  // Table of Items
  const tableData = (reportData.value.rincian_barang || []).map((it, idx) => [
    idx + 1,
    it.kode_barang,
    it.nama_barang,
    it.MOD_kode || '-',
    `${it.total_terjual} unit`,
    `Rp ${formatNumber(it.total_omzet)}`
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['No', 'Kode', 'Nama Barang', 'MOD', 'Terjual', 'Total Omzet']],
    body: tableData,
    headStyles: { fillColor: [0, 92, 230], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8.5 }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Halaman ${i} dari ${pageCount}`, 14, 290);
  }

  doc.save(`Laporan_Penjualan_Citra23_${activePeriodLabel.value.replace(/\s+/g, '_')}.pdf`);
};

// Export to Excel
const exportToExcel = () => {
  const dataRows = (reportData.value.rincian_barang || []).map((it, idx) => ({
    'No': idx + 1,
    'Kode Barang': it.kode_barang,
    'Nama Barang': it.nama_barang,
    'MOD': it.MOD_kode || '-',
    'Qty Terjual': Number(it.total_terjual),
    'Total Omzet (Rp)': Number(it.total_omzet)
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rincian Penjualan');

  XLSX.writeFile(workbook, `Laporan_Penjualan_Citra23_${activePeriodLabel.value.replace(/\s+/g, '_')}.xlsx`);
};

onMounted(() => {
  fetchLaporan();
});
</script>
