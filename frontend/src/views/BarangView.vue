<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Package :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Inventaris & Stok Barang</h3>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- <button @click="downloadTemplate" class="btn btn-outline-primary btn-sm" title="Unduh Template Excel Toko Citra Listrik">
            <Download :size="15" />
            <span>Unduh Template</span>
          </button> -->
          <button @click="openImportModal" class="btn btn-sm" style="background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; font-weight: 600;" title="Upload Excel untuk Tambah & Update Stok Barang">
            <Upload :size="15" />
            <span>Import Excel</span>
          </button>
          <button @click="openCreateModal" class="btn btn-primary btn-sm">
            <Plus :size="16" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Filter and Search Row -->
        <div class="filter-bar">
          <div class="search-input-box" style="max-width: 340px;">
            <Search :size="16" class="icon" />
            <input
              v-model="filters.search"
              @input="onSearchChange"
              type="text"
              class="form-input"
              placeholder="Cari barcode, kode, nama barang, merk..."
            />
          </div>

          <div style="width: 220px;">
            <select v-model="filters.kategori_id" @change="onFilterChange" class="form-select">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.nama_kategori }}
              </option>
            </select>
          </div>

          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; user-select: none;">
            <input
              type="checkbox"
              v-model="filters.low_stock"
              @change="onFilterChange"
              style="accent-color: var(--color-primary); width: 16px; height: 16px;"
            />
            <span style="color: var(--status-danger);">Hanya Stok Kritis (&le; 5)</span>
          </label>
        </div>

        <LoadingSpinner
          v-if="loading"
          text="Memuat inventaris produk..."
          subtext="Menyinkronkan stok, kategori, dan master kode MOD..."
          minHeight="240px"
        />

        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Kode & Barcode</th>
                <th>Nama Produk & Merk</th>
                <th>Kategori</th>
                <th style="text-align: center; width: 100px;">MOD</th>
                <th style="text-align: right;">Harga Jual</th>
                <th style="text-align: center;">Sisa Stok</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in items"
                :key="item.id"
                :style="isModalLebihTinggi(item) ? 'background: #FFF8F8;' : ''"
              >
                <td>
                  <span class="badge badge-blue" style="font-weight: 700;">{{ item.kode_barang }}</span>
                  <div v-if="item.barcode" style="margin-top: 4px;">
                    <span
                      class="badge"
                      style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; font-size: 0.72rem; font-family: monospace; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px;"
                      :title="`Barcode EAN/QR: ${item.barcode}`"
                    >
                      <Barcode :size="12" class="barcode-icon-desktop" />
                      <span>{{ item.barcode }}</span>
                    </span>
                  </div>
                </td>
                <td>
                  <div style="font-weight: 600; color: var(--text-main);">{{ item.nama_barang }}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">
                    Merk: <strong style="color: var(--text-main);">{{ item.merk || 'Noname' }}</strong>
                  </div>
                </td>
                <td>
                  <span class="badge" style="background: #F1F5F9; color: #475569;">
                    {{ item.nama_kategori || '-' }}
                  </span>
                </td>
                <!-- Kolom MOD sesuai format kode huruf rahasia modal -->
                <td style="text-align: center;">
                  <span
                    class="badge"
                    :style="isModalLebihTinggi(item) ? 'background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-weight: 800; font-family: monospace; font-size: 0.9rem; letter-spacing: 0.05em; padding: 4px 10px;' : 'background: #EBF3FF; color: #005CE6; font-weight: 800; font-family: monospace; font-size: 0.9rem; letter-spacing: 0.05em; padding: 4px 10px;'"
                  >
                    {{ item.MOD || '-' }}
                  </span>
                </td>
                <td class="num" style="text-align: right;">
                  <template v-if="parseFloat(item.harga_jual || 0) <= 0">
                    <span
                      class="badge"
                      style="background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 6px;"
                      title="Harga jual belum ditentukan (Rp 0). Produk ini disembunyikan dari kasir/penjualan sampai harga diisi."
                    >
                      <AlertTriangle :size="12" />
                      <span>Belum Diatur (Rp 0)</span>
                    </span>
                  </template>
                  <template v-else>
                    <div style="font-weight: 700;" :style="{ color: isModalLebihTinggi(item) ? '#DC2626' : 'var(--color-primary)' }">
                      Rp {{ formatNumber(item.harga_jual) }}
                    </div>
                    <!-- Warning jika Harga Beli (MOD) > Harga Jual -->
                    <div
                      v-if="isModalLebihTinggi(item)"
                      class="badge"
                      style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; padding: 2px 6px; border-radius: 4px;"
                      :title="`Peringatan: Modal MOD (Rp ${formatNumber(item.modal_harga_beli)}) lebih tinggi dari Harga Jual (Rp ${formatNumber(item.harga_jual)})!`"
                    >
                      <AlertTriangle :size="12" />
                      <span>MOD &gt; Jual (Rugi)</span>
                    </div>
                  </template>
                </td>
                <td style="text-align: center;">
                  <span
                    class="badge"
                    :class="item.stok_akhir <= 5 ? (item.stok_akhir === 0 ? 'badge-danger' : 'badge-warning') : 'badge-success'"
                    style="font-size: 0.8rem; padding: 4px 10px; font-weight: 700;"
                  >
                    {{ item.stok_akhir }} unit
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    <!-- Tombol Tambah Stok (Redirect ke Pembelian) -->
                    <button
                      @click="goToPembelian(item)"
                      class="btn btn-sm btn-outline-primary"
                      title="Input Pembelian & Tambah Stok"
                    >
                      <PlusCircle :size="14" />
                      <span>Stok</span>
                    </button>
                    <!-- Edit Barang -->
                    <button @click="openEditModal(item)" class="btn btn-sm btn-secondary" title="Edit Data Barang">
                      <Edit2 :size="14" />
                    </button>
                    <!-- Hapus / Arsipkan -->
                    <button @click="confirmDelete(item)" class="btn btn-sm btn-danger" title="Hapus Barang">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="items.length === 0">
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                  Tidak ada barang yang sesuai filter pencarian.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination (10 Barang per Halaman) -->
        <div v-if="pagination.total > 0" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan halaman <strong>{{ pagination.page }}</strong> dari <strong>{{ pagination.totalPages }}</strong> (Total <strong>{{ pagination.total }}</strong> barang &bull; 10 per halaman)
          </span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button
              @click="changePage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="btn btn-sm btn-secondary"
            >
              Sebelumnya
            </button>
            <button
              v-for="p in displayedPages"
              :key="p"
              @click="changePage(p)"
              class="btn btn-sm"
              :class="pagination.page === p ? 'btn-primary' : 'btn-secondary'"
              style="min-width: 32px; padding: 4px 8px; font-weight: 700;"
            >
              {{ p }}
            </button>
            <button
              @click="changePage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="btn btn-sm btn-secondary"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Tambah / Edit Barang -->
    <div v-if="showItemModal" class="modal-backdrop" @click.self="closeItemModal">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>{{ editingId ? 'Edit Data Barang' : 'Tambah Barang Baru' }}</h3>
          <button @click="closeItemModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>
        <form @submit.prevent="saveBarang">
          <div class="modal-body">
            <div v-if="itemModalError" class="badge badge-danger" style="display: block; margin-bottom: 14px; padding: 8px;">
              {{ itemModalError }}
            </div>

            <!-- Barcode Field & Scanner Button -->
            <div class="form-group" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <label class="form-label" for="barcode" style="margin-bottom: 0; display: flex; align-items: center; gap: 6px; font-weight: 700;">
                  <Barcode :size="18" class="barcode-icon-desktop" style="color: var(--color-primary);" />
                  <span>Barcode Produk (EAN / QR / Scan HP)</span>
                </label>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button
                    type="button"
                    @click="generateBarcodeOtomatis"
                    class="btn btn-sm"
                    style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; padding: 4px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; border-radius: 6px;"
                    title="Buat nomor barcode unik otomatis jika produk tidak punya barcode kemasan"
                    :disabled="generatingBarcode"
                  >
                    <Sparkles :size="14" />
                    <span>{{ generatingBarcode ? 'Membuat...' : 'Generate Barcode' }}</span>
                  </button>

                  <button
                    type="button"
                    @click="toggleCameraScanner"
                    class="btn btn-sm"
                    :style="isScannerActive ? 'background: #EF4444; color: #FFF; border: none;' : 'background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE;'"
                    style="padding: 4px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; border-radius: 6px;"
                    title="Gunakan webcam bawaan laptop/PC"
                  >
                    <Camera :size="14" />
                    <span>{{ isScannerActive ? 'Tutup Kamera' : 'Scan Barcode' }}</span>
                  </button>
                </div>
              </div>

              <!-- Viewfinder HTML5-QRCode jika scanner kamera aktif -->
              <div v-if="isScannerActive" style="margin: 10px 0; padding: 10px; background: #0F172A; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.75rem; color: #94A3B8; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <ScanLine :size="14" style="color: #38BDF8;" />
                  Arahkan barcode ke kamera
                </div>
                <div id="barcode-reader-viewfinder" style="width: 100%; max-width: 380px; margin: 0 auto; border-radius: 6px; overflow: hidden; background: #000; min-height: 200px;"></div>
              </div>

              <div style="position: relative;">
                <input
                  id="barcode"
                  ref="barcodeInputRef"
                  v-model="itemForm.barcode"
                  @input="onBarcodeInputChange"
                  @keydown.enter.prevent="onBarcodeEnterKey"
                  type="text"
                  class="form-input"
                  placeholder="Kursor siap menerima barcode dari HP / ketik manual..."
                  style="font-family: monospace; font-size: 0.95rem; letter-spacing: 0.05em; padding-right: 32px;"
                />
                <button
                  v-if="itemForm.barcode"
                  type="button"
                  @click="clearBarcode"
                  style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94A3B8; padding: 2px;"
                  title="Hapus barcode"
                >
                  <X :size="14" />
                </button>
              </div>

              <div v-if="barcodeChecking" style="font-size: 0.75rem; color: #64748B; margin-top: 5px;">
                Memeriksa ketersediaan barcode...
              </div>
              <div
                v-else-if="barcodeScanSuccess && !barcodeCheckWarning"
                style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding: 6px 12px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; color: #065F46; font-size: 0.8rem; font-weight: 600;"
              >
                <div style="display: flex; align-items: center; gap: 6px;">
                  <CheckCircle2 :size="15" style="color: #059669;" />
                  <span>Barcode <strong>{{ barcodeScanSuccess }}</strong> berhasil masuk!</span>
                </div>
                <button type="button" @click="barcodeScanSuccess = ''" style="background: none; border: none; cursor: pointer; color: #059669; font-size: 0.8rem; padding: 0 4px;">
                  ✕
                </button>
              </div>
              <div
                v-else-if="barcodeCheckWarning"
                class="badge badge-danger"
                style="display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 6px; padding: 8px 12px; border-radius: 6px; font-size: 0.78rem; text-align: left;"
              >
                <div style="display: flex; align-items: center; gap: 6px;">
                  <AlertTriangle :size="15" style="flex-shrink: 0;" />
                  <span>{{ barcodeCheckWarning }}</span>
                </div>
                <div v-if="existingBarangInfo && !editingId" style="margin-top: 4px;">
                  <button
                    type="button"
                    @click="loadExistingBarangData"
                    class="btn btn-sm"
                    style="background: #FFF; color: #DC2626; border: 1px solid #FECACA; padding: 3px 8px; font-size: 0.75rem; font-weight: 700; border-radius: 4px;"
                  >
                    Buka Data Barang Ini Untuk Edit / Tambah Stok
                  </button>
                </div>
              </div>
              <!-- <p v-else class="form-help" style="margin-top: 5px; margin-bottom: 0; color: #475569; font-size: 0.78rem;">
                📱 <strong>Jika scan pakai HP (Barcode to PC):</strong> Tidak perlu tekan tombol kamera laptop di atas. Cukup arahkan HP ke barcode barang, angkanya akan otomatis terketik di sini.
              </p> -->
            </div>

            <div class="form-group">
              <label class="form-label" for="nama_barang">Nama Barang</label>
              <input
                id="nama_barang"
                v-model="itemForm.nama_barang"
                type="text"
                class="form-input"
                placeholder="Contoh: Lampu Philips LED MyCare 10W Putih"
                required
              />
            </div>

            <div class="form-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label class="form-label" for="kategori_id">Kategori</label>
                <select id="kategori_id" v-model="itemForm.kategori_id" class="form-select" required>
                  <option value="" disabled>Pilih Kategori</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.nama_kategori }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="merk">Merk / Brand</label>
                <input
                  id="merk"
                  v-model="itemForm.merk"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: Philips, Panasonic (Kosongkan bila noname)"
                  :disabled="!!editingId"
                />
                <p v-if="!editingId" class="form-help">Kode otomatis dibuat dari 3 huruf merk.</p>
              </div>
            </div>

            <div class="form-grid-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
              <!-- Input Harga Beli / Modal (Rp) -->
              <div class="form-group">
                <label class="form-label" for="harga_beli">Harga Beli / Modal (Rp)</label>
                <input
                  id="harga_beli"
                  v-model.number="itemForm.harga_beli"
                  @input="onItemHargaBeliInput"
                  type="number"
                  min="0"
                  step="100"
                  class="form-input num"
                  placeholder="Contoh: 54000"
                />
                <p class="form-help">
                  <span v-if="itemForm.harga_beli > 0" style="color: #059669; font-weight: 600;">
                    Rp {{ formatNumber(itemForm.harga_beli) }}
                  </span>
                  <span v-else>Modal kulakan satuan produk.</span>
                </p>
              </div>

              <!-- MOD Ter-generate Otomatis -->
              <div class="form-group">
                <label class="form-label" for="mod_input">MOD (Kode Huruf)</label>
                <input
                  id="mod_input"
                  v-model="itemForm.MOD"
                  type="text"
                  class="form-input"
                  placeholder="Auto..."
                  style="text-transform: uppercase; font-family: monospace; font-weight: 800; color: var(--color-primary); text-align: center; font-size: 1.05rem;"
                  disabled
                />
                <p class="form-help">Auto dari harga beli.</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="harga_jual">Harga Jual Satuan (Rp) <span style="color: red;">*</span></label>
                <input
                  id="harga_jual"
                  v-model.number="itemForm.harga_jual"
                  type="number"
                  class="form-input num"
                  placeholder="Rp"
                  min="0"
                  required
                />
                <p class="form-help">Harga jual ke konsumen.</p>
              </div>
            </div>

            <!-- Warning jika MOD > Harga Jual di form tambah/edit barang -->
            <div
              v-if="isFormModalLebihTinggi"
              class="badge badge-danger"
              style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 10px 14px; border-radius: 8px; font-size: 0.825rem; line-height: 1.4; text-align: left;"
            >
              <AlertTriangle :size="18" style="flex-shrink: 0;" />
              <span>
                <strong>Peringatan Jual Rugi:</strong> Modal MOD <strong>{{ itemForm.MOD }}</strong> (Perkiraan Rp {{ formatNumber(itemForm.harga_beli || modToHarga(itemForm.MOD)) }}) lebih tinggi dari Harga Jual (Rp {{ formatNumber(itemForm.harga_jual) }}).
              </span>
            </div>

            <div v-if="!editingId" class="form-group">
              <label class="form-label" for="stok_awal">Stok Awal (Unit)</label>
              <input
                id="stok_awal"
                v-model.number="itemForm.stok_awal"
                type="number"
                class="form-input num"
                min="0"
                placeholder="Jumlah unit stok awal"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="keterangan">Keterangan / Catatan Spesifikasi (Opsional)</label>
              <textarea
                id="keterangan"
                v-model="itemForm.keterangan"
                rows="2"
                class="form-textarea"
                placeholder="Garansi, spesifikasi voltase, fitting E27, dsb."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeItemModal" class="btn btn-secondary">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="itemSaving">
              {{ itemSaving ? 'Menyimpan...' : 'Simpan Barang' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Import Excel -->
    <div v-if="showImportModal" class="modal-backdrop" @click.self="closeImportModal">
      <div class="modal-content" style="max-width: 650px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <FileSpreadsheet :size="20" style="color: #10B981;" />
            <h3 style="margin: 0; font-size: 1.15rem;">Import Barang dari Excel</h3>
          </div>
          <button @click="closeImportModal" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">
            <X :size="16" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Petunjuk dan Info Box -->
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; font-size: 0.85rem; color: #166534; line-height: 1.5;">
            <div style="font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>Cara Kerja Sistem Import Otomatis:</span>
            </div>
            <ul style="margin: 0; padding-left: 18px;">
              <li>Kolom <strong>BARCODE (OPSIONAL)</strong>: Boleh diisi atau dikosongkan. Jika diisi, barcode langsung tersimpan ke database & siap digunakan untuk scan transaksi kasir/pembelian.</li>
              <li>Kolom <strong>HARGA JUAL</strong>: Menentukan harga jual untuk barang baru atau memperbarui harga jual pada barang yang sudah ada. Jika dikosongkan pada barang yang sudah ada, harga jual lama tetap dipertahankan.</li>
              <li>Sistem akan memeriksa kecocokan berdasarkan <strong>Barcode</strong> atau <strong>Nama Barang</strong>.</li>
              <li><strong>Jika barang sudah ada</strong>: Stok barang otomatis bertambah, MOD &amp; harga jual diperbarui, dan barcode otomatis tersimpan jika sebelumnya belum ada.</li>
              <li><strong>Jika barang belum ada</strong>: Barang baru otomatis dibuat dengan kode barang terstandar Toko Citra 23 beserta harga jualnya.</li>
              <li>Riwayat pasokan masuk otomatis tercatat rapi pada menu Pembelian.</li>
            </ul>
          </div>

          <!-- Tombol Download Template -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <div>
              <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-main);">Belum punya template Excel?</div>
              <div style="font-size: 0.775rem; color: var(--text-muted);">Gunakan format Excel standar Toko Citra Listrik</div>
            </div>
            <button @click="downloadTemplate" class="btn btn-outline-primary btn-sm">
              <Download :size="14" />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          <!-- File Upload Zone -->
          <div
            class="import-dropzone"
            :class="{ active: isDragging, 'has-file': !!selectedExcelFile }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onFileDrop"
            @click="triggerFileInput"
            style="border: 2px dashed #94A3B8; border-radius: 10px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: #FAFAFA;"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx, .xls"
              style="display: none;"
              @change="onFileSelected"
            />
            <div v-if="!selectedExcelFile">
              <FileSpreadsheet :size="36" style="color: #64748B; margin-bottom: 10px;" />
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">
                Pilih atau seret file Excel ke sini (.xlsx / .xls)
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                Maksimal ukuran file: 10 MB
              </div>
            </div>
            <div v-else style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <FileSpreadsheet :size="32" style="color: #10B981;" />
              <div style="text-align: left;">
                <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">{{ selectedExcelFile.name }}</div>
                <div style="font-size: 0.8rem; color: #64748B;">{{ (selectedExcelFile.size / 1024).toFixed(1) }} KB</div>
              </div>
              <button @click.stop="clearSelectedFile" class="btn btn-sm btn-secondary" style="margin-left: 12px; padding: 4px 8px;">
                Ganti
              </button>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="importError" class="badge badge-danger" style="display: block; margin-top: 14px; padding: 10px; text-align: left; font-size: 0.85rem;">
            {{ importError }}
          </div>

          <!-- Success Summary Alert -->
          <div v-if="importSummary" style="margin-top: 16px; background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 14px 16px;">
            <div style="display: flex; align-items: center; gap: 8px; color: #15803D; font-weight: 700; font-size: 0.95rem; margin-bottom: 8px;">
              <CheckCircle2 :size="18" />
              <span>{{ importSuccessMessage }}</span>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
              <span class="badge badge-success" style="padding: 6px 12px; font-size: 0.8rem;">
                {{ importSummary.created }} Barang Baru Dibuat
              </span>
              <span class="badge badge-blue" style="padding: 6px 12px; font-size: 0.8rem;">
                {{ importSummary.updated }} Barang Ditambah Stok, MOD &amp; Harga Jual
              </span>
              <span v-if="importSummary.skipped" class="badge" style="background: #E2E8F0; color: #475569; padding: 6px 12px; font-size: 0.8rem;">
                {{ importSummary.skipped }} Baris Dilewati (Kosong)
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="closeImportModal" class="btn btn-secondary">
            {{ importSummary ? 'Tutup' : 'Batal' }}
          </button>
          <button
            v-if="!importSummary"
            type="button"
            @click="submitImportExcel"
            class="btn btn-primary"
            :disabled="!selectedExcelFile || importLoading"
            style="background: #059669; border-color: #059669;"
          >
            <Upload :size="15" />
            <span>{{ importLoading ? 'Memproses Import...' : 'Mulai Import Excel' }}</span>
          </button>
        </div>
      </div>
    </div>


  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
import { db } from '../db/clientDb';
import { isOnline, queueOfflineAction } from '../services/syncManager';
import { hargaToMod, modToHarga } from '../utils/modHelper';
import {
  Package,
  Plus,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Barcode,
  Camera,
  ScanLine,
  Sparkles
} from 'lucide-vue-next';

const router = useRouter();
const items = ref([]);
const categories = ref([]);
const loading = ref(true);

// Deteksi apakah Harga Beli (MOD) > Harga Jual
const isModalLebihTinggi = (item) => {
  const modal = parseFloat(item.modal_harga_beli || 0) || modToHarga(item.MOD || '');
  const jual = parseFloat(item.harga_jual || 0);
  return modal > 0 && modal > jual;
};

// Form Tambah/Edit Barang: Cek MOD vs Harga Jual
const isFormModalLebihTinggi = computed(() => {
  const modal = itemForm.harga_beli ? parseFloat(itemForm.harga_beli) : modToHarga(itemForm.MOD);
  const jual = parseFloat(itemForm.harga_jual || 0);
  return modal > 0 && modal > jual;
});

const filters = reactive({
  search: '',
  kategori_id: '',
  low_stock: false
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1
});

const displayedPages = computed(() => {
  const total = pagination.totalPages || 1;
  if (total <= 5) {
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(1, Math.min(pagination.page, total - 4));
  const pages = [];
  for (let i = 0; i < 5; i++) {
    pages.push(start + i);
  }
  return pages;
});

// Modal Tambah / Edit Barang State
const showItemModal = ref(false);
const editingId = ref(null);
const itemSaving = ref(false);
const itemModalError = ref('');
const barcodeInputRef = ref(null);
const isScannerActive = ref(false);
let html5QrScannerInstance = null;
const barcodeChecking = ref(false);
const barcodeCheckWarning = ref('');
const barcodeScanSuccess = ref('');
const existingBarangInfo = ref(null);
let barcodeCheckTimeout = null;
let isScanningBusy = false;
const generatingBarcode = ref(false);

const generateBarcodeOtomatis = async () => {
  generatingBarcode.value = true;
  barcodeScanSuccess.value = '';
  barcodeCheckWarning.value = '';

  try {
    let newCode = '';
    if (isOnline.value) {
      try {
        const res = await api.get('/barang/generate-barcode');
        if (res.data && res.data.barcode) {
          newCode = res.data.barcode;
        }
      } catch (err) {
        console.warn('Gagal generate barcode via server, fallback lokal:', err);
      }
    }

    // Fallback jika offline / server belum aktif
    if (!newCode) {
      const ts = String(Date.now()).slice(-6);
      const rand = String(Math.floor(1000 + Math.random() * 9000));
      const twelve = `23${ts}${rand}`;
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const num = parseInt(twelve[i], 10);
        sum += (i % 2 === 0) ? num : num * 3;
      }
      const mod = sum % 10;
      const checkDigit = mod === 0 ? 0 : 10 - mod;
      newCode = `${twelve}${checkDigit}`;
    }

    itemForm.barcode = newCode;
    playScanBeep();
    barcodeScanSuccess.value = `Barcode otomatis ${newCode} berhasil dibuat!`;
    barcodeCheckWarning.value = '';

    if (barcodeInputRef.value) {
      barcodeInputRef.value.focus();
    }
  } catch (e) {
    console.error('Error generate barcode:', e);
    barcodeCheckWarning.value = 'Gagal membuat barcode otomatis.';
  } finally {
    generatingBarcode.value = false;
  }
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
  } catch (e) {
    // Audio context may require user gesture on some browsers
  }
};

