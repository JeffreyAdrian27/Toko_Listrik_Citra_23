<template>
  <AppLayout>
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <Package :size="20" style="color: var(--color-primary);" />
          <h3 class="card-title">Inventaris & Stok Barang</h3>
        </div>
        <button @click="openCreateModal" class="btn btn-primary btn-sm">
          <Plus :size="16" />
          <span>Tambah Barang Baru</span>
        </button>
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
              placeholder="Cari kode, nama barang, merk..."
            />
          </div>

          <div style="width: 220px;">
            <select v-model="filters.kategori_id" @change="fetchBarang" class="form-select">
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
              @change="fetchBarang"
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
                <th>Kode</th>
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
                    <!-- Tombol Tambah Stok (FR-BRG-3) -->
                    <button
                      @click="openTambahStokModal(item)"
                      class="btn btn-sm btn-outline-primary"
                      title="Tambah Stok Masuk (Modal)"
                    >
                      <PlusCircle :size="14" />
                      <span>+ Stok</span>
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

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
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

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
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
                  <span v-else>Modal kulakan satuan.</span>
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
                  required
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

    <!-- Modal Tambah Stok & Update MOD (Desain Rapi & Elegan) -->
    <div v-if="showTambahStokModal" class="modal-backdrop" @click.self="closeTambahStokModal">
      <div class="modal-content" style="max-width: 580px; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.2);">
        <!-- Modal Header -->
        <div class="modal-header" style="padding: 18px 24px; border-bottom: 1px solid var(--border-light); background: #F8FAFC;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
              <PackagePlus :size="22" stroke-width="2.5" />
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-main);">
                Tambah Stok Masuk &amp; Update MOD
              </h3>
              <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-muted);">
                Pencatatan pasokan baru dan pembaruan sandi modal barang
              </p>
            </div>
          </div>
          <button @click="closeTambahStokModal" class="btn btn-sm btn-secondary" style="padding: 6px; border-radius: 8px;">
            <X :size="16" />
          </button>
        </div>

        <form @submit.prevent="submitTambahStok">
          <div class="modal-body" style="padding: 22px 24px;">
            <div v-if="tambahStokError" class="badge badge-danger" style="display: block; margin-bottom: 16px; padding: 10px; border-radius: 8px;">
              {{ tambahStokError }}
            </div>

            <!-- Kartu Info Produk Terpilih -->
            <div style="background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border: 1px solid var(--border-light); border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span class="badge badge-blue" style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">
                      {{ activeStockItem?.kode_barang }}
                    </span>
                    <span v-if="activeStockItem?.nama_kategori" style="font-size: 0.75rem; color: var(--text-muted); background: #E2E8F0; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                      {{ activeStockItem?.nama_kategori }}
                    </span>
                  </div>
                  <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-main); line-height: 1.3;">
                    {{ activeStockItem?.nama_barang }}
                  </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                  <span class="badge" :class="activeStockItem?.stok_akhir > 0 ? 'badge-success' : 'badge-danger'" style="font-size: 0.75rem; font-weight: 700;">
                    Stok Saat Ini: {{ activeStockItem?.stok_akhir || 0 }} unit
                  </span>
                </div>
              </div>
              <div style="display: flex; gap: 16px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-medium); font-size: 0.8rem; color: var(--text-muted);">
                <span>Harga Jual Toko: <strong style="color: var(--text-main);">Rp {{ formatNumber(activeStockItem?.harga_jual) }}</strong></span>
                <span>Merk: <strong style="color: var(--text-main);">{{ activeStockItem?.merk || '-' }}</strong></span>
              </div>
            </div>

            <!-- Panel Konfigurasi Modal & Sandi MOD -->
            <div style="background: #FFFFFF; border: 1px solid var(--border-medium); border-radius: 12px; padding: 16px; margin-bottom: 18px; box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <Coins :size="15" style="color: var(--color-primary);" />
                <span>Harga Beli Modal &amp; Pembaruan Sandi MOD</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 12px; align-items: flex-start;">
                <!-- Kolom 1: MOD Lama -->
                <div>
                  <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">
                    MOD LAMA
                  </label>
                  <div style="background: #F1F5F9; border: 1px solid var(--border-light); border-radius: 8px; height: 44px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: 800; font-size: 1.15rem; color: #475569;">
                    {{ activeStockItem?.MOD || '-' }}
                  </div>
                  <div style="font-size: 0.72rem; color: #94A3B8; text-align: center; margin-top: 4px;">
                    MOD saat ini
                  </div>
                </div>

                <!-- Kolom 2: Input Harga Beli Modal Baru -->
                <div>
                  <label for="tambah_stok_harga_beli" style="display: block; font-size: 0.72rem; font-weight: 700; color: var(--text-main); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">
                    HARGA BELI (RP) <span style="color: red;">*</span>
                  </label>
                  <input
                    id="tambah_stok_harga_beli"
                    v-model.number="tambahStokForm.harga_beli"
                    @input="onTambahStokHargaInput"
                    type="number"
                    min="0"
                    step="100"
                    class="form-input num"
                    placeholder="Contoh: 5000"
                    required
                    style="height: 44px; font-weight: 700; font-size: 1rem; text-align: center; border-color: var(--color-primary-border);"
                  />
                  <div style="font-size: 0.75rem; text-align: center; margin-top: 4px; font-weight: 700; color: #059669;">
                    <span v-if="tambahStokForm.harga_beli > 0">Rp {{ formatNumber(tambahStokForm.harga_beli) }}</span>
                    <span v-else style="color: #94A3B8; font-weight: normal;">Harga kulakan</span>
                  </div>
                </div>

                <!-- Kolom 3: MOD Baru Auto -->
                <div>
                  <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #4F46E5; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">
                    MOD BARU (AUTO)
                  </label>
                  <div style="background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 8px; height: 44px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: 800; font-size: 1.25rem; color: #4F46E5; box-shadow: 0 1px 2px rgba(79, 70, 229, 0.08);">
                    {{ tambahStokForm.harga_baru_modal_satuan || '-' }}
                  </div>
                  <div style="font-size: 0.72rem; color: #6366F1; text-align: center; margin-top: 4px; font-weight: 600;">
                    ✨ Rumus MOD
                  </div>
                </div>
              </div>

              <!-- Baris Ringkasan Estimasi Pasokan -->
              <div v-if="tambahStokForm.harga_beli > 0 && tambahStokForm.jumlah_masuk > 0" style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="color: var(--text-muted);">Total Tagihan Pasokan:</span>
                <strong style="color: var(--color-primary); font-size: 1rem;">
                  Rp {{ formatNumber(tambahStokForm.harga_beli * tambahStokForm.jumlah_masuk) }}
                  <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">({{ tambahStokForm.jumlah_masuk }} unit)</span>
                </strong>
              </div>
            </div>

            <!-- Peringatan Jika Modal Baru > Harga Jual Saat Ini -->
            <div
              v-if="isTambahStokModalLebihTinggi"
              class="badge badge-danger"
              style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding: 10px 14px; border-radius: 8px; font-size: 0.825rem; line-height: 1.4; text-align: left;"
            >
              <AlertTriangle :size="18" style="flex-shrink: 0;" />
              <div>
                <strong>Peringatan Jual Rugi:</strong> Modal baru <strong>Rp {{ formatNumber(tambahStokForm.harga_beli) }}</strong> (Sandi: {{ tambahStokForm.harga_baru_modal_satuan }}) lebih tinggi dari Harga Jual saat ini (Rp {{ formatNumber(activeStockItem?.harga_jual) }}).
              </div>
            </div>

            <!-- Baris Input Jumlah Masuk & Tanggal -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="jumlah_masuk" style="font-weight: 700; font-size: 0.825rem; margin-bottom: 6px;">
                  Jumlah Masuk (Unit) <span style="color: red;">*</span>
                </label>
                <input
                  id="jumlah_masuk"
                  v-model.number="tambahStokForm.jumlah_masuk"
                  type="number"
                  class="form-input num"
                  min="1"
                  required
                  style="height: 42px; font-weight: 700;"
                />
                <p class="form-help" style="margin-top: 4px; font-size: 0.75rem;">
                  Total stok setelah masuk: <strong>{{ (activeStockItem?.stok_akhir || 0) + (tambahStokForm.jumlah_masuk || 0) }} unit</strong>
                </p>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="tanggal_masuk" style="font-weight: 700; font-size: 0.825rem; margin-bottom: 6px;">
                  Tanggal Transaksi <span style="color: red;">*</span>
                </label>
                <input
                  id="tanggal_masuk"
                  v-model="tambahStokForm.tanggal"
                  type="date"
                  class="form-input"
                  required
                  style="height: 42px;"
                />
                <p class="form-help" style="margin-top: 4px; font-size: 0.75rem;">Tanggal faktur pasokan.</p>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" @click="closeTambahStokModal" class="btn btn-secondary" style="padding: 10px 18px;">
              Batal
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              style="padding: 10px 22px; display: flex; align-items: center; gap: 8px; font-weight: 700;"
              :disabled="tambahStokSaving || !tambahStokForm.harga_beli || tambahStokForm.harga_beli <= 0 || tambahStokForm.jumlah_masuk <= 0"
            >
              <Check :size="16" />
              <span>{{ tambahStokSaving ? 'Menyimpan...' : 'Simpan & Tambah Stok' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import api from '../api';
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
  PackagePlus,
  Coins,
  Check,
  Truck
} from 'lucide-vue-next';

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

// Modal Tambah Stok: Cek MOD vs Harga Jual
const isTambahStokModalLebihTinggi = computed(() => {
  if (!activeStockItem.value) return false;
  const modal = tambahStokForm.harga_beli ? parseFloat(tambahStokForm.harga_beli) : modToHarga(tambahStokForm.harga_baru_modal_satuan);
  const jual = parseFloat(activeStockItem.value.harga_jual || 0);
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
const itemForm = reactive({
  nama_barang: '',
  kategori_id: '',
  merk: '',
  stok_awal: 0,
  harga_beli: 0,
  MOD: '',
  harga_jual: 0,
  keterangan: ''
});

// Modal Tambah Stok State
const showTambahStokModal = ref(false);
const activeStockItem = ref(null);
const tambahStokSaving = ref(false);
const tambahStokError = ref('');
const tambahStokForm = reactive({
  harga_beli: 0,
  harga_baru_modal_satuan: '',
  jumlah_masuk: 1,
  tanggal: new Date().toISOString().split('T')[0]
});

const onItemHargaBeliInput = () => {
  if (itemForm.harga_beli > 0) {
    itemForm.MOD = hargaToMod(itemForm.harga_beli);
  }
};

const onTambahStokHargaInput = () => {
  if (tambahStokForm.harga_beli > 0) {
    tambahStokForm.harga_baru_modal_satuan = hargaToMod(tambahStokForm.harga_beli);
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

const fetchCategories = async () => {
  try {
    const res = await api.get('/kategori');
    categories.value = res.data.data;
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
};

const fetchBarang = async () => {
  loading.value = true;
  const minDelay = new Promise(resolve => setTimeout(resolve, 400));
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
    pagination.totalPages = res.data.pagination.totalPages;
  } catch (err) {
    console.error('Failed to load items:', err);
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage) => {
  pagination.page = newPage;
  fetchBarang();
};

const openCreateModal = () => {
  editingId.value = null;
  itemForm.nama_barang = '';
  itemForm.kategori_id = categories.value.length > 0 ? categories.value[0].id : '';
  itemForm.merk = '';
  itemForm.stok_awal = 0;
  itemForm.harga_beli = 0;
  itemForm.MOD = '';
  itemForm.harga_jual = 0;
  itemForm.keterangan = '';
  itemModalError.value = '';
  showItemModal.value = true;
};

const openEditModal = (item) => {
  editingId.value = item.id;
  itemForm.nama_barang = item.nama_barang;
  itemForm.kategori_id = item.kategori_id;
  itemForm.merk = item.merk;
  itemForm.harga_beli = item.modal_harga_beli ? parseFloat(item.modal_harga_beli) : modToHarga(item.MOD || '');
  itemForm.MOD = item.MOD || '';
  itemForm.harga_jual = Number(item.harga_jual);
  itemForm.keterangan = item.keterangan || '';
  itemModalError.value = '';
  showItemModal.value = true;
};

const closeItemModal = () => {
  showItemModal.value = false;
};

const saveBarang = async () => {
  itemSaving.value = true;
  itemModalError.value = '';
  try {
    if (editingId.value) {
      await api.put(`/barang/${editingId.value}`, itemForm);
    } else {
      await api.post('/barang', itemForm);
    }
    closeItemModal();
    fetchBarang();
  } catch (err) {
    itemModalError.value = err.response?.data?.error || 'Gagal menyimpan barang.';
  } finally {
    itemSaving.value = false;
  }
};

const openTambahStokModal = (item) => {
  activeStockItem.value = item;
  tambahStokForm.harga_beli = item.modal_harga_beli ? parseFloat(item.modal_harga_beli) : modToHarga(item.MOD || '');
  tambahStokForm.harga_baru_modal_satuan = item.MOD || (tambahStokForm.harga_beli > 0 ? hargaToMod(tambahStokForm.harga_beli) : '');
  tambahStokForm.jumlah_masuk = 10;
  tambahStokForm.tanggal = new Date().toISOString().split('T')[0];
  tambahStokError.value = '';
  showTambahStokModal.value = true;
};

const closeTambahStokModal = () => {
  showTambahStokModal.value = false;
};

const submitTambahStok = async () => {
  if (!activeStockItem.value) return;
  tambahStokSaving.value = true;
  tambahStokError.value = '';
  try {
    await api.post(`/barang/${activeStockItem.value.id}/tambah-stok`, tambahStokForm);
    closeTambahStokModal();
    fetchBarang();
  } catch (err) {
    tambahStokError.value = err.response?.data?.error || 'Gagal menambahkan stok.';
  } finally {
    tambahStokSaving.value = false;
  }
};

const confirmDelete = async (item) => {
  if (confirm(`Apakah Anda yakin ingin menghapus atau mengarsipkan barang [${item.kode_barang}] ${item.nama_barang}?`)) {
    try {
      await api.delete(`/barang/${item.id}`);
      fetchBarang();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus barang.');
    }
  }
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString('id-ID');
};

onMounted(() => {
  fetchCategories();
  fetchBarang();
});
</script>
