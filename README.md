# 🛡️ X-SENTINEL v2.5: Autonomous Multi-Node Engagement & Stealth Cockpit for X

> **X-SENTINEL** adalah sistem otomatisasi engagement enterprise untuk platform **X (Twitter)** berbasis **Playwright stealth engine**, **Multi-Node Account Rotation**, **Dedicated Proxy Tunneling**, **AI Contextual Auto-Replies (OpenRouter/Groq/Gemini/Ollama)**, **Bulk Fleet Onboarding & Export**, **Curated Multi-Niche Spintax Library**, serta **Cockpit UI (React 19 + TypeScript + Tailwind CSS + shadcn/ui + Recharts)**.

---

## 🌟 Fitur Utama (Core Capabilities)

### 1. 🛡️ Multi-Node Cluster & Proxy Tunneling
- **Zero-Password Authentication**: Otentikasi aman tanpa login password menggunakan session cookies (`auth_token` & `ct0`).
- **Dedicated Proxy Tunneling**: Dukungan proxy per node (`user:pass@ip:port`, `ip:port:user:pass`, `socks5://`).
- **🔒 Proxy Credential Masking**: Antarmuka hanya menampilkan `IP:Port` bersih untuk melindungi kerahasiaan kredensial.
- **⚡ Live Proxy Ping & GeoIP**: Uji latensi (ms), status hidup/mati, IP publik, dan ISP sebelum menjalankan tugas.
- **🟢 Realtime Online Status Indicator**: Badge status hijau emerald menyala dengan indikator denyut (*pulse dot*).
- **📥 Bulk Fleet Import**: Daftarkan puluhan akun sekaligus via teks multi-baris (`token:ct0:proxy:label` atau JSON).
- **📤 One-Click Fleet Export**: Cadangkan seluruh konfigurasi armada node ke file `.json` dengan 1 klik.

### 2. 🤖 AI-Powered Contextual Auto-Replies Engine
- **Multi-Provider LLM Integration**: Mendukung **OpenRouter**, **Groq (Ultra-Fast Inference)**, **OpenAI (GPT-4o/mini)**, **Google Gemini**, dan **Local Ollama** (*self-hosted*).
- **Context-Aware Sentiment & Topic Extraction**: Bot otomatis membaca isi tweet target dan meracik balasan alami, relevan, dan berbobot.
- **Smart Graceful Fallback**: Beralih otomatis ke pool Spintax/JSON jika kuota AI habis atau koneksi timeout.
- **Interactive AI Sandbox**: Uji koneksi dan respon AI secara langsung via tombol *⚡ Test AI Connection*.

### 3. 🎯 Target Engagement Workbench & Matrix Distribution
- **Batch URLs Execution**: Eksekusi serentak atau berurutan pada daftar URL tweet target.
- **Modular Interaction Vectors**: Aktifkan **❤️ Like**, **🔁 Repost / Retweet**, dan **💬 Comment** sesuai kebutuhan.
- **🔀 1-to-1 Unique JSON Reply Distribution**: Mendukung payload JSON `{ "topic": "...", "replies": [...] }` di mana setiap akun node memposting 1 balasan unik yang berbeda pada target tweet.
- **Dynamic Waiting & Smart Selectors**: Deteksi rendering DOM tweet modern untuk mencegah selector timeout.

### 4. 🌐 Curated Multi-Niche Spintax Library
- **5 Niche Industry Presets**:
  1. 🌐 **Web3, Crypto & DeFi Alpha** (English: TGE, Nodes, Base, Liquidity, Layer-2)
  2. 🤖 **AI & Autonomous Agents** (English: LLMs, Inference, Multi-Agent, Tooling)
  3. 💻 **Devs & SaaS Builders** (English: Architecture, Stacks, Velocity)
  4. 🇮🇩 **Indonesian Tech & Crypto Community** (Bahasa Indonesia)
  5. 🚀 **Viral Hooks & One-Liners** (Punchy Engagement)
- **1-Click Apply**: Muat template preset langsung ke *Fallback Stack* atau ke *Storage Payload* akun tertentu.

### 5. 📡 Feed Hunter Intelligence
- Radar pencarian otomatis postingan terkini berdasarkan kata kunci (*keywords*) atau hashtag.
- Menjalankan interaksi bertingkat langsung dari hasil tangkapan radar secara otomatis.

### 6. 📊 Telemetry & Growth Analytics (Recharts)
- **Activity Velocity (Area Chart)**: Tren kecepatan volume Like, Repost, dan Balasan.
- **Node Workload Share (Donut Chart)**: Visualisasi pembagian beban kerja antar node akun.
- Pelacak rasio keberhasilan (*Success Rate*) dan akumulasi volume interaksi.

### 7. 🔒 Anti-Ban Defense & Hardening Protocol
- **Stealth Browser Scripts**: Masking `navigator.webdriver`, WebGL GPU vendor spoofing, dan WebRTC IP leak shield.
- **Atomic File Writes**: Perlindungan data dengan penulisan file sementara (`.tmp`) + `fs.renameSync` untuk mencegah korupsi data JSON.
- **Natural Human Cadence**: Interval jeda acak (*jitter*), emulasi pengetikan manusia, dan simulasi scrolling acak.
- **Graceful Teardown**: Penutupan browser dan context Playwright yang aman saat proses dihentikan (*SIGINT/SIGTERM*).

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
│   ├── src/components/cockpit/ # Modular Domain Cockpit Decks (NodesGrid, Workbench, DefenseProtocol, etc.)
│   ├── src/lib/presetLibrary.ts # Curated Multi-Niche Spintax Templates (Web3, AI, Devs, Indo, Viral)
│   └── src/services/apiClient.ts # Type-safe REST & SSE Client
├── data/                       # Local JSON Storage (Git Ignored)
│   ├── accounts.json           # Cluster Akun Terdaftar
│   ├── comments/               # Isolated Payload Files per Node
│   ├── settings.json           # Defense, Anti-Ban & AI Config
│   ├── stats.json              # Cumulative System Metrics
│   └── history.json            # Immutable Interaction Ledger
├── server/
│   ├── automation/             # Playwright Bot, AIService, ProxyHelper, CookieManager, Spintax
│   ├── routes/api.js           # REST API Controller
│   ├── db.js                   # Atomic JSON Storage Engine
│   └── index.js                # Express Application Server & SSE Stream
├── test/                       # Automated Verification Test Suites
└── package.json
```

---

## 📜 Lisensi & Keamanan
Proyek ini dibuat untuk riset otomatisasi media sosial beretika. Seluruh data akun, cookie, dan riwayat interaksi disimpan secara lokal di komputer Anda tanpa dikirim ke server pihak ketiga mana pun.