const checkBarcodeDuplicate = async (code) => {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    barcodeCheckWarning.value = '';
    existingBarangInfo.value = null;
    return;
  }
  barcodeChecking.value = true;
  try {
    const res = await api.get(`/barang/check-barcode/${encodeURIComponent(trimmed)}`);
    if (res.data && res.data.exists && res.data.barang) {
      existingBarangInfo.value = res.data.barang;
      const b = res.data.barang;
      if (!editingId.value) {
        // Otomatis isi nama barang, kategori, merk, harga beli (modal), MOD, dan harga jual jika sudah terdaftar
        itemForm.nama_barang = b.nama_barang;
        if (b.kategori_id) itemForm.kategori_id = b.kategori_id;
        itemForm.merk = b.merk || '';
        const modalNum = b.modal_harga_beli ? parseFloat(b.modal_harga_beli) : (b.MOD ? modToHarga(b.MOD) : 0);
        itemForm.harga_beli = modalNum;
        itemForm.MOD = b.MOD || (modalNum > 0 ? hargaToMod(modalNum) : '');
        itemForm.harga_jual = Number(b.harga_jual || 0);
        itemForm.keterangan = b.keterangan || '';
        editingId.value = b.id;
        barcodeScanSuccess.value = `Barang ditemukan: [${b.kode_barang}] ${b.nama_barang} (data otomatis terisi)`;
        barcodeCheckWarning.value = '';
      } else if (Number(editingId.value) === Number(b.id)) {
        barcodeCheckWarning.value = '';
      } else {
        barcodeCheckWarning.value = `⚠️ Barcode "${trimmed}" sudah terdaftar pada [${b.kode_barang}] ${b.nama_barang}!`;
      }
    } else {
      barcodeCheckWarning.value = '';
      existingBarangInfo.value = null;
    }
  } catch (err) {
    console.warn('Gagal cek barcode:', err);
    barcodeCheckWarning.value = '';
    existingBarangInfo.value = null;
  } finally {
    barcodeChecking.value = false;
  }
};

