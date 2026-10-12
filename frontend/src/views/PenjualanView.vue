<template>
  <AppLayout>
    <!-- Top Alert / Notice for Pegawai -->
    <div v-if="auth.isPegawai" class="card" style="margin-bottom: 20px; border-left: 4px solid var(--color-primary); background: #F8FAFC;">
      <div style="padding: 14px 20px; display: flex; align-items: center; gap: 12px;">
        <ShieldCheck :size="20" style="color: var(--color-primary);" />
        <div>
          <div style="font-weight: 700; font-size: 0.9rem;">Mode Kasir Pegawai</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Input transaksi penjualan baru dan pantau daftar penjualan Anda hari ini. Jika terjadi kesalahan input, hubungi Admin untuk pembatalan (void).
          </div>
        </div>
      </div>
    </div>

    <!-- Offline Notice Banner -->
    <div v-if="!isOnline" class="card" style="margin-bottom: 20px; border-left: 4px solid #F59E0B; background: #FFFBEB;">
      <div style="padding: 12px 18px; display: flex; align-items: center; gap: 12px;">
        <WifiOff :size="20" style="color: #D97706; flex-shrink: 0;" />
        <div>
          <div style="font-weight: 700; font-size: 0.9rem; color: #92400E;">Mode Offline Aktif</div>
          <div style="font-size: 0.8rem; color: #B45309;">
            Koneksi ke server terputus. Anda tetap dapat mencari barang dan menginput penjualan. Data tersimpan di memori perangkat dan otomatis disinkronkan ke server saat online kembali.
          </div>
        </div>
      </div>
    </div>

    <!-- 1. Form Input Penjualan Baru -->
    <div class="card overflow-visible" style="border: 2px solid var(--color-primary-border); position: relative; z-index: 30;">
      <div class="card-header" style="background: var(--color-primary-light);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <ShoppingCart :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title" style="color: var(--color-primary);">Input Transaksi Penjualan</h3>
        </div>
        <span class="badge badge-blue">Kasir Aktif: {{ auth.user?.nama }}</span>
      </div>

      <div class="card-body">
        <div v-if="successMsg" class="badge badge-success" style="display: block; margin-bottom: 16px; padding: 12px; font-size: 0.875rem;">
          {{ successMsg }}
        </div>
        <div v-if="errorMsg" class="badge badge-danger" style="display: block; margin-bottom: 16px; padding: 12px; font-size: 0.875rem;">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="submitSale">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <!-- Autocomplete Pencarian Barang -->
            <div class="form-group" style="position: relative;">
              <label class="form-label">Cari & Pilih Barang Listrik</label>
              <div class="search-input-box" style="position: relative;">
                <Search :size="16" class="icon" />
                <input
                  v-model="productSearch"
                  @input="searchItems"
                  type="text"
                  class="form-input"
                  placeholder="Ketik nama atau kode barang..."
                  autocomplete="off"
                />

                <!-- Dropdown Search Results -->
                <div v-if="searchResults.length > 0" class="autocomplete-dropdown">
                  <div
                    v-for="item in searchResults"
                    :key="item.id"
                    @click="selectItem(item)"
                    class="autocomplete-item"
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 700; color: var(--color-primary); font-size: 0.85rem;">
                        {{ item.kode_barang }}
                      </span>
                      <span class="badge" :class="item.stok_akhir > 5 ? 'badge-success' : 'badge-danger'">
                        Stok: {{ item.stok_akhir }}
                      </span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 600; margin-top: 2px;">{{ item.nama_barang }}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                      Harga: <strong>Rp {{ formatNumber(item.harga_jual) }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detail Barang Terpilih -->
            <div class="form-group" style="background: #F8FAFC; border: 1px solid var(--border-light); padding: 14px; border-radius: var(--radius-md);">
              <label class="form-label" style="color: var(--text-muted); margin-bottom: 4px;">Barang Terpilih:</label>
              <div v-if="selectedItem">
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">
                  {{ selectedItem.nama_barang }}
                </div>
                <div style="display: flex; gap: 12px; margin-top: 6px; font-size: 0.825rem;">
                  <span>Kode: <strong>{{ selectedItem.kode_barang }}</strong></span>
                  <span>Sisa Stok: <strong style="color: var(--color-primary);">{{ selectedItem.stok_akhir }} unit</strong></span>
                </div>
              </div>
              <div v-else style="color: var(--text-subtle); font-size: 0.85rem; padding-top: 6px;">
                Belum ada barang dipilih. Silakan cari pada kolom di sebelah kiri.
              </div>
            </div>
          </div>

          <!-- Baris Input Qty, Subtotal & Tanggal -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 14px;">
            <div class="form-group">
              <label class="form-label" for="sale_qty">Jumlah (Qty)</label>
              <input
                id="sale_qty"
                v-model.number="saleQty"
                type="number"
                class="form-input num"
                min="1"
                :max="selectedItem ? selectedItem.stok_akhir : 9999"
                required
                :disabled="!selectedItem"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Harga Satuan</label>
              <div class="form-input num" style="background: #F1F5F9; font-weight: 600;">
                Rp {{ formatNumber(selectedItem ? selectedItem.harga_jual : 0) }}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Subtotal Omzet</label>
              <div class="form-input num amount" style="background: var(--color-primary-light); color: var(--color-primary); font-weight: 800; font-size: 1.1rem;">
                Rp {{ formatNumber(calculatedOmzet) }}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="sale_date">Tanggal Transaksi</label>
              <input
                id="sale_date"
                v-model="saleDate"
                type="date"
                class="form-input"
                :disabled="auth.isPegawai"
                required
              />
              <p v-if="auth.isPegawai" class="form-help">Waktu server otomatis terkunci untuk pegawai.</p>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
            <button
              type="submit"
              class="btn btn-primary"
              style="padding: 12px 28px; font-size: 0.95rem;"
              :disabled="submitting || !selectedItem || saleQty <= 0 || saleQty > selectedItem?.stok_akhir"
            >
              <Check :size="18" />
              <span>{{ submitting ? 'Memproses Penjualan...' : 'Simpan Transaksi Penjualan' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. Navigasi Tab (Admin: Hari Ini, Riwayat, Grafik | Pegawai: Hari Ini Saja) -->
    <div style="margin-top: 32px;">
      <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--border-light); margin-bottom: 20px;">
        <button
          @click="activeTab = 'hari-ini'"
          class="tab-btn"
          :class="{ active: activeTab === 'hari-ini' }"
        >
          <Calendar :size="16" />
          <span>Penjualan Hari Ini ({{ todayList.length }})</span>
        </button>

        <template v-if="auth.isAdmin">
          <button
            @click="activeTab = 'riwayat'"
            class="tab-btn"
            :class="{ active: activeTab === 'riwayat' }"
          >
            <History :size="16" />
            <span>Riwayat Bulanan</span>
          </button>

          <button
            @click="activeTab = 'grafik'"
            class="tab-btn"
            :class="{ active: activeTab === 'grafik' }"
          >
            <LineChart :size="16" />
            <span>Grafik Analitik</span>
          </button>
        </template>
      </div>

      <!-- Tab 1: Penjualan Hari Ini -->
      <div v-if="activeTab === 'hari-ini'" class="card">
        <div class="card-header">
          <h3 class="card-title">Daftar Transaksi Hari Ini</h3>
          <div style="font-weight: 700; color: var(--color-primary); font-size: 1rem;">
            Total Omzet Hari Ini: Rp {{ formatNumber(todayTotalOmzet) }}
          </div>
        </div>

        <LoadingSpinner
          v-if="todayLoading"
          text="Memuat transaksi penjualan hari ini..."
          minHeight="180px"
        />

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Waktu</th>
                <th>Kode Barang</th>
                <th>Nama Produk</th>
                <th style="text-align: right;">Harga Jual</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Subtotal</th>
                <th>Kasir</th>
                <th>Status</th>
                <th v-if="auth.isAdmin" style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(tx, idx) in paginatedToday" :key="tx.id" :class="{ 'row-voided': tx.status === 'batal' }">
                <td>{{ (todayPage - 1) * todayPageSize + idx + 1 }}</td>
                <td style="font-size: 0.8rem; color: var(--text-muted);">
                  {{ formatTime(tx.created_at) }}
                </td>
                <td>
                  <span class="badge badge-blue">{{ tx.kode_barang }}</span>
                </td>
                <td style="font-weight: 600;">{{ tx.nama_barang }}</td>
                <td class="num" style="text-align: right;">
                  Rp {{ formatNumber(tx.harga_jual) }}
                </td>
                <td class="num" style="text-align: center; font-weight: 700;">
                  {{ tx.jumlah }}
                </td>
                <td class="num" style="text-align: right; font-weight: 700; color: var(--color-primary);">
                  Rp {{ formatNumber(tx.omzet_penjualan) }}
                </td>
                <td>
                  <span style="font-size: 0.8rem; font-weight: 600;">{{ tx.kasir_nama }}</span>
                </td>
                <td>
                  <span v-if="tx.is_offline" class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B;">
                    Offline (Antre Sinkron)
                  </span>
                  <span v-else class="badge" :class="tx.status === 'aktif' ? 'badge-success' : 'badge-danger'">
                    {{ tx.status === 'aktif' ? 'Aktif' : 'Batal' }}
                  </span>
                  <div v-if="tx.status === 'batal'" style="font-size: 0.75rem; color: var(--status-danger); margin-top: 2px;">
                    Alasan: {{ tx.void_reason }}
                  </div>
                </td>
                <td v-if="auth.isAdmin" style="text-align: right;">
                  <button
                    v-if="tx.status === 'aktif'"
                    @click="openVoidModal(tx)"
                    class="btn btn-sm btn-danger"
                    title="Batalkan Transaksi (Void)"
                  >
                    <Ban :size="14" />
                    <span>Void</span>
                  </button>
                  <span v-else style="font-size: 0.75rem; color: var(--text-subtle);">-</span>
                </td>
              </tr>
              <tr v-if="todayList.length === 0">
                <td :colspan="auth.isAdmin ? 10 : 9" style="text-align: center; padding: 24px; color: var(--text-muted);">
                  Belum ada transaksi penjualan hari ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Penjualan Hari Ini (5 Transaksi per Halaman) -->
        <div v-if="todayList.length > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan halaman <strong>{{ todayPage }}</strong> dari <strong>{{ todayTotalPages }}</strong> (Total <strong>{{ todayList.length }}</strong> transaksi &bull; 5 per halaman)
          </span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button
              @click="todayPage--"
              :disabled="todayPage <= 1"
              class="btn btn-sm btn-secondary"
              title="Halaman Sebelumnya"
            >
              Sebelumnya
            </button>
            
            <button
              v-for="p in displayedTodayPages"
              :key="p"
              @click="todayPage = p"
              class="btn btn-sm"
              :class="todayPage === p ? 'btn-primary' : 'btn-secondary'"
              style="min-width: 32px; padding: 4px 8px; font-weight: 700;"
            >
              {{ p }}
            </button>

            <button
              @click="todayPage++"
              :disabled="todayPage >= todayTotalPages"
              class="btn btn-sm btn-secondary"
              title="Halaman Selanjutnya"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Riwayat Bulanan (Admin Only) -->
      <div v-if="activeTab === 'riwayat' && auth.isAdmin" class="card">
        <div class="card-header">
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <select v-model="historyFilter.bulan" @change="onHistoryFilterChange" class="form-select" style="width: 140px;">
              <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
            </select>
            <select v-model="historyFilter.tahun" @change="onHistoryFilterChange" class="form-select" style="width: 110px;">
              <option v-for="y in [2024, 2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
          <div style="font-weight: 700; color: var(--color-primary);">
            Omzet Bulan Ini: Rp {{ formatNumber(historyData.total_omzet) }} ({{ historyData.total_transaksi_aktif }} transaksi)
          </div>
        </div>

        <LoadingSpinner
          v-if="historyLoading"
          text="Memuat riwayat transaksi penjualan..."
          minHeight="220px"
        />

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Kode</th>
                <th>Nama Produk</th>
                <th style="text-align: center; width: 90px;">MOD</th>
                <th style="text-align: right;">Harga Jual</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Omzet</th>
                <th>Status</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in paginatedHistory" :key="item.id" :class="{ 'row-voided': item.status === 'batal' }">
                <td>{{ (historyPage - 1) * historyPageSize + idx + 1 }}</td>
                <td style="font-size: 0.8rem;">{{ formatDate(item.tanggal) }}</td>
                <td><span class="badge badge-blue">{{ item.kode_barang }}</span></td>
                <td style="font-weight: 600;">{{ item.nama_barang }}</td>
                <td style="text-align: center;">
                  <span class="badge" style="background: #EBF3FF; color: #005CE6; font-family: monospace; font-weight: 800; font-size: 0.85rem;">
                    {{ item.harga_modal || '-' }}
                  </span>
                </td>
                <td class="num" style="text-align: right;">Rp {{ formatNumber(item.harga_jual) }}</td>
                <td class="num" style="text-align: center; font-weight: 700;">{{ item.jumlah }}</td>
                <td class="num" style="text-align: right; font-weight: 700; color: var(--color-primary);">
                  Rp {{ formatNumber(item.omzet_penjualan) }}
                </td>
                <td>
                  <span class="badge" :class="item.status === 'aktif' ? 'badge-success' : 'badge-danger'">
                    {{ item.status === 'aktif' ? 'Aktif' : 'Batal' }}
                  </span>
                  <div v-if="item.status === 'batal'" style="font-size: 0.75rem; color: var(--status-danger);">
                    Alasan: {{ item.void_reason }}
                  </div>
                </td>
                <td style="text-align: right;">
                  <button
                    v-if="item.status === 'aktif'"
                    @click="openVoidModal(item)"
                    class="btn btn-sm btn-danger"
                  >
                    Void
                  </button>
                  <span v-else style="font-size: 0.75rem; color: var(--text-subtle);">-</span>
                </td>
              </tr>
              <tr v-if="!historyData.data || historyData.data.length === 0">
                <td colspan="10" style="text-align: center; padding: 24px; color: var(--text-muted);">
                  Tidak ada data penjualan pada periode ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Riwayat Bulanan (5 Transaksi per Halaman) -->
        <div v-if="historyData.data && historyData.data.length > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan halaman <strong>{{ historyPage }}</strong> dari <strong>{{ historyTotalPages }}</strong> (Total <strong>{{ historyData.data.length }}</strong> transaksi &bull; 5 per halaman)
          </span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button
              @click="historyPage--"
              :disabled="historyPage <= 1"
              class="btn btn-sm btn-secondary"
              title="Halaman Sebelumnya"
            >
              Sebelumnya
            </button>
            
            <button
              v-for="p in displayedHistoryPages"
              :key="p"
              @click="historyPage = p"
              class="btn btn-sm"
              :class="historyPage === p ? 'btn-primary' : 'btn-secondary'"
              style="min-width: 32px; padding: 4px 8px; font-weight: 700;"
            >
              {{ p }}
            </button>

            <button
              @click="historyPage++"
              :disabled="historyPage >= historyTotalPages"
              class="btn btn-sm btn-secondary"
              title="Halaman Selanjutnya"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 3: Grafik Analitik (Admin Only) -->
      <div v-if="activeTab === 'grafik' && auth.isAdmin" class="card">
        <div class="card-header">
          <h3 class="card-title">Grafik Performa Penjualan</h3>
          <div style="display: flex; gap: 10px;">
            <select v-model="chartFilter.bulan" @change="fetchStats" class="form-select" style="width: 140px;">
              <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
            </select>
            <select v-model="chartFilter.tahun" @change="fetchStats" class="form-select" style="width: 110px;">
              <option v-for="y in [2024, 2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>

        <div class="card-body">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 28px;">
            <!-- Bar Chart Harian -->
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: var(--text-main);">
                Omzet Harian Bulan {{ monthNames[chartFilter.bulan - 1] }} {{ chartFilter.tahun }}
              </h4>
              <div v-if="chartDailyData.labels.length > 0" style="height: 280px;">
                <Bar :data="chartDailyData" :options="chartOptions" />
              </div>
              <div v-else style="height: 280px; display: flex; align-items: center; justify-content: center; background: #F8FAFC; border-radius: 8px; color: var(--text-muted);">
                Belum ada data grafik harian di bulan ini.
              </div>
            </div>

            <!-- Bar Chart 12 Bulan -->
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: var(--text-main);">
                Tren Omzet Bulanan Tahun {{ chartFilter.tahun }}
              </h4>
              <div v-if="chartMonthlyData.labels.length > 0" style="height: 280px;">
                <Line :data="chartMonthlyData" :options="chartOptions" />
              </div>
              <div v-else style="height: 280px; display: flex; align-items: center; justify-content: center; background: #F8FAFC; border-radius: 8px; color: var(--text-muted);">
                Belum ada data tahunan.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Void Transaksi (Admin Only, FR-JUAL-9 & FR-JUAL-10) -->
    <div v-if="showVoidModal" class="modal-backdrop" @click.self="closeVoidModal">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header" style="background: var(--status-danger-bg); border-bottom-color: var(--status-danger-border);">
          <h3 style="color: var(--status-danger); display: flex; align-items: center; gap: 8px;">
            <AlertTriangle :size="20" />
            <span>Konfirmasi Pembatalan (Void)</span>
          </h3>
          <button @click="closeVoidModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>
        <form @submit.prevent="submitVoid">
          <div class="modal-body">
            <div v-if="voidError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 8px;">
              {{ voidError }}
            </div>

            <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              <div style="font-size: 0.8rem; color: var(--text-muted);">Barang yang dibatalkan:</div>
              <div style="font-weight: 700; color: var(--text-main);">
                [{{ targetVoidTx?.kode_barang }}] {{ targetVoidTx?.nama_barang }}
              </div>
              <div style="font-size: 0.85rem; margin-top: 4px;">
                Jumlah: <strong>{{ targetVoidTx?.jumlah }} unit</strong> &bull; Total: <strong>Rp {{ formatNumber(targetVoidTx?.omzet_penjualan) }}</strong>
              </div>
            </div>

            <div style="font-size: 0.85rem; color: var(--status-danger); margin-bottom: 14px; line-height: 1.4;">
              <strong>Perhatian:</strong> Pembatalan (void) akan mengembalikan <strong>{{ targetVoidTx?.jumlah }} unit</strong> barang ke stok inventaris. Tindakan ini tidak dapat dibatalkan dan tercatat di audit log.
            </div>

            <div class="form-group">
              <label class="form-label" for="void_reason">Alasan Pembatalan (Wajib Diisi)</label>
              <textarea
                id="void_reason"
                v-model="voidReason"
                rows="3"
                class="form-textarea"
                placeholder="Contoh: Kesalahan input jumlah kasir, pelanggan membatalkan pesanan lampu"
                required
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeVoidModal" class="btn btn-secondary">Tutup</button>
            <button type="submit" class="btn btn-danger" :disabled="voiding || !voidReason.trim()">
              {{ voiding ? 'Membatalkan...' : 'Proses Void Penjualan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import { useAuthStore } from '../stores/auth';
import api from '../api';
import { db } from '../db/clientDb';
import { isOnline, queueOfflineAction, searchLocalBarang } from '../services/syncManager';
import {
  ShoppingCart,
  Search,
  Check,
  Calendar,
  History,
  LineChart,
  ShieldCheck,
  Ban,
  AlertTriangle,
  X,
  WifiOff
} from 'lucide-vue-next';

// Chart.js registration
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale
} from 'chart.js';
import { Bar, Line } from 'vue-chartjs';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale
);

const auth = useAuthStore();

const productSearch = ref('');
const searchResults = ref([]);
const selectedItem = ref(null);
const saleQty = ref(1);
const saleDate = ref(new Date().toISOString().split('T')[0]);
const submitting = ref(false);
const successMsg = ref('');
const errorMsg = ref('');

const activeTab = ref('hari-ini');
const todayList = ref([]);
const todayTotalOmzet = ref(0);
const todayLoading = ref(true);
const historyLoading = ref(false);

// Pagination Penjualan Hari Ini: 5 transaksi per halaman
const todayPage = ref(1);
const todayPageSize = 5;

const paginatedToday = computed(() => {
  const start = (todayPage.value - 1) * todayPageSize;
  return todayList.value.slice(start, start + todayPageSize);
});

const todayTotalPages = computed(() => {
  return Math.ceil(todayList.value.length / todayPageSize) || 1;
});

const displayedTodayPages = computed(() => {
  const total = todayTotalPages.value || 1;
  if (total <= 5) {
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(1, Math.min(todayPage.value, total - 4));
  const pages = [];
  for (let i = 0; i < 5; i++) {
    pages.push(start + i);
  }
  return pages;
});

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// History Bulanan State
const historyFilter = reactive({
  bulan: new Date().getMonth() + 1,
  tahun: new Date().getFullYear()
});
const historyData = ref({ data: [], total_omzet: 0, total_transaksi_aktif: 0 });

// Pagination Riwayat Bulanan: 5 transaksi per halaman
const historyPage = ref(1);
const historyPageSize = 5;

const paginatedHistory = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize;
  return (historyData.value.data || []).slice(start, start + historyPageSize);
});

