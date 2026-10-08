const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const connection = await pool.getConnection();
  try {
    console.log('Seeding database Toko Citra 23 Palu (MOD Cipher & Notification Log)...');
    await connection.beginTransaction();

    // 1. Seed Users
    const adminPass = await bcrypt.hash('admin123', 10);
    const pegawaiPass = await bcrypt.hash('kasir123', 10);

    await connection.execute(`
      INSERT INTO users (nama, username, password_hash, role, is_active)
      VALUES 
        ('Administrator Citra 23', 'admin', ?, 'admin', 1),
        ('Kasir Siti Rahma', 'kasir1', ?, 'pegawai', 1),
        ('Staf Budi Santoso', 'budi', ?, 'pegawai', 1)
      ON DUPLICATE KEY UPDATE nama=VALUES(nama)
    `, [adminPass, pegawaiPass, pegawaiPass]);

    // Retrieve user IDs
    const [users] = await connection.execute('SELECT id, username, role FROM users');
    const adminUser = users.find(u => u.username === 'admin');
    const kasirUser = users.find(u => u.username === 'kasir1');

    // 2. Seed Categories
    const categories = [
      'Lampu & Bohlam',
      'Kabel & Pengkabelan',
      'Saklar & Stop Kontak',
      'MCB & Box Panel',
      'Pipa & Aksesoris',
      'Alat & Perkakas Listrik'
    ];

    for (const cat of categories) {
      await connection.execute(`
        INSERT INTO kategori (nama_kategori)
        VALUES (?)
        ON DUPLICATE KEY UPDATE nama_kategori=VALUES(nama_kategori)
      `, [cat]);
    }

    const [kategoris] = await connection.execute('SELECT id, nama_kategori FROM kategori');
    const catMap = {};
    kategoris.forEach(k => { catMap[k.nama_kategori] = k.id; });

    // 3. Seed Items (Barang) dengan kode MOD huruf rahasia (seperti di foto)
    const items = [
      {
        kode_barang: 'C23PHI00001',
        nama_barang: 'Philips LED MyCare 10W Putih (Cool Daylight)',
        kategori_id: catMap['Lampu & Bohlam'],
        merk: 'Philips',
        stok_awal: 40,
        total_masuk: 20,
        total_keluar: 12,
        stok_akhir: 48,
        MOD: 'CA', // Kode huruf MOD
        harga_jual: 38000,
        keterangan: 'Garansi resmi Philips 3 tahun'
      },
      {
        kode_barang: 'C23PHI00002',
        nama_barang: 'Philips LED MyCare 14W Putih (Cool Daylight)',
        kategori_id: catMap['Lampu & Bohlam'],
        merk: 'Philips',
        stok_awal: 30,
        total_masuk: 10,
        total_keluar: 6,
        stok_akhir: 34,
        MOD: 'DT', // Kode huruf MOD
        harga_jual: 49000,
        keterangan: 'Fitting E27 standard'
      },
      {
        kode_barang: 'C23PAN00001',
        nama_barang: 'Panasonic Saklar Tunggal Wide Series (WEJ 5531)',
        kategori_id: catMap['Saklar & Stop Kontak'],
        merk: 'Panasonic',
        stok_awal: 50,
        total_masuk: 30,
        total_keluar: 15,
        stok_akhir: 65,
        MOD: 'CDS', // Kode huruf MOD
        harga_jual: 24000,
        keterangan: 'Warna putih salju, inbow'
      },
      {
        kode_barang: 'C23PAN00002',
        nama_barang: 'Panasonic Stop Kontak Arde Wide Series (WEJ 1121-7)',
        kategori_id: catMap['Saklar & Stop Kontak'],
        merk: 'Panasonic',
        stok_awal: 60,
        total_masuk: 40,
        total_keluar: 22,
        stok_akhir: 78,
        MOD: 'CDL', // Kode huruf MOD
        harga_jual: 29500,
        keterangan: 'Kuat & anti panas'
      },
      {
        kode_barang: 'C23SCH00001',
        nama_barang: 'Schneider MCB Domae 1 Pole 10A (DOM11124SNI)',
        kategori_id: catMap['MCB & Box Panel'],
        merk: 'Schneider',
        stok_awal: 25,
        total_masuk: 15,
        total_keluar: 8,
        stok_akhir: 32,
        MOD: 'TBA', // Kode huruf MOD
        harga_jual: 62000,
        keterangan: 'Standar PLN 2200VA'
      },
      {
        kode_barang: 'C23SCH00002',
        nama_barang: 'Schneider MCB Domae 1 Pole 6A (DOM11122SNI)',
        kategori_id: catMap['MCB & Box Panel'],
        merk: 'Schneider',
        stok_awal: 20,
        total_masuk: 10,
        total_keluar: 4,
        stok_akhir: 26,
        MOD: 'CSC', // Kode huruf MOD
        harga_jual: 59000,
        keterangan: 'Standar PLN 1300VA'
      },
      {
        kode_barang: 'C23SUP00001',
        nama_barang: 'Supreme Kabel NYM 2x1.5 mm² (50 Meter)',
        kategori_id: catMap['Kabel & Pengkabelan'],
        merk: 'Supreme',
        stok_awal: 10,
        total_masuk: 5,
        total_keluar: 3,
        stok_akhir: 12,
        MOD: 'CXF', // Kode huruf MOD
        harga_jual: 335000,
        keterangan: 'Tembaga murni bersertifikat SNI'
      },
      {
        kode_barang: 'C23NN00001',
        nama_barang: 'Isolasi Listrik PVC Hitam 18mm x 10m',
        kategori_id: catMap['Alat & Perkakas Listrik'],
        merk: '',
        stok_awal: 100,
        total_masuk: 50,
        total_keluar: 45,
        stok_akhir: 105,
        MOD: 'T', // Kode huruf MOD
        harga_jual: 6000,
        keterangan: 'Daya rekat kuat'
      },
      {
        kode_barang: 'C23NN00002',
        nama_barang: 'Tespen Obeng Indikator Tegangan Listrik AC',
        kategori_id: catMap['Alat & Perkakas Listrik'],
        merk: '',
        stok_awal: 15,
        total_masuk: 0,
        total_keluar: 11,
        stok_akhir: 4,
        MOD: 'X', // Kode huruf MOD
        harga_jual: 14000,
        keterangan: '100V - 500V (Stok menipis)'
      }
    ];

    for (const it of items) {
      await connection.execute(`
        INSERT INTO barang (
          \`MOD\`, kode_barang, nama_barang, kategori_id, merk,
          stok_awal, total_masuk, total_keluar, stok_akhir, harga_jual, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nama_barang=VALUES(nama_barang),
          \`MOD\`=VALUES(\`MOD\`),
          harga_jual=VALUES(harga_jual),
          stok_akhir=VALUES(stok_akhir)
      `, [
        it.MOD, it.kode_barang, it.nama_barang, it.kategori_id, it.merk,
        it.stok_awal, it.total_masuk, it.total_keluar, it.stok_akhir, it.harga_jual, it.keterangan
      ]);
    }

    // 4. Sample Pembelian (Tabel Harga Lama & Harga Baru Modal Satuan dengan kode huruf MOD)
    const [insertedBarang] = await connection.execute('SELECT id, kode_barang, nama_barang, `MOD` FROM barang');
    const philips = insertedBarang.find(b => b.kode_barang === 'C23PHI00001');
    const panasonic = insertedBarang.find(b => b.kode_barang === 'C23PAN00001');

    if (philips) {
      await connection.execute(`
        INSERT INTO pembelian (
          barang_id, kode_barang, nama_barang, harga_lama,
          harga_baru_modal_satuan, jumlah_masuk, total_pembayaran,
          tanggal, created_by
        ) VALUES (?, ?, ?, 'T', 'CA', 20, 0, CURDATE(), ?)
      `, [philips.id, philips.kode_barang, philips.nama_barang, adminUser.id]);
    }

    if (panasonic) {
      await connection.execute(`
        INSERT INTO pembelian (
          barang_id, kode_barang, nama_barang, harga_lama,
          harga_baru_modal_satuan, jumlah_masuk, total_pembayaran,
          tanggal, created_by
        ) VALUES (?, ?, ?, 'CDS', 'CDL', 30, 0, CURDATE(), ?)
      `, [panasonic.id, panasonic.kode_barang, panasonic.nama_barang, adminUser.id]);
    }

    // 5. Seed Activity Logs (Untuk Notifikasi Ikon Lonceng)
    await connection.execute(`
      INSERT INTO activity_log (tipe, judul, detail, created_at, is_read)
      VALUES 
        ('barang', 'Barang Baru Ditambahkan', 'Barang [C23PHI00001] Philips LED MyCare 10W berhasil didaftarkan.', NOW() - INTERVAL 1 HOUR, 0),
        ('pembelian', 'Pembelian / Stok Baru', 'Pasokan 30 unit [C23PAN00001] masuk. Harga Baru Modal: CDL (Lama: CDS)', NOW() - INTERVAL 35 MINUTE, 0),
        ('penjualan', 'Penjualan Baru Berhasil', 'Kasir Siti Rahma mencatat penjualan 2x [C23PHI00001] (Total: Rp 76.000)', NOW() - INTERVAL 12 MINUTE, 0)
    `);

    await connection.commit();
    console.log('Seed berhasil diselesaikan!');
  } catch (err) {
    await connection.rollback();
    console.error('Seed gagal:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seed();