const loadExistingBarangData = () => {
  if (!existingBarangInfo.value) return;
  const b = existingBarangInfo.value;
  itemForm.nama_barang = b.nama_barang;
  if (b.kategori_id) itemForm.kategori_id = b.kategori_id;
  itemForm.merk = b.merk || '';
  const modalNum = b.modal_harga_beli ? parseFloat(b.modal_harga_beli) : (b.MOD ? modToHarga(b.MOD) : 0);
  itemForm.harga_beli = modalNum;
  itemForm.MOD = b.MOD || (modalNum > 0 ? hargaToMod(modalNum) : '');
  itemForm.harga_jual = Number(b.harga_jual || 0);
  itemForm.keterangan = b.keterangan || '';
  editingId.value = b.id;
  barcodeCheckWarning.value = '';
  barcodeScanSuccess.value = `Data [${b.kode_barang}] ${b.nama_barang} berhasil dimuat!`;
};

const onBarcodeInputChange = () => {
  barcodeScanSuccess.value = '';
  clearTimeout(barcodeCheckTimeout);
  barcodeCheckTimeout = setTimeout(() => {
    checkBarcodeDuplicate(itemForm.barcode);
  }, 400);
};

const onBarcodeEnterKey = () => {
  clearTimeout(barcodeCheckTimeout);
  checkBarcodeDuplicate(itemForm.barcode);
  nextTick(() => {
    const namaInput = document.getElementById('nama_barang');
    if (namaInput) namaInput.focus();
  });
};

