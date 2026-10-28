// Utility untuk mencegah modal tertutup otomatis saat user sedang mem-block / menyeleksi teks dengan mouse
// Masalah umum web: Saat user drag kursor mouse untuk block teks di dalam modal,
// jika mouse dilepas di luar modal (backdrop), browser memicu event click pada backdrop.
// Helper ini memastikan modal HANYA tertutup jika klik memang disengaja langsung di backdrop.

let isBackdropMouseDown = false;

export const onBackdropMouseDown = (e) => {
  isBackdropMouseDown = (e.target === e.currentTarget);
};

export const handleBackdropClick = (e, closeCallback) => {
  // 1. Jika ada teks yang sedang diblok/diseleksi di halaman, abaikan (jangan tutup modal)
  const selection = window.getSelection ? window.getSelection().toString() : '';
  if (selection && selection.trim().length > 0) {
    isBackdropMouseDown = false;
    return;
  }

  // 2. Hanya tutup jika mousedown dan mouseup/click keduanya berawal dari elemen backdrop langsung
  if (isBackdropMouseDown && e.target === e.currentTarget) {
    if (typeof closeCallback === 'function') {
      closeCallback();
    }
  }
  isBackdropMouseDown = false;
};
