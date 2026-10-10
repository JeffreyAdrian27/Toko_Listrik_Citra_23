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
          <button
            @click="exportToPDF"
            class="btn btn-sm btn-secondary"
            :disabled="!hasData"
            :style="{
              fontWeight: 700,
              color: hasData ? '#DC2626' : '#94A3B8',
              borderColor: hasData ? '#FECACA' : '#E2E8F0',
              backgroundColor: hasData ? '#FFFFFF' : '#F8FAFC',
              cursor: hasData ? 'pointer' : 'not-allowed',
              opacity: hasData ? 1 : 0.55
            }"
            :title="hasData ? 'Ekspor Laporan ke PDF' : 'Tidak ada data untuk diekspor'"
          >
            <FileText :size="16" />
            <span>Ekspor PDF</span>
          </button>

          <button
            @click="exportToExcel"
            class="btn btn-sm btn-secondary"
            :disabled="!hasData"
            :style="{
              fontWeight: 700,
              color: hasData ? '#059669' : '#94A3B8',
              borderColor: hasData ? '#A7F3D0' : '#E2E8F0',
              backgroundColor: hasData ? '#FFFFFF' : '#F8FAFC',
              cursor: hasData ? 'pointer' : 'not-allowed',
              opacity: hasData ? 1 : 0.55
            }"
            :title="hasData ? 'Ekspor Laporan ke Excel' : 'Tidak ada data untuk diekspor'"
          >
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
            Sebelumnya
          </button>
          
          <button
            v-for="p in displayedPages"
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
            Selanjutnya
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
import ExcelJS from 'exceljs';

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

// Filter yang sedang aktif diterapkan pada laporan (hanya diperbarui saat klik "Tampilkan Laporan")
const appliedPeriod = ref({
  mode: 'bulan',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0]
});