const historyTotalPages = computed(() => {
  return Math.ceil((historyData.value.data?.length || 0) / historyPageSize) || 1;
});

const displayedHistoryPages = computed(() => {
  const total = historyTotalPages.value || 1;
  if (total <= 5) {
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(1, Math.min(historyPage.value, total - 4));
  const pages = [];
  for (let i = 0; i < 5; i++) {
    pages.push(start + i);
  }
  return pages;
});

const onHistoryFilterChange = () => {
  historyPage.value = 1;
  fetchHistory();
};

// Chart State
const chartFilter = reactive({
  bulan: new Date().getMonth() + 1,
  tahun: new Date().getFullYear()
});
const chartDailyData = ref({ labels: [], datasets: [] });
const chartMonthlyData = ref({ labels: [], datasets: [] });

// Void State
const showVoidModal = ref(false);
const targetVoidTx = ref(null);
const voidReason = ref('');
const voidError = ref('');
const voiding = ref(false);

const calculatedOmzet = computed(() => {
  if (!selectedItem.value) return 0;
  return (selectedItem.value.harga_jual || 0) * (saleQty.value || 0);
});

let lookupTimeout = null;
const searchItems = () => {
  clearTimeout(lookupTimeout);
  if (!productSearch.value.trim()) {
    searchResults.value = [];
    return;
  }
  lookupTimeout = setTimeout(async () => {
    if (!isOnline.value) {
      // Pencarian offline dari database lokal Dexie
      searchResults.value = await searchLocalBarang(productSearch.value);
      return;
    }
    try {
      const res = await api.get('/barang/lookup', {
        params: { search: productSearch.value }
      });
      searchResults.value = res.data.data;
    } catch (err) {
      console.warn('Pencarian server gagal, fallback ke database lokal:', err);
      searchResults.value = await searchLocalBarang(productSearch.value);
    }
  }, 250);
};

const selectItem = (item) => {
  selectedItem.value = item;
  productSearch.value = `[${item.kode_barang}] ${item.nama_barang}`;
  searchResults.value = [];
  saleQty.value = 1;
};

const submitSale = async () => {
  if (!selectedItem.value) return;
  submitting.value = true;
  successMsg.value = '';
  errorMsg.value = '';

  // 1. JIKA OFFLINE: Simpan langsung ke Client DB & antrean sinkronisasi
  if (!isOnline.value) {
    try {
      const payload = {
        barang_id: selectedItem.value.id,
        jumlah: saleQty.value,
        tanggal: saleDate.value
      };

      // Tambahkan ke antrean sinkronisasi
      await queueOfflineAction(
        '/penjualan',
        'POST',
        payload,
        `Penjualan [${selectedItem.value.nama_barang}] x${saleQty.value}`
      );

      // Kurangi stok lokal di IndexedDB secara langsung agar kalkulasi stok offline akurat
      const localItem = await db.barang.get(selectedItem.value.id);
      let newStok = Math.max(0, (selectedItem.value.stok_akhir || 0) - saleQty.value);
      if (localItem) {
        newStok = Math.max(0, (localItem.stok_akhir || 0) - saleQty.value);
        await db.barang.update(localItem.id, { stok_akhir: newStok });
      }

      // Catat ke daftar offline sales di IndexedDB
      const offlineTx = {
        id: 'offline_' + Date.now(),
        client_tx_id: 'ctx_' + Date.now(),
        barang_id: selectedItem.value.id,
        kode_barang: selectedItem.value.kode_barang,
        nama_barang: selectedItem.value.nama_barang,
        jumlah: saleQty.value,
        harga_jual: selectedItem.value.harga_jual || 0,
        omzet_penjualan: (selectedItem.value.harga_jual || 0) * saleQty.value,
        kasir_nama: auth.user?.nama || 'Kasir',
        tanggal: saleDate.value,
        status: 'aktif',
        created_at: new Date().toISOString(),
        is_offline: true
      };
      await db.offline_sales.add(offlineTx);

      // Masukkan ke tampilan tabel hari ini
      todayList.value.unshift(offlineTx);
      todayTotalOmzet.value += offlineTx.omzet_penjualan;

      successMsg.value = `[MODE OFFLINE] Transaksi [${selectedItem.value.nama_barang}] sejumlah ${saleQty.value} unit berhasil dicatat di perangkat! Sisa stok lokal: ${newStok} unit. Data akan otomatis disinkronkan ke server saat online.`;

      // Reset form input
      productSearch.value = '';
      selectedItem.value = null;
      saleQty.value = 1;
    } catch (err) {
      console.error('Offline sale recording failed:', err);
      errorMsg.value = 'Gagal menyimpan transaksi ke database lokal perangkat.';
    } finally {
      submitting.value = false;
    }
    return;
  }

  // 2. JIKA ONLINE: Kirim langsung ke Server API
  try {
    const res = await api.post('/penjualan', {
      barang_id: selectedItem.value.id,
      jumlah: saleQty.value,
      tanggal: saleDate.value
    });

    successMsg.value = `Berhasil! Transaksi [${selectedItem.value.nama_barang}] sejumlah ${saleQty.value} unit tercatat. Sisa stok: ${res.data.data.sisa_stok} unit.`;
    
    // Perbarui stok di database lokal juga jika ada
    try {
      const localItem = await db.barang.get(selectedItem.value.id);
      if (localItem) {
        await db.barang.update(localItem.id, { stok_akhir: res.data.data.sisa_stok });
      }
    } catch (e) {}

    // Reset form
    productSearch.value = '';
    selectedItem.value = null;
    saleQty.value = 1;

    todayPage.value = 1;
    fetchTodaySales();
    if (auth.isAdmin) {
      historyPage.value = 1;
      fetchHistory();
      fetchStats();
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Gagal menyimpan transaksi.';
  } finally {
    submitting.value = false;
  }
};

const fetchTodaySales = async () => {
  todayLoading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 400));
  
  // Jika offline, baca dari offline_sales lokal
  if (!isOnline.value) {
    try {
      const offlineList = await db.offline_sales.toArray();
      todayList.value = (offlineList || []).reverse();
      todayTotalOmzet.value = (offlineList || []).reduce((acc, curr) => acc + (curr.omzet_penjualan || 0), 0);
    } catch (e) {
      console.error('Failed to load local offline sales:', e);
    } finally {
      todayLoading.value = false;
    }
    return;
  }

  try {
    const [res] = await Promise.all([
      api.get('/penjualan/hari-ini'),
      minDelay
    ]);
    
    // Gabungkan dengan transaksi offline yang masih tersimpan di lokal (jika ada)
    const offlineList = await db.offline_sales.toArray();
    const serverSales = res.data.data || [];
    const combined = [...(offlineList || []).filter(o => !serverSales.some(s => s.id === o.id)), ...serverSales];

    todayList.value = combined;
    todayTotalOmzet.value = (res.data.total_omzet || 0) + (offlineList || []).reduce((acc, curr) => acc + (curr.omzet_penjualan || 0), 0);
    if (todayPage.value > todayTotalPages.value) {
      todayPage.value = Math.max(1, todayTotalPages.value);
    }
  } catch (err) {
    console.warn('Gagal memuat penjualan hari ini dari server, membaca dari lokal:', err);
    try {
      const offlineList = await db.offline_sales.toArray();
      todayList.value = (offlineList || []).reverse();
      todayTotalOmzet.value = (offlineList || []).reduce((acc, curr) => acc + (curr.omzet_penjualan || 0), 0);
    } catch (e) {}
  } finally {
    todayLoading.value = false;
  }
};

