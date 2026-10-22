<template>
  <AppLayout>
    <!-- Offline Notice Banner -->
    <div v-if="!isOnline" class="card" style="margin-bottom: 20px; border-left: 4px solid #F59E0B; background: #FFFBEB;">
      <div style="padding: 12px 18px; display: flex; align-items: center; gap: 12px;">
        <WifiOff :size="20" style="color: #D97706; flex-shrink: 0;" />
        <div>
          <div style="font-weight: 700; font-size: 0.9rem; color: #92400E;">Mode Offline Aktif</div>
          <div style="font-size: 0.8rem; color: #B45309;">
            Koneksi ke server terputus. Anda tetap dapat mencari barang dan mencatat restock/pembelian. Data akan disimpan di perangkat dan otomatis disinkronkan ke server saat online.
          </div>
        </div>
      </div>
    </div>

    <!-- Form Input Pembelian -->
    <div class="card overflow-visible">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Truck :size="20" style="color: var(--color-primary);" />
          <div>
            <h3 class="card-title">Input Pembelian Barang &amp; Pembaruan MOD</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
              Pilih barang dan kode MOD dari Master MOD untuk update stok &amp; harga modal otomatis.
            </p>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div v-if="successMsg" class="badge badge-success" style="display: block; margin-bottom: 16px; padding: 12px;">
          {{ successMsg }}
        </div>
        <div v-if="errorMsg" class="badge badge-danger" style="display: block; margin-bottom: 16px; padding: 12px;">
          {{ errorMsg }}
        </div>

        <!-- Barcode Scanner Pasokan Bar -->
        <div style="background: #F8FAFC; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
            <label class="form-label" for="pembelian_barcode_input" style="margin-bottom: 0; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--color-primary);">
              <Barcode :size="18" class="barcode-icon-desktop" />
              <span>Scan Barcode Pasokan (Alat Scan / Kamera)</span>
            </label>
            <button
              type="button"
              @click="toggleCameraScanner"
              class="btn btn-sm"
              :style="isScannerActive ? 'background: #EF4444; color: #FFF; border: none;' : 'background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE;'"
              style="padding: 5px 12px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border-radius: 6px;"
            >
              <Camera :size="14" />
              <span>{{ isScannerActive ? 'Tutup Kamera' : 'Scan via Kamera HP/ Alat Scan' }}</span>
            </button>
          </div>

          <!-- Viewfinder jika scanner kamera aktif -->
          <div v-if="isScannerActive" style="margin: 10px 0; padding: 10px; background: #0F172A; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.75rem; color: #94A3B8; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <ScanLine :size="14" style="color: #38BDF8;" />
              Arahkan barcode pasokan ke kamera
            </div>
            <div id="pembelian-barcode-viewfinder" style="width: 100%; max-width: 380px; margin: 0 auto; border-radius: 6px; overflow: hidden; background: #000; min-height: 200px;"></div>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <div style="position: relative; flex: 1;">
              <input
                id="pembelian_barcode_input"
                ref="barcodeInputRef"
                v-model="barcodeScanInput"
                @keydown.enter.prevent="handleBarcodeSubmit"
                type="text"
                class="form-input"
                placeholder="Arahkan alat scan atau ketik barcode lalu tekan Enter..."
                style="font-family: monospace; font-size: 0.95rem; letter-spacing: 0.05em; padding-right: 32px;"
              />
              <button
                v-if="barcodeScanInput"
                type="button"
                @click="clearBarcodeInput"
                style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94A3B8; padding: 2px;"
                title="Hapus input barcode"
              >
                <X :size="14" />
              </button>
            </div>
            <button
              type="button"
              @click="handleBarcodeSubmit"
              class="btn btn-primary"
              style="padding: 9px 18px; font-size: 0.85rem; white-space: nowrap;"
              :disabled="barcodeSearching || !barcodeScanInput.trim()"
            >
              {{ barcodeSearching ? 'Mencari...' : 'Pilih Barang' }}
            </button>
          </div>

          <!-- Alert Hasil Scan Barcode -->
          <div v-if="barcodeSearching" style="font-size: 0.8rem; color: #64748B; margin-top: 6px;">
            Memeriksa barcode barang...
          </div>
          <div
            v-else-if="barcodeAlertSuccess"
            style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 8px 12px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; color: #065F46; font-size: 0.85rem; font-weight: 600;"
          >
            <div style="display: flex; align-items: center; gap: 6px;">
              <CheckCircle2 :size="16" style="color: #059669;" />
              <span>{{ barcodeAlertSuccess }}</span>
            </div>
            <button type="button" @click="barcodeAlertSuccess = ''" style="background: none; border: none; cursor: pointer; color: #059669; font-size: 0.85rem; padding: 0 4px;">
              ✕
            </button>
          </div>
          <div
            v-else-if="barcodeAlertWarning"
            style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 8px 12px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; color: #991B1B; font-size: 0.85rem; font-weight: 600;"
          >
            <div style="display: flex; align-items: center; gap: 6px;">
              <AlertTriangle :size="16" style="color: #DC2626;" />
              <span>{{ barcodeAlertWarning }}</span>
            </div>
            <button type="button" @click="barcodeAlertWarning = ''" style="background: none; border: none; cursor: pointer; color: #DC2626; font-size: 0.85rem; padding: 0 4px;">
              ✕
            </button>
          </div>
        </div>

        <form @submit.prevent="submitPembelian">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <!-- Autocomplete Barang -->
            <div class="form-group" style="position: relative;">
              <label class="form-label">Cari &amp; Pilih Barang</label>
              <div class="search-input-box" style="position: relative;">
                <Search :size="16" class="icon" />
                <input
                  v-model="searchQuery"
                  @input="searchItems"
                  type="text"
                  class="form-input"
                  placeholder="Ketik kode atau nama barang..."
                  autocomplete="off"
                  style="padding-right: 32px;"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  @click="clearSelection"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; padding: 2px;"
                  title="Hapus / Reset Pilihan"
                >
                  <X :size="16" />
                </button>

                <!-- Search dropdown berada pas di bawah input box -->
                <div v-if="searchResults.length > 0" class="autocomplete-dropdown">
                  <div
                    v-for="item in searchResults"
                    :key="item.id"
                    @mousedown.prevent="selectItem(item)"
                    @click="selectItem(item)"
                    class="autocomplete-item"
                  >
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-weight: 700; color: var(--color-primary);">{{ item.kode_barang }}</span>
                      <span class="badge badge-blue">Stok: {{ item.stok_akhir }}</span>
                    </div>
                    <div style="font-weight: 600; font-size: 0.85rem; margin-top: 2px;">
                      {{ item.nama_barang }}
                      <span v-if="item.merk" class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.72rem; margin-left: 6px; padding: 2px 6px;">
                        {{ item.merk }}
                      </span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                      MOD Sekarang: <strong style="font-family: monospace; color: var(--color-primary);">{{ item.MOD || '-' }}</strong>
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
                <div style="display: flex; gap: 14px; margin-top: 6px; font-size: 0.825rem;">
                  <span>Kode: <strong>{{ selectedItem.kode_barang }}</strong></span>
                  <span>MOD Lama: <strong style="font-family: monospace; color: var(--color-primary); font-size: 0.95rem;">{{ selectedItem.MOD || '-' }}</strong></span>
                </div>
              </div>
              <div v-else style="color: var(--text-subtle); font-size: 0.85rem; padding-top: 6px;">
                Belum ada barang dipilih. Silakan cari pada kolom di sebelah kiri.
              </div>
            </div>
          </div>

          <!-- Format Kolom: HARGA LAMA & HARGA BELI (AUTO-GENERATE MOD) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 14px;">
            <div class="form-group">
              <label class="form-label" style="color: #475569; font-weight: 700;">HARGA LAMA (MOD)</label>
              <div class="form-input" style="background: #F1F5F9; font-family: monospace; font-weight: 800; font-size: 1.05rem; text-align: center; color: var(--color-primary); display: flex; align-items: center; justify-content: center; height: 42px;">
                {{ selectedItem ? (selectedItem.MOD || '-') : '-' }}
              </div>
              <p class="form-help">Kode MOD satuan sebelumnya.</p>
            </div>

            <!-- Input Harga Beli Modal Satuan (Rp) -->
            <div class="form-group">
              <label class="form-label" for="harga_beli_satuan" style="font-weight: 700;">
                HARGA BELI MODAL (RP) <span style="color: red;">*</span>
              </label>
              <input
                id="harga_beli_satuan"
                v-model.number="form.harga_beli"
                type="number"
                min="0"
                step="100"
                class="form-input num"
                placeholder="Contoh: 54000 atau 20000"
                required
                :disabled="!selectedItem"
              />
              <p class="form-help">
                <span v-if="form.harga_beli > 0" style="color: #059669; font-weight: 600;">
                  Terbaca: Rp {{ formatNumber(form.harga_beli) }}
                </span>
                <span v-else>Harga kulakan/beli asli dari supplier.</span>
              </p>
            </div>

            <!-- Kode MOD Ter-Generate Otomatis -->
            <div class="form-group">
              <label class="form-label" style="color: #475569; font-weight: 700;">
                MOD BARU (AUTO-GENERATE)
              </label>
              <div class="form-input" style="background: #EEF2FF; border: 1px solid #C7D2FE; font-family: monospace; font-weight: 800; font-size: 1.15rem; text-align: center; color: #4F46E5; display: flex; align-items: center; justify-content: center; height: 42px;">
                {{ generatedMod || '-' }}
              </div>
              <p class="form-help">
                <span v-if="generatedMod" style="color: #4F46E5; font-weight: 600;">
                  ✨ Rumus MOD otomatis.
                </span>
                <span v-else>Otomatis muncul dari harga beli.</span>
              </p>
            </div>

            <div class="form-group">
              <label class="form-label" for="jumlah_masuk" style="font-weight: 700;">JUMLAH MASUK (UNIT) <span style="color: red;">*</span></label>
              <input
                id="jumlah_masuk"
                v-model.number="form.jumlah_masuk"
                type="number"
                class="form-input num"
                min="1"
                required
                :disabled="!selectedItem"
              />
              <p class="form-help">
                <span v-if="form.harga_beli > 0 && form.jumlah_masuk > 0" style="color: #059669; font-weight: 700;">
                  Total: Rp {{ formatNumber(form.harga_beli * form.jumlah_masuk) }}
                </span>
                <span v-else>Jumlah barang masuk.</span>
              </p>
            </div>

            <div class="form-group">
              <label class="form-label" for="tgl_beli" style="font-weight: 700;">TANGGAL PEMBELIAN</label>
              <input
                id="tgl_beli"
                v-model="form.tanggal"
                type="date"
                class="form-input"
                required
              />
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div v-if="form.harga_beli > 0 && form.jumlah_masuk > 0" style="font-size: 0.95rem; color: #0F172A;">
              Total Pembayaran Pasokan: <strong style="color: var(--color-primary); font-size: 1.15rem;">Rp {{ formatNumber(form.harga_beli * form.jumlah_masuk) }}</strong>
            </div>
            <div v-else></div>

            <button
              type="submit"
              class="btn btn-primary"
              style="padding: 12px 28px; font-size: 0.95rem;"
              :disabled="saving || !selectedItem || !form.harga_beli || form.harga_beli <= 0 || form.jumlah_masuk <= 0"
            >
              <Check :size="18" />
              <span>{{ saving ? 'Menyimpan...' : 'Simpan Pembelian & Update MOD' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Riwayat Pembelian dengan Filter Tahunan & Pagination 5 Transaksi per Halaman -->
    <div class="card" style="margin-top: 32px;">
      <div class="card-header" style="display: flex; flex-direction: column; gap: 14px; align-items: stretch;">
        <!-- Baris Atas: Judul dan Total Pasokan -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <h3 class="card-title" style="margin: 0;">Tabel Riwayat Pembelian &amp; Perubahan MOD</h3>
          <div style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem;">
            Total Pasokan: {{ historyData.total_qty }} unit ({{ historyData.total_transaksi }} transaksi)
          </div>
        </div>
        
        <!-- Baris Bawah (Di Bawah Judul): Filter Bulan & Tahun Berjajar Ke Samping -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <select v-model="filter.bulan" @change="onFilterChange" class="form-select" style="width: auto; min-width: 185px; max-width: 230px; height: 38px; font-size: 0.85rem; padding: 6px 12px;">
            <option value="all">📅 Semua Bulan (1 Tahun Penuh)</option>
            <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
          </select>

          <select v-model="filter.tahun" @change="onFilterChange" class="form-select" style="width: 105px; height: 38px; font-size: 0.85rem; padding: 6px 10px;">
            <option v-for="y in [2024, 2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>

      <LoadingSpinner
        v-if="historyLoading"
        text="Memuat riwayat pembelian &amp; pasokan..."
        minHeight="200px"
      />

      <div v-else class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th>Tanggal</th>
              <th>Kode Barang</th>
              <th>Nama Produk</th>
              <!-- Kolom persis seperti di foto 2 -->
              <th style="text-align: center; width: 140px; background: #EEF4FF; color: var(--color-primary); font-weight: 800;">
                HARGA LAMA
              </th>
              <th style="text-align: center; width: 190px; background: #EEF4FF; color: var(--color-primary); font-weight: 800;">
                HARGA BARU MODAL SATUAN
              </th>
              <th style="text-align: center;">Jumlah Masuk</th>
              <th style="text-align: right;">Total Biaya (Rp)</th>
              <th>Dicatat Oleh</th>
              <th style="text-align: center; width: 100px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in paginatedHistory" :key="row.id">
              <td>{{ (historyPage - 1) * historyPageSize + idx + 1 }}</td>
              <td style="font-size: 0.8rem;">{{ formatDate(row.tanggal) }}</td>
              <td><span class="badge badge-blue">{{ row.kode_barang }}</span></td>
              <td style="font-weight: 600;">{{ row.nama_barang }}</td>
              <!-- Nilai Harga Lama (Kode Huruf MOD) -->
              <td style="text-align: center;">
                <span class="badge" style="background: #F1F5F9; color: #475569; font-family: monospace; font-weight: 800; font-size: 0.95rem; padding: 4px 10px;">
                  {{ row.harga_lama || '-' }}
                </span>
              </td>
              <!-- Nilai Harga Baru Modal Satuan (Kode Huruf MOD) -->
              <td style="text-align: center;">
                <span
                  class="badge"
                  :style="(row.harga_baru_modal_satuan && row.harga_baru_modal_satuan.trim() && row.harga_baru_modal_satuan !== '-') ? 'background: #EBF3FF; color: #005CE6; font-family: monospace; font-weight: 800; font-size: 0.95rem; padding: 4px 12px; border: 1px solid var(--color-primary-border);' : 'background: #F1F5F9; color: #475569; font-family: monospace; font-weight: 800; font-size: 0.95rem; padding: 4px 10px;'"
                >
                  {{ (row.harga_baru_modal_satuan && row.harga_baru_modal_satuan.trim()) ? row.harga_baru_modal_satuan : '-' }}
                </span>
              </td>
              <td class="num" style="text-align: center; font-weight: 700; color: var(--status-success);">
                +{{ row.jumlah_masuk }} unit
              </td>
              <td class="num" style="text-align: right; font-weight: 700; color: #0F172A;">
                Rp {{ formatNumber(row.total_pembayaran) }}
              </td>
              <td style="font-size: 0.8rem; color: var(--text-muted);">
                {{ row.created_by_nama || 'Admin' }}
              </td>
              <td style="text-align: center;">
                <div style="display: inline-flex; gap: 6px;">
                  <button
                    type="button"
                    @click="openEditModal(row)"
                    class="btn btn-sm btn-secondary"
                    style="padding: 4px 8px;"
                    title="Koreksi Jumlah Masuk"
                  >
                    <Edit2 :size="14" />
                  </button>
                  <button
                    type="button"
                    @click="confirmDeletePembelian(row)"
                    class="btn btn-sm btn-danger"
                    style="padding: 4px 8px;"
                    title="Batalkan / Hapus Transaksi"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!historyData.data || historyData.data.length === 0">
              <td colspan="10" style="text-align: center; padding: 24px; color: var(--text-muted);">
                Belum ada transaksi pembelian pada periode terpilih.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Riwayat Pembelian (5 Transaksi per Halaman) -->
      <div v-if="historyData.data && historyData.data.length > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          Menampilkan halaman <strong>{{ historyPage }}</strong> dari <strong>{{ historyTotalPages }}</strong> (Total <strong>{{ historyData.total_transaksi }}</strong> transaksi &bull; 5 per halaman)
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

    <!-- Modal Edit Pembelian -->
    <div v-if="showEditModal" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal-content" style="max-width: 480px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <Edit2 :size="20" style="color: var(--color-primary);" />
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Koreksi Transaksi Pembelian</h3>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" style="padding: 4px 8px;" @click="closeEditModal">
            <X :size="16" />
          </button>
        </div>

        <form @submit.prevent="submitEditPembelian">
          <div class="modal-body" style="padding: 20px;">
            <div style="background: #F8FAFC; border: 1px solid var(--border-light); padding: 12px 14px; border-radius: 8px; margin-bottom: 16px;">
              <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">{{ editingRow?.nama_barang }}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                Kode: <span class="badge badge-blue">{{ editingRow?.kode_barang }}</span>
                &bull; MOD Satuan: <strong style="font-family: monospace;">{{ editingRow?.harga_baru_modal_satuan || '-' }}</strong>
              </div>
            </div>

            <div v-if="editModalError" class="alert alert-danger" style="margin-bottom: 14px; font-size: 0.85rem; padding: 10px 14px; border-radius: 6px; background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA;">
              {{ editModalError }}
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-weight: 700;">Jumlah Masuk (Unit) <span style="color: red;">*</span></label>
              <input
                v-model.number="editForm.jumlah_masuk"
                type="number"
                min="1"
                class="form-input num"
                placeholder="Masukkan jumlah yang benar"
                required
              />
              <p class="form-help" style="margin-top: 4px; font-size: 0.775rem; color: var(--text-muted);">
                Sisa stok barang di tabel barang akan otomatis disesuaikan selisihnya.
              </p>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-weight: 700;">Tanggal Pembelian</label>
              <input
                v-model="editForm.tanggal"
                type="date"
                class="form-input"
                required
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeEditModal" class="btn btn-secondary" :disabled="editSaving">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="editSaving">
              <span v-if="editSaving">Menyimpan...</span>
              <span v-else>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus / Batal Pembelian -->
    <div v-if="deletingRow" class="modal-backdrop" @click.self="deletingRow = null">
      <div class="modal-content" style="max-width: 460px;">
        <div class="modal-header" style="background: var(--status-danger-bg); border-bottom-color: var(--status-danger-border);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <AlertTriangle :size="20" style="color: #DC2626;" />
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #DC2626;">Batalkan Pembelian?</h3>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" style="padding: 4px 8px;" @click="deletingRow = null">
            <X :size="16" />
          </button>
        </div>

        <div class="modal-body" style="padding: 20px;">
          <p style="margin-top: 0; margin-bottom: 14px; font-size: 0.9rem; line-height: 1.5; color: #334155;">
            Apakah Anda yakin ingin membatalkan transaksi pembelian untuk produk ini?
          </p>
          <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 12px 14px; border-radius: 8px; margin-bottom: 14px;">
            <div style="font-weight: 700; color: #991B1B; font-size: 0.95rem;">{{ deletingRow.nama_barang }}</div>
            <div style="font-size: 0.85rem; color: #7F1D1D; margin-top: 4px;">
              Jumlah masuk: <strong>{{ deletingRow.jumlah_masuk }} unit</strong> &bull; Total: <strong>Rp {{ formatNumber(deletingRow.total_pembayaran) }}</strong>
            </div>
          </div>
          <p style="margin-bottom: 0; font-size: 0.85rem; color: #DC2626; font-weight: 600; line-height: 1.4;">
            ⚠️ Stok barang akan otomatis dikurangi kembali sebanyak {{ deletingRow.jumlah_masuk }} unit.
          </p>
          <div v-if="deleteError" class="alert alert-danger" style="margin-top: 12px; font-size: 0.85rem; padding: 10px 14px; border-radius: 6px; background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA;">
            {{ deleteError }}
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="deletingRow = null" class="btn btn-secondary" :disabled="deleteLoading">Batal</button>
          <button type="button" @click="executeDeletePembelian" class="btn btn-danger" :disabled="deleteLoading">
            <span v-if="deleteLoading">Membatalkan...</span>
            <span v-else>Ya, Batalkan &amp; Kurangi Stok</span>
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
import { db } from '../db/clientDb';
import { isOnline, queueOfflineAction, searchLocalBarang, findLocalBarangByBarcode } from '../services/syncManager';
import { hargaToMod, modToHarga } from '../utils/modHelper';
import {
  Truck,
  Search,
  Check,
  X,
  WifiOff,
  Barcode,
  Camera,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2
} from 'lucide-vue-next';

const route = useRoute();

const searchQuery = ref('');
const searchResults = ref([]);
const selectedItem = ref(null);
const saving = ref(false);
const historyLoading = ref(true);
const successMsg = ref('');
const errorMsg = ref('');

const barcodeScanInput = ref('');
const barcodeInputRef = ref(null);
const isScannerActive = ref(false);
const barcodeSearching = ref(false);
const barcodeAlertWarning = ref('');
const barcodeAlertSuccess = ref('');
let html5QrScannerInstance = null;
let isScanningBusy = false;

const form = reactive({
  harga_beli: 0,
  jumlah_masuk: 1,
  tanggal: new Date().toISOString().split('T')[0]
});

const generatedMod = computed(() => {
  return hargaToMod(form.harga_beli);
});

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const filter = reactive({
  bulan: new Date().getMonth() + 1,
  tahun: new Date().getFullYear()
});

const historyData = ref({ data: [], total_qty: 0, total_transaksi: 0 });

// Pagination Riwayat Pembelian: 5 transaksi per halaman
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

const onFilterChange = () => {
  historyPage.value = 1;
  fetchHistory();
};

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

let searchTimeout = null;
const searchItems = () => {
  clearTimeout(searchTimeout);
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  searchTimeout = setTimeout(async () => {
    if (!isOnline.value) {
      searchResults.value = await searchLocalBarang(searchQuery.value);
      return;
    }
    try {
      const res = await api.get('/barang', {
        params: { search: searchQuery.value, limit: 10 }
      });
      searchResults.value = res.data.data;
    } catch (err) {
      console.warn('Search server gagal, fallback ke database lokal:', err);
      searchResults.value = await searchLocalBarang(searchQuery.value);
    }
  }, 250);
};

const playScanBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
};

const clearBarcodeInput = () => {
  barcodeScanInput.value = '';
  barcodeAlertWarning.value = '';
  barcodeAlertSuccess.value = '';
  if (barcodeInputRef.value) barcodeInputRef.value.focus();
};

const handleBarcodeSubmit = async () => {
  const code = (barcodeScanInput.value || '').trim();
  if (!code) return;
  await processBarcodeScan(code);
};

const processBarcodeScan = async (code) => {
  barcodeSearching.value = true;
  barcodeAlertWarning.value = '';
  barcodeAlertSuccess.value = '';

  try {
    let found = null;
    if (isOnline.value) {
      try {
        const res = await api.get(`/barang/check-barcode/${encodeURIComponent(code)}`);
        if (res.data && res.data.exists && res.data.barang) {
          found = res.data.barang;
        }
      } catch (e) {
        console.warn('Check barcode online gagal, fallback ke lokal:', e);
      }
    }

    if (!found) {
      found = await findLocalBarangByBarcode(code, false);
    }

    if (found) {
      playScanBeep();
      selectItem(found);
      const modalRp = form.harga_beli ? `Rp ${formatNumber(form.harga_beli)}` : 'Rp 0';
      barcodeAlertSuccess.value = `Barang [${found.kode_barang}] ${found.nama_barang} otomatis terpilih! Modal lama: ${modalRp} (MOD: ${found.MOD || '-'}).`;
      barcodeAlertWarning.value = '';
      barcodeScanInput.value = '';
      nextTick(() => {
        const qtyEl = document.getElementById('jumlah_masuk');
        if (qtyEl) {
          qtyEl.focus();
          qtyEl.select();
        }
      });
    } else {
      barcodeAlertWarning.value = `Barang dengan barcode/kode "${code}" belum terdaftar. Daftarkan dahulu di menu Inventaris Barang.`;
      barcodeAlertSuccess.value = '';
    }
  } catch (err) {
    console.error('Error proses barcode pasokan:', err);
    barcodeAlertWarning.value = 'Gagal memproses barcode.';
  } finally {
    barcodeSearching.value = false;
  }
};

const toggleCameraScanner = () => {
  if (isScannerActive.value) {
    stopCameraScanner();
  } else {
    startCameraScanner();
  }
};

const startCameraScanner = async () => {
  isScannerActive.value = true;
  barcodeAlertWarning.value = '';
  barcodeAlertSuccess.value = '';
  isScanningBusy = false;
  await nextTick();
  try {
    const formatsToSupport = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE
    ];

    html5QrScannerInstance = new Html5Qrcode('pembelian-barcode-viewfinder', {
      formatsToSupport,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      },
      verbose: false
    });

    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      alert('Tidak ada kamera atau webcam yang terdeteksi pada perangkat ini.');
      isScannerActive.value = false;
      return;
    }

    let chosenCameraId = cameras[0].id;
    const backCam = cameras.find(c => 
      c.label.toLowerCase().includes('back') || 
      c.label.toLowerCase().includes('rear') || 
      c.label.toLowerCase().includes('belakang') ||
      c.label.toLowerCase().includes('environment')
    );
    if (backCam) {
      chosenCameraId = backCam.id;
    } else if (cameras.length > 1) {
      chosenCameraId = cameras[cameras.length - 1].id;
    }

    await html5QrScannerInstance.start(
      chosenCameraId,
      {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const w = Math.min(Math.round(viewfinderWidth * 0.9), 360);
          const h = Math.min(Math.round(viewfinderHeight * 0.55), 180);
          return { width: Math.max(w, 220), height: Math.max(h, 110) };
        },
        aspectRatio: 1.6
      },
      async (decodedText) => {
        if (isScanningBusy) return;
        isScanningBusy = true;
        const code = (decodedText || '').trim();
        if (!code) {
          isScanningBusy = false;
          return;
        }
        await stopCameraScanner();
        await processBarcodeScan(code);
      },
      () => {}
    );
  } catch (err) {
    console.error('Gagal akses kamera:', err);
    alert('Tidak dapat mengaktifkan kamera. Pastikan izin akses kamera telah diizinkan.');
    isScannerActive.value = false;
  }
};

