import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Layers,
  Crosshair,
  Radar,
  BarChart3,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
  Terminal,
  Cpu,
  Zap,
  Globe,
  Database,
  Code2,
  ExternalLink,
  Sparkles,
  Lock,
} from 'lucide-react';

export const AboutDeck: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-8">
      {/* Hero Banner Card */}
      <Card className="relative overflow-hidden border-flame/40 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-obsidian-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-flame/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <CardContent className="p-6 sm:p-8 relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1.5 px-3 py-1 font-mono text-[11px] font-bold shadow-md">
              <Shield className="w-3.5 h-3.5" />
              X-SENTINEL CORE v2.5
            </Badge>
            <Badge variant="outline" className="text-slate-400 font-mono text-[11px]">
              REACT 19 · PLAYWRIGHT STEALTH · ZERO-CONFIG JSON DB
            </Badge>
          </div>

          <div className="space-y-2 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white">
              Autonomous Multi-Node Engagement &amp; Stealth Cockpit
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong>X-SENTINEL</strong> adalah sistem otomasi interaksi terintegrasi (*engagement cockpit*) 
              yang dirancang khusus untuk platform <strong>X (Twitter)</strong>. Menggabungkan arsitektur rotasi 
              multi-akun (*node cluster*), isolasi tunnel proxy dedicated, kecerdasan pencarian konten (*Feed Hunter*), 
              generator variasi balasan (*Spintax*), dan telemetri analitik visual tanpa ketergantungan database eksternal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-obsidian-950/80 px-3 py-1.5 rounded-md border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Zero-Password Auth (Cookie Based)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-obsidian-950/80 px-3 py-1.5 rounded-md border border-slate-800">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>Multi-Proxy GeoIP Testing</span>
            </div>
            <div className="flex items-center gap-1.5 bg-obsidian-950/80 px-3 py-1.5 rounded-md border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Anti-Ban Human Cadence</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Features Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-flame tracking-wider">
          <Sparkles className="w-4 h-4" />
          MODULAR COCKPIT SURFACES &amp; CAPABILITIES
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Feature 1 */}
          <Card className="bg-obsidian-850 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-flame mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Multi-Node &amp; Proxy Cluster</CardTitle>
              <CardDescription className="text-xs">
                Manajemen akun terdesentralisasi dengan keamanan tingkat tinggi.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300 space-y-2 font-sans">
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>Otentikasi aman via cookie <code>auth_token</code> &amp; <code>ct0</code> tanpa login password.</li>
                <li>Dukungan proxy dedicated format <code>user:pass@ip:port</code>, <code>ip:port:user:pass</code>, dan <code>socks5://</code>.</li>
                <li><strong>Live Proxy Ping &amp; GeoIP</strong> untuk mengecek latensi (ms), negara, dan ISP.</li>
                <li><strong>Smart Paste Extractor</strong> untuk membaca header cookie langsung dari Network DevTools.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="bg-obsidian-850 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-2">
                <Crosshair className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Target Engagement Workbench</CardTitle>
              <CardDescription className="text-xs">
                Eksekutor interaksi berurutan pada daftar URL tweet target.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300 space-y-2 font-sans">
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>Input batch multi-line URL tweet dari berbagai sumber.</li>
                <li>Pilihan aksi modular: <strong>Like</strong>, <strong>Repost / Retweet</strong>, dan <strong>Reply Komentar</strong>.</li>
                <li>Rotasi antar node akun secara seimbang untuk mendistribusikan beban.</li>
                <li>Indikator status progres interaktif real-time.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="bg-obsidian-850 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                <Radar className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Feed Hunter Intelligence</CardTitle>
              <CardDescription className="text-xs">
                Radar pemindaian otomatis postingan trending berdasarkan kata kunci.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300 space-y-2 font-sans">
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>Pencarian postingan terbaru berdasarkan kata kunci (*keywords*) atau hashtag.</li>
                <li>Penyaringan postingan teratas dan teranyar secara dinamis.</li>
                <li>Eksekusi Like, Repost, dan Balasan langsung dari hasil temuan radar secara otomatis.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="bg-obsidian-850 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <BarChart3 className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Telemetry &amp; Growth Analytics</CardTitle>
              <CardDescription className="text-xs">
                Dasbor visualisasi performa dan analitik interaksi berbasis Recharts.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300 space-y-2 font-sans">
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li><strong>Activity Velocity (Area Chart)</strong>: Tren harian volume Like, Repost, dan Balasan.</li>
                <li><strong>Node Workload Share (Donut Chart)</strong>: Pembagian proporsi eksekusi per node akun.</li>
                <li><strong>Cumulative Vector Totals</strong>: Bar chart komparatif total interaksi.</li>
                <li>Metrik KPI: Total eksekusi, Success Rate (%), dan rasio kesehatan akun.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 5 */}
          <Card className="bg-obsidian-850 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                <Sliders className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Payload Bank &amp; Spintax Engine</CardTitle>
              <CardDescription className="text-xs">
                Generator variasi teks balasan alami anti-duplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300 space-y-2 font-sans">
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>Sistem isolasi file komentar per akun (<code>data/comments/comments_*.json</code>).</li>
                <li>Engine Spintax multi-level berformat <code>{'{Keren|Mantap|Top}'}</code>.</li>
                <li>Live Permutation Previewer untuk menguji ribuan variasi kalimat secara instan.</li>
                <li>Dukungan fallback ke AI Reply Generator (Gemini / OpenAI).</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 6 */}
          <Card className="bg-obsidian-850 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Anti-Ban Defense Protocol</CardTitle>
              <CardDescription className="text-xs">
                Perlindungan bot detection dengan emulasi perilaku manusia alami.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300 space-y-2 font-sans">
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>Interval jeda acak (*natural randomized delay*) yang dapat diatur secara presisi.</li>
                <li>Emulasi pengetikan per karakter (*human-like typing cadence*) dan simulasi scroll.</li>
                <li>Batas eksekusi per jam (*hourly limit*) dan per hari (*daily limit*).</li>
                <li>Buku besar riwayat audit (*Audit Ledger*) untuk mencegah duplikasi interaksi.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tech Stack & Architecture Specs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="font-mono text-[10px] font-bold text-flame tracking-wider">SYSTEM SPECIFICATIONS</div>
          <CardTitle className="text-lg">Technology Stack &amp; Architectural Foundations</CardTitle>
          <CardDescription>
            Dirancang dengan fondasi teknologi modern untuk kecepatan, stabilitas, dan portabilitas tinggi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-lg bg-obsidian-850 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-white">
                <Code2 className="w-4 h-4 text-flame" />
                Frontend Cockpit
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>• React 19 (Latest)</div>
                <div>• TypeScript &amp; Vite 6</div>
                <div>• Tailwind CSS v3</div>
                <div>• shadcn/ui &amp; Radix Primitives</div>
                <div>• Recharts Data Visualization</div>
                <div>• Zustand Reactive State</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-obsidian-850 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-white">
                <Cpu className="w-4 h-4 text-purple-400" />
                Automation Backend
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>• Node.js &amp; Express 5</div>
                <div>• Microsoft Playwright Engine</div>
                <div>• Stealth Context Emulation</div>
                <div>• Server-Sent Events (SSE) Stream</div>
                <div>• SOCKS5 &amp; HTTP Tunneling</div>
                <div>• Spintax Recursive Parser</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-obsidian-850 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-white">
                <Database className="w-4 h-4 text-emerald-400" />
                Storage &amp; Privacy
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>• Zero-Dependency JSON DB</div>
                <div>• Synchronous Atomic File I/O</div>
                <div>• Isolated Payload Pool Directory</div>
                <div>• Git-Ignored Kredensial Lokal</div>
                <div>• Starter Template Examples</div>
                <div>• 100% On-Premise Data Sovereignty</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety & Compliance Notice */}
      <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-slate-300 font-mono flex items-start gap-3">
        <Lock className="w-4 h-4 text-flame shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-amber-300 font-bold block">Prinsip Keamanan &amp; Kedaulatan Data:</strong>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Seluruh data akun, cookie autentikasi, dan catatan interaksi disimpan secara eksklusif pada komputer lokal Anda di folder <code>data/</code>. 
            X-SENTINEL tidak mengirimkan kredensial atau riwayat bot Anda ke server pihak ketiga mana pun.
          </p>
        </div>
      </div>
    </div>
  );
};