const clearBarcode = () => {
  itemForm.barcode = '';
  barcodeCheckWarning.value = '';
  barcodeScanSuccess.value = '';
  existingBarangInfo.value = null;
  if (barcodeInputRef.value) barcodeInputRef.value.focus();
};

const startCameraScanner = async () => {
  isScannerActive.value = true;
  barcodeCheckWarning.value = '';
  barcodeScanSuccess.value = '';
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

    html5QrScannerInstance = new Html5Qrcode('barcode-reader-viewfinder', {
      formatsToSupport,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      },
      verbose: false
    });

    // Dapatkan daftar kamera fisik yang tersedia di laptop / HP
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      alert('Tidak ada kamera atau webcam yang terdeteksi pada perangkat ini.');
      isScannerActive.value = false;
      return;
    }

    // Prioritaskan kamera belakang jika ada di HP, atau gunakan webcam pertama jika di laptop
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
        playScanBeep();
        itemForm.barcode = code;
        barcodeScanSuccess.value = code;
        await stopCameraScanner();
        await checkBarcodeDuplicate(code);
        nextTick(() => {
          const namaInput = document.getElementById('nama_barang');
          if (namaInput) namaInput.focus();
        });
      },
      (errorMessage) => {
        // Frame did not decode any barcode, continuous scan
      }
    );
  } catch (err) {
    console.error('Gagal mengakses kamera:', err);
    alert('Tidak dapat mengaktifkan kamera. Pastikan izin akses kamera telah diizinkan pada browser.');
    isScannerActive.value = false;
  }
};