const stopCameraScanner = async () => {
  if (html5QrScannerInstance) {
    try {
      await html5QrScannerInstance.stop();
      html5QrScannerInstance.clear();
    } catch (e) {
      console.warn('Error stop camera scanner:', e);
    }
    html5QrScannerInstance = null;
  }
  isScannerActive.value = false;
};

const selectItem = (item) => {
  selectedItem.value = item;
  searchQuery.value = `[${item.kode_barang}] ${item.nama_barang}`;
  searchResults.value = [];
  
  if (item.modal_harga_beli && Number(item.modal_harga_beli) > 0) {
    form.harga_beli = Number(item.modal_harga_beli);
  } else if (item.MOD) {
    form.harga_beli = modToHarga(item.MOD);
  } else {
    form.harga_beli = 0;
  }

  if (!form.jumlah_masuk || form.jumlah_masuk <= 0) {
    form.jumlah_masuk = 10;
  }
};

const clearSelection = () => {
  searchQuery.value = '';
  searchResults.value = [];
  selectedItem.value = null;
  form.harga_beli = 0;
  form.jumlah_masuk = 10;
  barcodeAlertSuccess.value = '';
  barcodeAlertWarning.value = '';
  barcodeScanInput.value = '';
};

const submitPembelian = async () => {
  if (!selectedItem.value) return;
  if (!form.harga_beli || form.harga_beli <= 0) {
    errorMsg.value = 'Harga beli modal satuan harus diisi dan lebih besar dari 0.';
    return;
  }
  saving.value = true;
  successMsg.value = '';
  errorMsg.value = '';

  // 1. JIKA OFFLINE: Simpan ke Client DB & antrean sinkronisasi
  if (!isOnline.value) {
    try {
      const payload = {
        barang_id: selectedItem.value.id,
        harga_beli: form.harga_beli,
        harga_baru_modal_satuan: generatedMod.value,
        jumlah_masuk: form.jumlah_masuk,
        tanggal: form.tanggal
      };

      await queueOfflineAction(
        '/pembelian',
        'POST',
        payload,
        `Pembelian [${selectedItem.value.nama_barang}] +${form.jumlah_masuk} unit`
      );

      // Tambahkan stok lokal di IndexedDB secara langsung
      const localItem = await db.barang.get(selectedItem.value.id);
      let newStok = (selectedItem.value.stok_akhir || 0) + form.jumlah_masuk;
      if (localItem) {
        newStok = (localItem.stok_akhir || 0) + form.jumlah_masuk;
        await db.barang.update(localItem.id, {
          stok_akhir: newStok,
          modal_harga_beli: form.harga_beli,
          MOD: generatedMod.value
        });
      }

      successMsg.value = `[MODE OFFLINE] Pembelian [${selectedItem.value.nama_barang}] +${form.jumlah_masuk} unit berhasil dicatat di perangkat! Sisa stok lokal: ${newStok} unit, MOD baru: "${generatedMod.value}". Data akan disinkronkan ke server saat online.`;

      // Reset form
      searchQuery.value = '';
      selectedItem.value = null;
      form.harga_beli = 0;
      form.jumlah_masuk = 10;
      barcodeAlertSuccess.value = '';
      barcodeAlertWarning.value = '';
      barcodeScanInput.value = '';
    } catch (err) {
      console.error('Offline restock recording failed:', err);
      errorMsg.value = 'Gagal menyimpan transaksi pembelian ke database lokal perangkat.';
    } finally {
      saving.value = false;
    }
    return;
  }

  // 2. JIKA ONLINE: Kirim langsung ke Server API
  try {
    const res = await api.post('/pembelian', {
      barang_id: selectedItem.value.id,
      harga_beli: form.harga_beli,
      harga_baru_modal_satuan: generatedMod.value,
      jumlah_masuk: form.jumlah_masuk,
      tanggal: form.tanggal
    });

    successMsg.value = `Pembelian berhasil dicatat! Stok [${selectedItem.value.nama_barang}] bertambah ${form.jumlah_masuk} unit (Sisa: ${res.data.data.stok_akhir} unit). MOD otomatis dibuat menjadi "${generatedMod.value}".`;

    // Perbarui stok & MOD di client DB jika ada
    try {
      const localItem = await db.barang.get(selectedItem.value.id);
      if (localItem) {
        await db.barang.update(localItem.id, {
          stok_akhir: res.data.data.stok_akhir,
          modal_harga_beli: form.harga_beli,
          MOD: generatedMod.value
        });
      }
    } catch (e) {}

    // Reset form
    searchQuery.value = '';
    selectedItem.value = null;
    form.harga_beli = 0;
    form.jumlah_masuk = 10;
    barcodeAlertSuccess.value = '';
    barcodeAlertWarning.value = '';
    barcodeScanInput.value = '';

    historyPage.value = 1;
    fetchHistory();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Gagal memproses transaksi pembelian.';
  } finally {
    saving.value = false;
  }
};

