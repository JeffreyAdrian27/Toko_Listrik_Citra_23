/**
 * Rumus Sandi MOD Toko Listrik Citra 23 Palu
 * 
 * Tabel Konversi:
 * C = 1, D = 2, L = 3, S = 4, T = 5,
 * X = 6, A = 7, F = 8, Z = 9, B = 0
 * 
 * Aturan Nol di Belakang:
 * - Kelipatan 1.000 (contoh: 54.000 -> 54 -> TS, 20.000 -> 20 -> DB, 5.000 -> 5 -> T)
 * - Kelipatan 100   (contoh: 50.500 -> 505 -> TBT, 1.500 -> 15 -> CT)
 */

export const MOD_CIPHER_TABLE = [
  { kode: 'C', nilai: 1 },
  { kode: 'D', nilai: 2 },
  { kode: 'L', nilai: 3 },
  { kode: 'S', nilai: 4 },
  { kode: 'T', nilai: 5 },
  { kode: 'X', nilai: 6 },
  { kode: 'A', nilai: 7 },
  { kode: 'F', nilai: 8 },
  { kode: 'Z', nilai: 9 },
  { kode: 'B', nilai: 0 }
];

export const DIGIT_TO_MOD = {
  '1': 'C',
  '2': 'D',
  '3': 'L',
  '4': 'S',
  '5': 'T',
  '6': 'X',
  '7': 'A',
  '8': 'F',
  '9': 'Z',
  '0': 'B'
};

export const MOD_TO_DIGIT = {
  'C': '1',
  'D': '2',
  'L': '3',
  'S': '4',
  'T': '5',
  'X': '6',
  'A': '7',
  'F': '8',
  'Z': '9',
  'B': '0'
};

/**
 * Menghitung Kode MOD dari Harga Beli (Rp)
 * @param {number|string} hargaBeli 
 * @returns {string} Kode MOD (uppercase)
 */
export function hargaToMod(hargaBeli) {
  if (!hargaBeli || isNaN(hargaBeli) || Number(hargaBeli) <= 0) return '';
  const num = Math.round(Number(hargaBeli));
  let str = num.toString();

  if (num % 1000 === 0) {
    str = (num / 1000).toString();
  } else if (num % 100 === 0) {
    str = (num / 100).toString();
  } else if (num % 10 === 0) {
    str = (num / 10).toString();
  }

  return str.split('').map(d => DIGIT_TO_MOD[d] || '').join('');
}

/**
 * Menghitung perkiraan Harga Beli (Rp) dari Kode MOD
 * @param {string} modKode 
 * @returns {number}
 */
export function modToHarga(modKode) {
  if (!modKode || typeof modKode !== 'string') return 0;
  const clean = modKode.trim().toUpperCase();
  let digits = '';
  for (const ch of clean) {
    if (MOD_TO_DIGIT[ch] !== undefined) {
      digits += MOD_TO_DIGIT[ch];
    } else {
      return 0;
    }
  }
  if (!digits) return 0;
  const base = parseInt(digits, 10);
  
  // Jika 3 digit dan tidak berakhiran '0', perkiraan ratusan (* 100) seperti 505 -> 50.500
  if (digits.length === 3 && !digits.endsWith('0')) {
    return base * 100;
  }
  // Default adalah ribuan (* 1000)
  return base * 1000;
}
