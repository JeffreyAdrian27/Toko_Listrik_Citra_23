const pool = require('../config/db');

async function migrate() {
  try {
    console.log('Running migration for master_mod...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_mod (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_mod VARCHAR(50) NOT NULL UNIQUE,
        harga_beli DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        keterangan VARCHAR(255) NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nama_mod (nama_mod)
      ) ENGINE=InnoDB;
    `);

    console.log('Table master_mod created successfully!');

    // Seed default MODs based on existing items in Toko Citra 23
    const initialMods = [
      { nama_mod: 'X', harga_beli: 2500, keterangan: 'Aksesoris kecil / steker / konektor' },
      { nama_mod: 'T', harga_beli: 5000, keterangan: 'Fitting & saklar standar' },
      { nama_mod: 'CA', harga_beli: 15000, keterangan: 'Stop kontak arde & lampu LED mini' },
      { nama_mod: 'DT', harga_beli: 25000, keterangan: 'Lampu LED 12W / MCB 6A' },
      { nama_mod: 'CDS', harga_beli: 45000, keterangan: 'Lampu LED 18W / kabel roll 5M' },
      { nama_mod: 'CDL', harga_beli: 75000, keterangan: 'Kabel NYM 50M ecer / stop kontak box' },
      { nama_mod: 'TBA', harga_beli: 120000, keterangan: 'Lampu sorot LED / kabel roll 10M' }
    ];

    for (const m of initialMods) {
      await pool.query(
        `INSERT INTO master_mod (nama_mod, harga_beli, keterangan) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE harga_beli = VALUES(harga_beli), keterangan = VALUES(keterangan)`,
        [m.nama_mod, m.harga_beli, m.keterangan]
      );
    }

    console.log('Initial MODs seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