const stopCameraScanner = async () => {
  if (html5QrScannerInstance) {
    try {
      await html5QrScannerInstance.stop();
      html5QrScannerInstance.clear();
    } catch (e) {
      console.warn('Error saat menghentikan scanner kamera:', e);
    }
    html5QrScannerInstance = null;
  }
  isScannerActive.value = false;
};

const toggleCameraScanner = () => {
  if (isScannerActive.value) {
    stopCameraScanner();
  } else {
    startCameraScanner();
  }
};

const itemForm = reactive({
  barcode: '',
  nama_barang: '',
  kategori_id: '',
  merk: '',
  stok_awal: 0,
  harga_beli: 0,
  MOD: '',
  harga_jual: 0,
  keterangan: ''
});

const onItemHargaBeliInput = () => {
  if (itemForm.harga_beli > 0) {
    itemForm.MOD = hargaToMod(itemForm.harga_beli);
  } else {
    itemForm.MOD = '';
  }
};

const onItemModInput = () => {
  if (itemForm.MOD && itemForm.MOD.trim()) {
    itemForm.MOD = itemForm.MOD.toUpperCase();
    const calculated = modToHarga(itemForm.MOD);
    if (calculated > 0) {
      itemForm.harga_beli = calculated;
    }
  }
};

let searchTimeout = null;
const onSearchChange = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    fetchBarang();
  }, 350);
};

