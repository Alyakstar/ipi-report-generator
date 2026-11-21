# IPI Report Generator v5 — Navigation Update

Versi ini berbasis v4. Fitur form, tree diagram, visual drag-and-resize foto, signature, status INITIAL/FINAL, PDF A4, dan CRUD tetap dipertahankan.

## Perubahan
- Halaman awal langsung **Search Reports**.
- Tombol **Back to Search Reports** pada editor.
- Dialog **Unsaved Changes** ketika keluar dari editor yang sudah diubah, dengan pilihan Stay, Discard & Back, atau Save Report.
- Navbar Search Reports dan Create New IPI tetap responsif dengan hamburger menu di HP.
- File `src/main.jsx` dan `src/pdf.js` diformat ulang dengan pemisahan baris dan indentasi agar lebih mudah dibaca.

## Menjalankan di VS Code

```powershell
npm.cmd install
npm.cmd run dev
```

Buka URL localhost yang muncul di terminal. Tanpa kredensial Supabase, data tetap tersimpan di browser (localStorage), bukan tersinkron antarperangkat.

## Catatan
- File PDF dan visual editor tetap menggunakan implementasi v4. Perubahan v5 difokuskan pada navigasi dan format source code.
- Tombol **Save Report** pada dialog perubahan belum otomatis kembali ke Search; setelah menyimpan, user memilih ekspor PDF atau Later, kemudian dapat menekan Back.
- Belum ada pengujian browser/build lengkap pada lingkungan pembuatan ZIP.
