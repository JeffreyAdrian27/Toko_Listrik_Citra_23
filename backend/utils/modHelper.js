/**
 * Rumus Sandi MOD Toko Listrik Citra 23 Palu
 * 
 * Tabel Konversi:
 * C = 1, D = 2, L = 3, S = 4, T = 5,
 * X = 6, A = 7, F = 8, Z = 9, B = 0
 * 
 * Aturan: Nilai rupiah dibagi 100 (dua nol di belakang dihilangkan)
 * Contoh: 93.000 -> 930 -> ZLB, 9.300 -> 93 -> ZL, 54.000 -> 540 -> TSB, 5.400 -> 54 -> TS
 */

const DIGIT_TO_MOD = {
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

const MOD_TO_DIGIT = {
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

function hargaToMod(hargaBeli) {
  if (!hargaBeli || isNaN(hargaBeli) || Number(hargaBeli) <= 0) return '';
  const num = Math.round(Number(hargaBeli));
  const numStr = num.toString();
  let str = '';

  // Angka bulat ribuan berpola 1 digit awal diikuti nol saja (1.000 -> C, 5.000 -> T, 10.000 -> CB, 100.000 -> CBB)
  if (/^[1-9]000+$/.test(numStr)) {
    str = (num / 1000).toString();
  } else if (num % 100 === 0) {
    str = (num / 100).toString();
  } else if (num % 10 === 0) {
    str = (num / 10).toString();
  } else {
    str = num.toString();
  }

  return str.split('').map(d => DIGIT_TO_MOD[d] || '').join('');
}

function modToHarga(modKode) {
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
  // Digit tunggal atau berpola 1 digit diikuti nol saja (misal: '1' -> 1.000, '5' -> 5.000, '10' -> 10.000, '100' -> 100.000)
  if (/^[1-9]0*$/.test(digits)) {
    return base * 1000;
  }
  // Lainnya (misal: '93' -> 9.300, '930' -> 93.000, '54' -> 5.400, '540' -> 54.000)
  return base * 100;
}

module.exports = {
  hargaToMod,
  modToHarga,
  DIGIT_TO_MOD,
  MOD_TO_DIGIT
};