const onFilterChange = () => {
  pagination.page = 1;
  fetchBarang();
};

const fetchCategories = async () => {
  if (!isOnline.value) {
    try {
      categories.value = await db.kategori.toArray();
    } catch (e) {}
    return;
  }
  try {
    const res = await api.get('/kategori');
    categories.value = res.data.data;
  } catch (err) {
    console.warn('Failed to load categories from server, fallback to local:', err);
    try {
      categories.value = await db.kategori.toArray();
    } catch (e) {}
  }
};

const fetchBarang = async () => {
  loading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 400));

  if (!isOnline.value) {
    try {
      const allLocal = await db.barang.toArray();
      let filtered = allLocal;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(b => (b.nama_barang || '').toLowerCase().includes(q) || (b.kode_barang || '').toLowerCase().includes(q) || (b.barcode || '').toLowerCase().includes(q) || (b.merk || '').toLowerCase().includes(q));
      }
      if (filters.kategori_id) {
        filtered = filtered.filter(b => String(b.kategori_id) === String(filters.kategori_id));
      }
      if (filters.low_stock) {
        filtered = filtered.filter(b => (b.stok_akhir || 0) <= 5);
      }
      pagination.total = filtered.length;
      pagination.totalPages = Math.ceil(filtered.length / pagination.limit) || 1;
      const start = (pagination.page - 1) * pagination.limit;
      items.value = filtered.slice(start, start + pagination.limit);
    } catch (localErr) {
      console.error('Dexie read failed:', localErr);
    } finally {
      loading.value = false;
    }
    return;
  }

  try {
    const [res] = await Promise.all([
      api.get('/barang', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: filters.search,
          kategori_id: filters.kategori_id,
          low_stock: filters.low_stock
        }
      }),
      minDelay
    ]);
    items.value = res.data.data;
    pagination.total = res.data.pagination.total;
    pagination.totalPages = res.data.pagination.totalPages || 1;

    // Jika filter mengubah total halaman sehingga page aktif berada di luar jangkauan
    if (pagination.page > pagination.totalPages && pagination.totalPages > 0) {
      pagination.page = 1;
      fetchBarang();
      return;
    }
  } catch (err) {
    console.warn('Gagal memuat barang dari server, fallback ke database lokal:', err);
    try {
      const allLocal = await db.barang.toArray();
      let filtered = allLocal;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(b => (b.nama_barang || '').toLowerCase().includes(q) || (b.kode_barang || '').toLowerCase().includes(q) || (b.barcode || '').toLowerCase().includes(q) || (b.merk || '').toLowerCase().includes(q));
      }
      if (filters.kategori_id) {
        filtered = filtered.filter(b => String(b.kategori_id) === String(filters.kategori_id));
      }
      if (filters.low_stock) {
        filtered = filtered.filter(b => (b.stok_akhir || 0) <= 5);
      }
      pagination.total = filtered.length;
      pagination.totalPages = Math.ceil(filtered.length / pagination.limit) || 1;
      const start = (pagination.page - 1) * pagination.limit;
      items.value = filtered.slice(start, start + pagination.limit);
    } catch (localErr) {
      console.error('Dexie read failed:', localErr);
    }
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage) => {
  pagination.page = newPage;
  fetchBarang();
};

