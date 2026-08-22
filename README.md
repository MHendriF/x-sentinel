# 🛡️ X-SENTINEL: Autonomous Multi-Node Engagement & Stealth Cockpit for X

> **X-SENTINEL** adalah sistem otomatisasi engagement enterprise untuk platform **X (Twitter)** berbasis **Playwright stealth engine**, **Multi-Node Account Rotation**, **Dedicated Proxy Tunneling**, **Spintax / AI Reply Payloads**, dan **Cockpit UI (React 19 + TypeScript + Tailwind CSS + shadcn/ui + Recharts)**.

---

## 🌟 Fitur Utama (Core Surfaces)

1. **🛡️ Multi-Node & Proxy Management**:
   - Rotasi akun multi-node tanpa batas.
   - Dukungan autentikasi berbasis cookie aman (`auth_token` & `ct0`) tanpa password.
   - **Dedicated Proxy Tunneling** per node (`user:pass@ip:port`, `ip:port:user:pass`, `socks5://`).
   - **⚡ Live Proxy Ping & GeoIP**: Uji latensi (ms), status hidup/mati, IP publik, dan ISP sebelum menjalankan tugas.
   - **✨ Smart Cookie Extractor**: Ekstraksi instan dari string header cookie mentah maupun JSON.

2. **🎯 Target Engagement Workbench**:
   - Eksekusi serentak atau berurutan untuk daftar tweet target (*Batch URLs*).
   - Vektor interaksi modular: **❤️ Like**, **🔁 Repost / Retweet**, dan **💬 Custom Reply**.

3. **📡 Feed Hunter Intelligence**:
   - Radar pencarian otomatis postingan terkini berdasarkan kata kunci (*keywords*) atau hashtag.
   - Menjalankan interaksi bertingkat langsung dari hasil tangkapan radar.

4. **📊 Telemetry & Growth Analytics (Recharts)**:
   - Visualisasi tren kecepatan interaksi (*Activity Velocity Area Chart*).
   - Distribusi beban kerja antar node akun (*Node Workload Donut Chart*).
   - Pelacak rasio keberhasilan (*Success Rate*) dan akumulasi volume interaksi.

5. **🎲 Payload Bank & Spintax Generator**:
   - Kumpulan template komentar global dan terisolasi per akun (*JSON Payload Pool*).
   - Generator Spintax dengan ribuan permutasi kalimat alami anti-spam.

6. **🔒 Anti-Ban & Defense Protocol**:
   - Penundaan waktu acak antar-aksi (*Natural Jeda Delay*).
   - Emulasi pengetikan manusia per karakter (*human-like typing*) dan simulasi scroll.
   - Pemeriksaan duplikasi riwayat interaksi (*Audit Ledger*).

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat:
* Node.js versi 18+ atau 20+
* Browser Chromium (Playwright)

### 2. Instalasi & Menjalankan:
```bash
# Clone repository
git clone https://github.com/MHendriF/x-automation.git
cd x-automation

# Install dependencies root & client
npm install
cd client && npm install && npm run build && cd ..

# Jalankan server
npm start
```

Buka browser dan akses cockpit di: **`http://localhost:3000`**

---

## 📁 Arsitektur Direktori
```
x-automation/
├── client/                     # Frontend Cockpit (React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts)
│   ├── src/components/cockpit/ # Modular Domain Cockpit Decks
│   └── src/services/apiClient.ts # Type-safe REST & SSE Client
├── data/                       # Local JSON Document Storage (Git Ignored)
│   ├── accounts.json           # Cluster Akun Terdaftar
│   ├── comments/               # Isolated Payload Files per Node
│   ├── settings.json           # Defense & Anti-Ban Config
│   ├── stats.json              # Cumulative System Metrics
│   └── history.json            # Immutable Interaction Ledger
├── server/
│   ├── automation/             # Playwright Engine, ProxyHelper, CookieManager, Spintax
│   ├── routes/api.js           # REST API Controller
│   ├── db.js                   # JSON Storage Handler
│   └── index.js                # Express Application Server & SSE Stream
└── package.json
```

---

## 📜 Lisensi & Keamanan
Proyek ini dibuat untuk tujuan riset otomatisasi dan manajemen media sosial secara sah. Kredensial akun dan file data pribadi dilindungi secara lokal dan di-ignore oleh `.gitignore`.