const activePeriodLabel = computed(() => {
  if (appliedPeriod.value.mode === 'bulan') {
    return `${monthNames[appliedPeriod.value.month - 1]} ${appliedPeriod.value.year}`;
  }
  if (appliedPeriod.value.mode === 'tahun') {
    return `Tahun ${appliedPeriod.value.year} (1 Tahun Penuh)`;
  }
  return `${appliedPeriod.value.startDate} s/d ${appliedPeriod.value.endDate}`;
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

const displayedPages = computed(() => {
  const total = totalPages.value || 1;
  if (total <= 5) {
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(1, Math.min(currentPage.value, total - 4));
  const pages = [];
  for (let i = 0; i < 5; i++) {
    pages.push(start + i);
  }
  return pages;
});

const hasData = computed(() => {
  return Array.isArray(reportData.value.rincian_barang) && reportData.value.rincian_barang.length > 0;
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

    // Terapkan perubahan filter ke tampilan & label periode hanya setelah data berhasil dimuat
    appliedPeriod.value = {
      mode: filterMode.value,
      month: filterMonth.value,
      year: filterYear.value,
      startDate: filterStartDate.value,
      endDate: filterEndDate.value
    };

    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value);
    }
  } catch (err) {
    console.error('fetchLaporan error:', err);
  }
};

// Export to PDF
const exportToPDF = () => {
  if (!hasData.value) {
    alert('Tidak ada data transaksi pada periode ini untuk diekspor.');
    return;
  }

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

  const cleanPeriod = activePeriodLabel.value.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Laporan_Laba_Rugi_Citra23_${cleanPeriod}.pdf`);
};

// Export to Excel dengan Warna Elegan, Kop Surat, Ringkasan, Border Rapi & Teks Bebas Terpotong
const exportToExcel = async () => {
  if (!hasData.value) {
    alert('Tidak ada data transaksi pada periode ini untuk diekspor.');
    return;
  }

  const ringkasan = reportData.value.ringkasan || {};
  const items = reportData.value.rincian_barang || [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Toko Listrik Citra 23 Palu';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laba Rugi Citra 23', {
    views: [{ showGridLines: true }]
  });

  // Atur lebar kolom (lebar ekstra agar teks produk dan nominal rupiah tidak pernah terpotong)
  sheet.columns = [
    { key: 'no', width: 7 },
    { key: 'tanggal', width: 16 },
    { key: 'kode_barang', width: 20 },
    { key: 'nama_barang', width: 55 },
    { key: 'kode_mod', width: 16 },
    { key: 'modal_satuan', width: 22 },
    { key: 'qty', width: 16 },
    { key: 'omzet', width: 24 },
    { key: 'modal_hpp', width: 24 },
    { key: 'laba_kotor', width: 24 }
  ];

  // Helper untuk border tipis rapi pada sel
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // 1. Baris Judul Utama (Kop Laporan Berwarna Biru Citra 23)
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'TOKO LISTRIK CITRA 23 PALU';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005CE6' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 36;

  sheet.mergeCells('A2:J2');
  const subCell = sheet.getCell('A2');
  subCell.value = 'LAPORAN LABA RUGI & KEUANGAN';
  subCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF005CE6' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF3FF' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 24;

  sheet.mergeCells('A3:J3');
  const periodCell = sheet.getCell('A3');
  periodCell.value = `Periode: ${activePeriodLabel.value} | Dicetak pada: ${new Date().toLocaleString('id-ID')}`;
  periodCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  periodCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(3).height = 20;

  sheet.addRow([]); // Baris 4 kosong

  // 2. Bagian Ringkasan Eksekutif Keuangan
  sheet.mergeCells('A5:D5');
  const sumHeader = sheet.getCell('A5');
  sumHeader.value = 'RINGKASAN EKSEKUTIF KEUANGAN';
  sumHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  sumHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(5).height = 24;

  const summaryData = [
    ['Total Penjualan (Omzet)', Number(ringkasan.total_omzet || 0), 'currency'],
    ['Total Modal HPP (Berdasarkan MOD)', Number(ringkasan.total_modal_hpp || 0), 'currency'],
    ['Estimasi Laba Kotor', Number(ringkasan.total_laba_kotor || 0), 'currency_profit'],
    ['Margin Laba Kotor', `${ringkasan.margin_laba_persen || 0}%`, 'text'],
    ['Total Barang Terjual', `${ringkasan.total_qty_terjual || 0} unit`, 'text'],
    ['Total Pasokan Masuk', `${ringkasan.total_pembelian_unit || 0} unit`, 'text']
  ];

  summaryData.forEach((row, i) => {
    const rowNum = 6 + i;
    sheet.mergeCells(`A${rowNum}:C${rowNum}`);
    const lbl = sheet.getCell(`A${rowNum}`);
    lbl.value = row[0];
    lbl.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
    lbl.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    lbl.border = thinBorder;

    const val = sheet.getCell(`D${rowNum}`);
    val.value = row[1];
    val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
    val.border = thinBorder;

    if (row[2] === 'currency') {
      val.numFmt = '"Rp "#,##0';
      val.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF005CE6' } };
      val.alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (row[2] === 'currency_profit') {
      val.numFmt = '"Rp "#,##0';
      const isPositive = Number(ringkasan.total_laba_kotor || 0) >= 0;
      val.font = { name: 'Arial', size: 10, bold: true, color: { argb: isPositive ? 'FF059669' : 'FFDC2626' } };
      val.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      val.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      val.alignment = { vertical: 'middle', horizontal: 'center' };
    }
    sheet.getRow(rowNum).height = 20;
  });

  sheet.addRow([]); // Baris 12 kosong

  // 3. Header Tabel Rincian Transaksi
  sheet.mergeCells('A13:J13');
  const tblTitle = sheet.getCell('A13');
  tblTitle.value = 'RINCIAN PENJUALAN, NILAI MOD & KEUNTUNGAN PER BARANG';
  tblTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  tblTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  tblTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(13).height = 24;

  const headerRow = sheet.getRow(14);
  headerRow.values = [
    'No',
    'Tanggal',
    'Kode Barang',
    'Nama Produk',
    'Kode MOD',
    'Modal Satuan (Rp)',
    'Qty Terjual',
    'Total Omzet (Rp)',
    'Total Modal HPP (Rp)',
    'Laba Kotor (Rp)'
  ];
  headerRow.height = 28;

  headerRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005CE6' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNum === 4 ? 'left' : (colNum >= 6 ? 'right' : 'center'),
      wrapText: true
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0047B3' } },
      left: { style: 'thin', color: { argb: 'FF93C5FD' } },
      bottom: { style: 'medium', color: { argb: 'FF0047B3' } },
      right: { style: 'thin', color: { argb: 'FF93C5FD' } }
    };
  });

  let totalQty = 0;
  let totalOmzet = 0;
  let totalModal = 0;
  let totalLaba = 0;

  // 4. Baris-baris Data Transaksi
  items.forEach((it, idx) => {
    const qty = Number(it.total_terjual || 0);
    const omzet = Number(it.total_omzet || 0);
    const modal = Number(it.total_modal_hpp || 0);
    const laba = Number(it.total_laba_kotor || 0);

    totalQty += qty;
    totalOmzet += omzet;
    totalModal += modal;
    totalLaba += laba;

    const row = sheet.addRow([
      idx + 1,
      formatDate(it.tanggal),
      it.kode_barang || '',
      it.nama_barang || '',
      it.MOD_kode || '-',
      Number(it.harga_beli_modal || 0),
      qty,
      omzet,
      modal,
      laba
    ]);
    row.height = 24;

    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };

      // Format khusus per kolom
      if (colNum === 1) { // No
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 2) { // Tanggal
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
      } else if (colNum === 3) { // Kode Barang
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF005CE6' } };
      } else if (colNum === 4) { // Nama Produk
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      } else if (colNum === 5) { // Kode MOD
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF3FF' } };
        cell.font = { name: 'Courier New', size: 10, bold: true, color: { argb: 'FF005CE6' } };
      } else if (colNum === 6) { // Modal Satuan
        cell.numFmt = '"Rp "#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF64748B' } };
      } else if (colNum === 7) { // Qty
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      } else if (colNum === 8) { // Omzet
        cell.numFmt = '"Rp "#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF005CE6' } };
      } else if (colNum === 9) { // Modal HPP
        cell.numFmt = '"Rp "#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF64748B' } };
      } else if (colNum === 10) { // Laba Kotor
        cell.numFmt = '"Rp "#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        const isProfit = laba >= 0;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isProfit ? 'FFECFDF5' : 'FFFEF2F2' } };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: isProfit ? 'FF059669' : 'FFDC2626' } };
      }
    });
  });

  // 5. Baris Total Keseluruhan
  const totalRow = sheet.addRow([
    'TOTAL KESELURUHAN',
    '',
    '',
    '',
    '',
    '',
    totalQty,
    totalOmzet,
    totalModal,
    totalLaba
  ]);
  const totalRowNum = totalRow.number;
  totalRow.height = 28;

  sheet.mergeCells(`A${totalRowNum}:F${totalRowNum}`);
  const totalLabelCell = sheet.getCell(`A${totalRowNum}`);
  totalLabelCell.value = 'TOTAL KESELURUHAN';
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };

  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF005CE6' } },
      bottom: { style: 'double', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };

    if (colNum === 7) { // Qty
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else if (colNum >= 8) { // Omzet, Modal, Laba
      cell.numFmt = '"Rp "#,##0';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      if (colNum === 8) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF60A5FA' } }; // Light blue
      } else if (colNum === 10) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: totalLaba >= 0 ? 'FF34D399' : 'FFF87171' } }; // Light green/red
      }
    }
  });

  // 6. Generate file buffer dan trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanPeriod = activePeriodLabel.value.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `Laporan_Laba_Rugi_Citra23_${cleanPeriod}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

onMounted(() => {
  fetchLaporan();
});
</script>
