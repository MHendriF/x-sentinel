# X-AutoEngage: Tool Otomasi Engagement X (Twitter)
Otomasi Like, Retweet, dan Komentar Berbasis Cookie (`auth_token` & `ct0`) dengan Proteksi Anti-Ban dan Web Dashboard Modern.

---

## 🌟 Fitur Utama
- **Autentikasi Cookie Aman**: Gunakan `auth_token` dan `ct0` langsung tanpa perlu memasukkan password akun.
- **Engagement Lengkap**:
  - ❤️ **Auto Like**: Menyukai tweet target secara akurat.
  - 🔁 **Auto Retweet / Repost**: Me-repost postingan target.
  - 💬 **Smart Comment / Reply**: Mengirim balasan acak berbasis **Spintax** atau **AI Generated Reply** (Google Gemini / OpenAI).
- **Targeting Fleksibel**:
  - **Batch URLs**: Masukkan daftar URL postingan X (1 link per baris).
  - **Auto Hunter**: Cari postingan terkini berdasarkan kata kunci / hashtag tertentu.
- **Proteksi Anti-Ban & Human Behavior**:
  - Jeda acak (*random delay*) yang dapat diatur (contoh 15-40 detik).
  - Simulasi ketikan manusia per karakter dan scroll acak.
  - Anti-duplikasi riwayat interaksi.
- **Web Dashboard & Live Console**:
  - Dashboard modern bernuansa dark mode & glassmorphism.
  - Live log streaming via Server-Sent Events (SSE).
  - Riwayat interaksi lengkap dan statistik harian.

---

## 🚀 Cara Menjalankan

1. **Jalankan Aplikasi**:
   ```bash
   npm start
   ```
2. **Buka Web Dashboard**:
   Buka browser Anda dan akses: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Cara Mengambil `auth_token` & `ct0` dari Browser
1. Buka [https://x.com](https://x.com) di browser Anda dan pastikan sudah login.
2. Tekan tombol `F12` atau klik kanan lalu pilih **Inspect (Periksa)**.
3. Masuk ke tab **Application (Aplikasi)** -> pilih menu **Cookies** -> `https://x.com`.
4. Salin nilai (Value) dari `auth_token` dan `ct0`.
5. Tempelkan ke formulir di menu **Autentikasi Cookie** pada Dashboard Web dan klik **Verifikasi & Simpan Sesi**.

---

## 📁 Struktur Folder
```
x-automation/
├── data/               # Penyimpanan database lokal (settings, history, auth, templates)
├── public/             # Frontend Dashboard (HTML, CSS, JS)
├── server/
│   ├── automation/     # Engine Playwright, Cookie Manager, & Spintax
│   ├── routes/         # REST API routes
│   ├── config.js       # Konfigurasi sistem
│   ├── db.js           # Database handler JSON
│   ├── logger.js       # SSE Live logger
│   └── index.js        # Server Express
└── package.json
```
