/**
 * Rumus Sandi MOD Toko Listrik Citra 23 Palu
 * 
 * Tabel Konversi:
 * C = 1, D = 2, L = 3, S = 4, T = 5,
 * X = 6, A = 7, F = 8, Z = 9, B = 0
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
  if (digits.length === 3 && !digits.endsWith('0')) {
    return base * 100;
  }
  return base * 1000;
}

module.exports = {
  hargaToMod,
  modToHarga,
  DIGIT_TO_MOD,
  MOD_TO_DIGIT
};