const fetchHistory = async () => {
  historyLoading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 400));
  try {
    const [res] = await Promise.all([
      api.get('/pembelian', {
        params: { bulan: filter.bulan, tahun: filter.tahun }
      }),
      minDelay
    ]);
    historyData.value = res.data;
  } catch (err) {
    console.error('Failed to load purchase history:', err);
  } finally {
    historyLoading.value = false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const checkQueryParam = async () => {
  const barangId = route.query.barang_id;
  if (!barangId) return;
  try {
    const res = await api.get(`/barang/${barangId}`);
    if (res.data && res.data.data) {
      selectItem(res.data.data);
      form.jumlah_masuk = 10;
    }
  } catch (err) {
    console.error('Failed to pre-select item from query:', err);
  }
};

const handleSyncComplete = () => {
  fetchHistory();
};

// State Edit / Koreksi Pembelian
const showEditModal = ref(false);
const editingRow = ref(null);
const editSaving = ref(false);
const editModalError = ref('');
const editForm = reactive({
  jumlah_masuk: 1,
  tanggal: ''
});

const openEditModal = (row) => {
  editingRow.value = row;
  editForm.jumlah_masuk = row.jumlah_masuk;
  editForm.tanggal = row.tanggal ? row.tanggal.split('T')[0] : '';
  editModalError.value = '';
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingRow.value = null;
  editModalError.value = '';
};

const submitEditPembelian = async () => {
  if (!editingRow.value || !editForm.jumlah_masuk) return;
  editSaving.value = true;
  editModalError.value = '';

  try {
    const res = await api.put(`/pembelian/${editingRow.value.id}`, {
      jumlah_masuk: editForm.jumlah_masuk,
      tanggal: editForm.tanggal
    });
    successMsg.value = res.data?.message || 'Transaksi pembelian berhasil diperbarui.';
    closeEditModal();
    fetchHistory();
    window.dispatchEvent(new CustomEvent('activity-updated'));
  } catch (err) {
    console.error('Error update pembelian:', err);
    editModalError.value = err.response?.data?.error || 'Gagal memperbarui transaksi pembelian.';
  } finally {
    editSaving.value = false;
  }
};

// State Hapus / Batalkan Pembelian
const deletingRow = ref(null);
const deleteLoading = ref(false);
const deleteError = ref('');

const confirmDeletePembelian = (row) => {
  deletingRow.value = row;
  deleteError.value = '';
};

const executeDeletePembelian = async () => {
  if (!deletingRow.value) return;
  deleteLoading.value = true;
  deleteError.value = '';

  try {
    const res = await api.delete(`/pembelian/${deletingRow.value.id}`);
    successMsg.value = res.data?.message || 'Transaksi pembelian berhasil dibatalkan.';
    deletingRow.value = null;
    fetchHistory();
    window.dispatchEvent(new CustomEvent('activity-updated'));
  } catch (err) {
    console.error('Error delete pembelian:', err);
    deleteError.value = err.response?.data?.error || 'Gagal membatalkan transaksi pembelian.';
  } finally {
    deleteLoading.value = false;
  }
};

onMounted(() => {
  fetchHistory();
  checkQueryParam();
  window.addEventListener('sync-complete', handleSyncComplete);
});

onUnmounted(() => {
  stopCameraScanner();
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
</style>