const fetchHistory = async () => {
  if (!auth.isAdmin) return;
  historyLoading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 400));
  try {
    const [res] = await Promise.all([
      api.get('/penjualan/history', {
        params: { bulan: historyFilter.bulan, tahun: historyFilter.tahun }
      }),
      minDelay
    ]);
    historyData.value = res.data;
    if (historyPage.value > historyTotalPages.value) {
      historyPage.value = Math.max(1, historyTotalPages.value);
    }
  } catch (err) {
    console.error('Failed to load history:', err);
  } finally {
    historyLoading.value = false;
  }
};

const fetchStats = async () => {
  if (!auth.isAdmin) return;
  try {
    const res = await api.get('/penjualan/stats', {
      params: { bulan: chartFilter.bulan, tahun: chartFilter.tahun }
    });

    const harian = res.data.harian || [];
    chartDailyData.value = {
      labels: harian.map(h => `Tgl ${h.hari}`),
      datasets: [
        {
          label: 'Omzet Harian (Rp)',
          backgroundColor: '#005CE6',
          borderRadius: 4,
          data: harian.map(h => Number(h.omzet))
        }
      ]
    };

    const bulanan = res.data.bulanan || [];
    const monthlyMap = {};
    bulanan.forEach(b => { monthlyMap[b.bulan] = Number(b.omzet); });

    chartMonthlyData.value = {
      labels: monthNames,
      datasets: [
        {
          label: 'Omzet Bulanan (Rp)',
          borderColor: '#005CE6',
          backgroundColor: 'rgba(0, 92, 230, 0.1)',
          fill: true,
          tension: 0.3,
          data: monthNames.map((_, idx) => monthlyMap[idx + 1] || 0)
        }
      ]
    };
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (val) => 'Rp ' + Number(val).toLocaleString('id-ID')
      }
    }
  }
};