const openCreateModal = () => {
  stopCameraScanner();
  editingId.value = null;
  itemForm.barcode = '';
  itemForm.nama_barang = '';
  itemForm.kategori_id = categories.value.length > 0 ? categories.value[0].id : '';
  itemForm.merk = '';
  itemForm.stok_awal = 0;
  itemForm.harga_beli = 0;
  itemForm.MOD = '';
  itemForm.harga_jual = 0;
  itemForm.keterangan = '';
  itemModalError.value = '';
  barcodeCheckWarning.value = '';
  barcodeScanSuccess.value = '';
  existingBarangInfo.value = null;
  showItemModal.value = true;
  nextTick(() => {
    if (barcodeInputRef.value) barcodeInputRef.value.focus();
  });
};

const openEditModal = (item) => {
  stopCameraScanner();
  editingId.value = item.id;
  itemForm.barcode = item.barcode || '';
  itemForm.nama_barang = item.nama_barang;
  itemForm.kategori_id = item.kategori_id;
  itemForm.merk = item.merk;
  itemForm.harga_beli = item.modal_harga_beli ? parseFloat(item.modal_harga_beli) : (item.MOD ? modToHarga(item.MOD) : 0);
  itemForm.MOD = item.MOD || (itemForm.harga_beli > 0 ? hargaToMod(itemForm.harga_beli) : '');
  itemForm.harga_jual = Number(item.harga_jual);
  itemForm.keterangan = item.keterangan || '';
  itemModalError.value = '';
  barcodeCheckWarning.value = '';
  barcodeScanSuccess.value = '';
  existingBarangInfo.value = null;
  showItemModal.value = true;
};

const closeItemModal = () => {
  stopCameraScanner();
  showItemModal.value = false;
};

const saveBarang = async () => {
  if (barcodeCheckWarning.value) {
    itemModalError.value = barcodeCheckWarning.value;
    return;
  }
  itemSaving.value = true;
  itemModalError.value = '';

  const saveOffline = async () => {
    const rawBarcode = itemForm.barcode ? itemForm.barcode.trim() : null;
    if (editingId.value) {
      await db.barang.update(editingId.value, {
        barcode: rawBarcode,
        nama_barang: itemForm.nama_barang,
        kategori_id: itemForm.kategori_id,
        merk: itemForm.merk,
        modal_harga_beli: itemForm.harga_beli,
        MOD: itemForm.MOD,
        harga_jual: itemForm.harga_jual,
        keterangan: itemForm.keterangan
      });
      await queueOfflineAction(
        `/barang/${editingId.value}`,
        'PUT',
        { ...itemForm, barcode: rawBarcode },
        `Ubah Barang: ${itemForm.nama_barang}`
      );
    } else {
      const tempId = 'offline_b_' + Date.now();
      const cleanMerk = itemForm.merk ? itemForm.merk.trim().replace(/[^a-zA-Z]/g, '').toUpperCase() : '';
      let merkPrefix = 'NN';
      if (cleanMerk) {
        merkPrefix = cleanMerk.length >= 3 ? cleanMerk.substring(0, 3) : cleanMerk.padEnd(3, 'X');
      }
      const newKode = 'C23' + merkPrefix + Math.floor(10000 + Math.random() * 90000);
      await db.barang.add({
        id: tempId,
        kode_barang: newKode,
        barcode: rawBarcode,
        nama_barang: itemForm.nama_barang,
        kategori_id: itemForm.kategori_id,
        merk: itemForm.merk,
        stok_akhir: Number(itemForm.stok_awal) || 0,
        modal_harga_beli: itemForm.harga_beli,
        MOD: itemForm.MOD,
        harga_jual: itemForm.harga_jual,
        keterangan: itemForm.keterangan,
        is_offline: true
      });
      await queueOfflineAction(
        '/barang',
        'POST',
        { ...itemForm, barcode: rawBarcode },
        `Tambah Barang: ${itemForm.nama_barang}`
      );
    }
    closeItemModal();
    await fetchBarang();
  };

  if (!isOnline.value) {
    try {
      await saveOffline();
    } catch (e) {
      console.error('Offline save barang failed:', e);
      itemModalError.value = 'Gagal menyimpan barang ke database lokal perangkat.';
    } finally {
      itemSaving.value = false;
    }
    return;
  }

  try {
    const payload = {
      ...itemForm,
      barcode: itemForm.barcode ? itemForm.barcode.trim() : null
    };
    if (editingId.value) {
      await api.put(`/barang/${editingId.value}`, payload);
    } else {
      await api.post('/barang', payload);
    }
    closeItemModal();
    fetchBarang();
  } catch (err) {
    if (!err.response) {
      console.warn('Jaringan terputus saat simpan barang, beralih ke offline...');
      try {
        await saveOffline();
        return;
      } catch (e) {}
    }
    itemModalError.value = err.response?.data?.error || 'Gagal menyimpan barang.';
  } finally {
    itemSaving.value = false;
  }
};