// Void Modal Functions
const openVoidModal = (tx) => {
  targetVoidTx.value = tx;
  voidReason.value = '';
  voidError.value = '';
  showVoidModal.value = true;
};

const closeVoidModal = () => {
  showVoidModal.value = false;
};

const submitVoid = async () => {
  if (!targetVoidTx.value || !voidReason.value.trim()) return;
  voiding.value = true;
  voidError.value = '';

  try {
    await api.post(`/penjualan/${targetVoidTx.value.id}/void`, {
      void_reason: voidReason.value.trim()
    });
    closeVoidModal();
    fetchTodaySales();
    fetchHistory();
    fetchStats();
  } catch (err) {
    voidError.value = err.response?.data?.error || 'Gagal membatalkan transaksi.';
  } finally {
    voiding.value = false;
  }
};

const formatNumber = (num) => Number(num || 0).toLocaleString('id-ID');
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  const d = new Date(timeStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const handleSyncComplete = () => {
  fetchTodaySales();
  if (auth.isAdmin) {
    fetchHistory();
    fetchStats();
  }
};

onMounted(() => {
  fetchTodaySales();
  if (auth.isAdmin) {
    fetchHistory();
    fetchStats();
  }
  window.addEventListener('sync-complete', handleSyncComplete);
});

onUnmounted(() => {
  window.removeEventListener('sync-complete', handleSyncComplete);
});
</script>

<style scoped>
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
  max-height: 280px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 3px;
  padding-bottom: 4px;
}

.autocomplete-dropdown::-webkit-scrollbar {
  width: 6px;
}

.autocomplete-dropdown::-webkit-scrollbar-track {
  background: #F1F5F9;
  border-radius: 4px;
}

.autocomplete-dropdown::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

.autocomplete-dropdown::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

.autocomplete-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.autocomplete-item:hover {
  background-color: var(--color-primary-light);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-family: inherit;
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
</style>