const goToPembelian = (item) => {
  router.push({
    path: '/pembelian',
    query: { barang_id: item.id }
  });
};

const confirmDelete = async (item) => {
  if (confirm(`Apakah Anda yakin ingin menghapus atau mengarsipkan barang [${item.kode_barang}] ${item.nama_barang}?`)) {
    if (!isOnline.value) {
      try {
        await db.barang.delete(item.id);
        await queueOfflineAction(
          `/barang/${item.id}`,
          'DELETE',
          {},
          `Hapus Barang: [${item.kode_barang}] ${item.nama_barang}`
        );
        fetchBarang();
      } catch (e) {
        alert('Gagal menghapus barang di mode offline.');
      }
      return;
    }

    try {
      await api.delete(`/barang/${item.id}`);
      fetchBarang();
    } catch (err) {
      if (!err.response) {
        await db.barang.delete(item.id);
        await queueOfflineAction(
          `/barang/${item.id}`,
          'DELETE',
          {},
          `Hapus Barang: [${item.kode_barang}] ${item.nama_barang}`
        );
        fetchBarang();
        return;
      }
      alert(err.response?.data?.error || 'Gagal menghapus barang.');
    }
  }
};

// State & Methods Import Excel
const showImportModal = ref(false);
const selectedExcelFile = ref(null);
const fileInputRef = ref(null);
const isDragging = ref(false);
const importLoading = ref(false);
const importError = ref('');
const importSummary = ref(null);
const importSuccessMessage = ref('');

const openImportModal = () => {
  selectedExcelFile.value = null;
  importError.value = '';
  importSummary.value = null;
  importSuccessMessage.value = '';
  showImportModal.value = true;
};

const closeImportModal = () => {
  showImportModal.value = false;
  if (importSummary.value) {
    fetchBarang();
  }
};

const triggerFileInput = () => {
  if (fileInputRef.value) fileInputRef.value.click();
};

const onFileSelected = (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    selectedExcelFile.value = files[0];
    importError.value = '';
  }
};

const onFileDrop = (e) => {
  isDragging.value = false;
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      selectedExcelFile.value = file;
      importError.value = '';
    } else {
      importError.value = 'Harap unggah file dengan format Excel (.xlsx atau .xls).';
    }
  }
};

const clearSelectedFile = () => {
  selectedExcelFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const downloadTemplate = async () => {
  try {
    const response = await api.get('/barang/template-excel', {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Barang_Toko_Citra_23.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download template error:', err);
    alert('Gagal mengunduh template Excel.');
  }
};

const submitImportExcel = async () => {
  if (!selectedExcelFile.value) return;

  importLoading.value = true;
  importError.value = '';
  importSummary.value = null;

  try {
    const formData = new FormData();
    formData.append('file', selectedExcelFile.value);

    const res = await api.post('/barang/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    importSummary.value = res.data.summary;
    importSuccessMessage.value = res.data.message;

    // Refresh data barang dan kategori
    fetchCategories();
    fetchBarang();
  } catch (err) {
    console.error('Import excel error:', err);
    importError.value = err.response?.data?.error || 'Gagal memproses file Excel.';
  } finally {
    importLoading.value = false;
  }
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString('id-ID');
};

const handleCatalogUpdated = () => {
  fetchCategories();
  fetchBarang();
};

let scannerBuffer = '';
let lastKeyTime = 0;

const handleGlobalScannerKeydown = (e) => {
  if (!showItemModal.value) return;

  const now = Date.now();
  const diff = now - lastKeyTime;
  lastKeyTime = now;

  // Scanner biasanya mengirim Enter di akhir barcode
  if (e.key === 'Enter') {
    if (scannerBuffer.length >= 6) {
      e.preventDefault();
      const code = scannerBuffer.trim();
      itemForm.barcode = code;
      barcodeScanSuccess.value = code;
      playScanBeep();
      checkBarcodeDuplicate(code);
      scannerBuffer = '';
      nextTick(() => {
        const namaInput = document.getElementById('nama_barang');
        if (namaInput) namaInput.focus();
      });
      return;
    }
    scannerBuffer = '';
    return;
  }

  // Barcode scanner / Barcode to PC mengetik sangat cepat (interval < 55ms)
  if (diff < 55 && e.key.length === 1) {
    scannerBuffer += e.key;
  } else {
    if (diff > 120) {
      scannerBuffer = e.key.length === 1 ? e.key : '';
    }
  }
};

onMounted(() => {
  fetchCategories();
  fetchBarang();
  window.addEventListener('catalog-mirrored', handleCatalogUpdated);
  window.addEventListener('sync-complete', handleCatalogUpdated);
  window.addEventListener('keydown', handleGlobalScannerKeydown);
});

onUnmounted(() => {
  stopCameraScanner();
  window.removeEventListener('catalog-mirrored', handleCatalogUpdated);
  window.removeEventListener('sync-complete', handleCatalogUpdated);
  window.removeEventListener('keydown', handleGlobalScannerKeydown);
});
</script>
