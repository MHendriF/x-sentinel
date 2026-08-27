import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TerminalConsole } from './TerminalConsole';
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  Bot,
  Zap,
  Sliders,
  Layers,
  ShieldCheck,
  FileText,
  AlertCircle,
  Hash,
  Globe,
  Flame,
  ArrowRight,
  Lightbulb,
  Terminal,
  Square,
  ChevronRight,
} from 'lucide-react';

const STYLE_OPTIONS = [
  {
    id: 'viral_hook',
    label: '🔥 Viral Hook',
    desc: 'Punchy & contrarian opening, short & high engagement',
    color: 'border-flame/50 text-amber-300 bg-flame/10',
  },
  {
    id: 'alpha_insight',
    label: '💡 Alpha Insight',
    desc: 'Deep crypto/tech analysis, data & trend observation',
    color: 'border-blue-500/50 text-blue-300 bg-blue-500/10',
  },
  {
    id: 'educational_mini',
    label: '📊 Mini Value-Drop',
    desc: '2-3 actionable bullet takeaways for builders & traders',
    color: 'border-emerald/50 text-emerald bg-emerald/10',
  },
  {
    id: 'story_builder',
    label: '🛠️ Founder / Builder Story',
    desc: 'Authentic build-in-public & casual first-person journey',
    color: 'border-purple-500/50 text-purple-300 bg-purple-500/10',
  },
  {
    id: 'indo_community',
    label: '🇮🇩 Komunitas Indo Tech',
    desc: 'Bahasa Indonesia santai, relate, & native komunitas X ID',
    color: 'border-rose-500/50 text-rose-300 bg-rose-500/10',
  },
];

const PRESET_KEYWORDS = [
  { label: '🌐 Solana Ecosystem', kw: 'Solana DeFi throughput & ecosystem velocity' },
  { label: '🤖 AI Autonomous Agents', kw: 'AI autonomous multi-agent systems and onchain execution' },
  { label: '⚡ Ethereum L2 / Rollups', kw: 'Layer 2 scaling, Arbitrum, Base, and rollup economics' },
  { label: '🚀 Memecoin Meta', kw: 'Memecoin narrative, liquidity rotation & risk management' },
  { label: '💻 Web Dev Velocity', kw: 'Modern web architecture, React 19, TypeScript, and developer velocity' },
  { label: '🇮🇩 Komunitas Web3 Indo', kw: 'Perkembangan Web3 dan developer crypto di Indonesia' },
];

export const PostStudio: React.FC = () => {
  const { accounts, settings, loadSettings, setActiveTab, isRunning } = useStore();

  // Ensure settings are loaded when PostStudio mounts
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Generator State
  const [keyword, setKeyword] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('viral_hook');
  const [language, setLanguage] = useState<'en' | 'id'>('en');
  const [variationCount, setVariationCount] = useState(3);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // AI Output State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<string[]>([]);
  const [activeProviderUsed, setActiveProviderUsed] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Composer & Dispatcher State
  const [activeDraftText, setActiveDraftText] = useState('');
  const [selectedAccountMode, setSelectedAccountMode] = useState<'all' | 'single'>('all');
  const [singleAccountId, setSingleAccountId] = useState<string>('');
  const [switchDelaySec, setSwitchDelaySec] = useState(15);
  const [isPublishing, setIsPublishing] = useState(false);

  const activeAccounts = accounts.filter(a => a.enabled !== false);
  const selectedAccount = accounts.find(a => a.id === singleAccountId) || activeAccounts[0] || accounts[0];

  const charCount = activeDraftText.length;
  const charLimit = 280;
  const isOverLimit = charCount > charLimit;

  // Compute active AI Provider details
  const hasConfiguredAI = Boolean(
    settings?.aiProvider &&
    settings.aiProvider !== 'none' &&
    settings?.aiApiKey &&
    settings.aiApiKey.trim().length > 0
  );
  const aiProviderName = (settings?.aiProvider || 'none').toUpperCase();
  const aiModelName = settings?.aiModel;

  // Handle AI Post Generation
  const handleGenerate = async () => {
    if (!keyword.trim()) {
      toast.error('Silakan masukkan kata kunci atau topik terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    setGeneratedDrafts([]);

    try {
      const res = await apiClient.generateAIPost({
        keyword: keyword.trim(),
        style: selectedStyle,
        language: selectedStyle === 'indo_community' ? 'id' : language,
        count: variationCount,
        customPrompt: customPrompt.trim(),
      });

      if (res.success && res.posts && res.posts.length > 0) {
        // Enforce single-line text format: replace newlines with single space and collapse extra spaces
        const singleLinePosts = res.posts.map((p) =>
          p.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
        );
        setGeneratedDrafts(singleLinePosts);
        setActiveProviderUsed(res.provider || 'AI Engine');
        // Auto-select first draft into composer
        setActiveDraftText(singleLinePosts[0]);
        toast.success(`Berhasil membuat ${singleLinePosts.length} variasi draf postingan (single line)!`, {
          description: res.isFallback ? 'Dibuat dengan Fallback Template (AI API offline)' : `Inference via ${res.provider}`,
        });
      } else {
        toast.error(res.message || 'Gagal membuat postingan dengan AI.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Stop Task
  const handleStop = async () => {
    try {
      const res = await apiClient.stopTask();
      if (res.success) {
        toast.warning('Mengirim sinyal penghentian proses...');
      }
    } catch (err: any) {
      toast.error(`Gagal menghentikan tugas: ${err.message}`);
    }
  };

  // Handle Copy Draft Text
  const handleCopyDraft = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Draf disalin ke clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Handle Dispatch / Publish to Fleet
  const handlePublish = async () => {
    if (!activeDraftText.trim()) {
      toast.error('Konten postingan tidak boleh kosong.');
      return;
    }

    if (isOverLimit) {
      toast.error(`Karakter melebihi batas Twitter (${charCount}/${charLimit}). Silakan ringkas teks.`);
      return;
    }

    if (activeAccounts.length === 0) {
      toast.error('Tidak ada akun node yang aktif. Silakan tambahkan atau aktifkan akun di menu Multi-Node.');
      return;
    }

    setIsPublishing(true);
    try {
      const accountIds = selectedAccountMode === 'all' ? 'all' : [singleAccountId || activeAccounts[0].id];
      
      // If multi-account and multiple generated drafts available, distribute unique draft to each node
      let postsToPublish: string[] = [activeDraftText];
      if (selectedAccountMode === 'all' && generatedDrafts.length > 1) {
        postsToPublish = generatedDrafts;
      }

      const res = await apiClient.startPostTask({
        accountIds,
        posts: postsToPublish,
        delaySeconds: switchDelaySec,
      });

      if (res.success) {
        toast.success('🚀 Tugas publikasi postingan berhasil diluncurkan!', {
          description: `Memposting ke ${selectedAccountMode === 'all' ? `${activeAccounts.length} node akun` : `@${selectedAccount?.username || selectedAccount?.label}`}.`,
        });
      } else {
        toast.error(res.message || 'Gagal memulai publikasi postingan.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-xl border border-border/80 bg-gradient-to-r from-obsidian-850 via-obsidian-800 to-obsidian-850 p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-flame/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-flame/15 border border-flame/30 flex items-center justify-center text-flame shadow-inner">
                <Sparkles className="w-4 h-4" />
              </div>
              <h1 className="font-heading font-bold text-xl text-white tracking-tight flex items-center gap-2">
                AI Post Studio & Fleet Publisher
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald/20 text-emerald border border-emerald/30">
                  NEW v3.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Racik konten postingan berkelas, anti-AI-slop & high-engagement berdasarkan kata kunci, lalu publikasikan langsung ke armada node akun X Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Clickable AI Provider Quick Badge */}
            <button
              type="button"
              onClick={() => setActiveTab('tab-ai')}
              title="Klik untuk mengubah atau menguji konfigurasi AI"
              className={cn(
                'rounded-lg border px-3 py-2 text-right transition-all group flex flex-col items-end',
                hasConfiguredAI
                  ? 'bg-obsidian-900/90 hover:bg-obsidian-850 border-purple-500/40 hover:border-purple-400/80 text-white shadow-sm'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
              )}
            >
              <div className="font-mono text-[9px] text-slate-400 group-hover:text-flame uppercase flex items-center gap-1">
                <span>AI Provider Aktif</span>
                <Sliders className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="font-mono text-xs font-bold text-flame flex items-center gap-1.5 mt-0.5">
                <Bot className={cn('w-3.5 h-3.5', hasConfiguredAI ? 'text-purple-400' : 'text-amber-400')} />
                <span>{hasConfiguredAI ? aiProviderName : (settings?.aiProvider ? `${aiProviderName} (No Key)` : 'FALLBACK TEMPLATE')}</span>
                {hasConfiguredAI && aiModelName && (
                  <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                    ({aiModelName})
                  </span>
                )}
              </div>
            </button>

            {/* Active Fleet Badge */}
            <button
              type="button"
              onClick={() => setActiveTab('tab-accounts')}
              title="Klik untuk mengelola Akun Node"
              className="rounded-lg bg-obsidian-900/80 hover:bg-obsidian-850 border border-border/60 hover:border-emerald/40 px-3 py-2 text-right transition-all group flex flex-col items-end"
            >
              <div className="font-mono text-[9px] text-slate-500 group-hover:text-emerald uppercase flex items-center gap-1">
                <span>Active Fleet</span>
                <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="font-mono text-xs font-bold text-emerald flex items-center justify-end gap-1.5 mt-0.5">
                <Layers className="w-3.5 h-3.5" />
                {activeAccounts.length} Nodes
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator Controls & Topic Engine (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Card: Topic & Persona Config */}
          <div className="rounded-xl border border-border/80 bg-obsidian-850 p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Zap className="w-4 h-4 text-flame" />
                <span>1. Konfigurasi Topik & AI Style</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Step 1</span>
            </div>

            {/* Keyword Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Kata Kunci / Topik Postingan:</span>
                <span className="text-[10px] text-slate-500 font-mono">Wajib</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="Contoh: Solana Layer 2, AI Agents, React 19, Memecoin..."
                  className="w-full rounded-lg bg-obsidian-900 border border-border/80 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-flame focus:ring-1 focus:ring-flame transition-all"
                />
              </div>
            </div>

            {/* Trending Quick Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                Quick Keyword Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_KEYWORDS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setKeyword(item.kw);
                      if (item.label.includes('Indo')) {
                        setSelectedStyle('indo_community');
                        setLanguage('id');
                      }
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-obsidian-800 hover:bg-obsidian-750 border border-border/60 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone / Persona Selector */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-medium text-slate-300">Pilih Gaya Bahasa & Persona:</label>
              <div className="grid grid-cols-1 gap-2">
                {STYLE_OPTIONS.map((style) => {
                  const isSelected = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(style.id);
                        if (style.id === 'indo_community') {
                          setLanguage('id');
                        }
                      }}
                      className={cn(
                        'flex flex-col text-left p-2.5 rounded-lg border transition-all',
                        isSelected
                          ? cn('border-l-4 shadow-sm', style.color)
                          : 'border-border/60 bg-obsidian-900/60 hover:bg-obsidian-800 text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{style.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-flame" />}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">{style.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language & Variation Count Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  Bahasa:
                </label>
                <div className="grid grid-cols-2 gap-1 bg-obsidian-900 p-1 rounded-lg border border-border/60 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={cn(
                      'py-1 rounded font-medium transition-all text-center',
                      language === 'en' ? 'bg-flame text-obsidian-950 font-bold' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('id')}
                    className={cn(
                      'py-1 rounded font-medium transition-all text-center',
                      language === 'id' ? 'bg-flame text-obsidian-950 font-bold' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Bahasa ID
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" />
                  Variasi Draf:
                </label>
                <div className="grid grid-cols-3 gap-1 bg-obsidian-900 p-1 rounded-lg border border-border/60 text-[11px]">
                  {[1, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setVariationCount(cnt)}
                      className={cn(
                        'py-1 rounded font-mono font-medium transition-all text-center',
                        variationCount === cnt ? 'bg-flame text-obsidian-950 font-bold' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      {cnt}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Prompt Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <Sliders className="w-3 h-3 text-flame" />
                <span>{showAdvanced ? 'Sembunyikan Custom Prompt' : '+ Kustomisasi Prompt Tambahan'}</span>
              </button>

              {showAdvanced && (
                <div className="mt-2 animate-in fade-in duration-200">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Instruksi tambahan untuk AI (misal: 'Sertakan analogi tentang mobil F1' atau 'Buat nada agak sarkas')..."
                    rows={2}
                    className="w-full rounded-lg bg-obsidian-900 border border-border/80 p-2.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-flame"
                  />
                </div>
              )}
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !keyword.trim()}
              className={cn(
                'w-full mt-2 py-3 rounded-lg font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md',
                isGenerating || !keyword.trim()
                  ? 'bg-obsidian-800 text-slate-500 cursor-not-allowed border border-border/50'
                  : 'bg-gradient-to-r from-flame via-amber-500 to-flame text-obsidian-950 hover:brightness-110 active:scale-[0.99]'
              )}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Meracik Draf Konten dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ Generate {variationCount} Draf Postingan AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Variations Gallery, Live Preview & Fleet Publisher (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Section: Generated Draft Variations */}
          <div className="rounded-xl border border-border/80 bg-obsidian-850 p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="w-4 h-4 text-emerald" />
                <span>2. Hasil Variasi Draf Postingan</span>
              </div>
              {activeProviderUsed && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald/10 text-emerald border border-emerald/30">
                  {activeProviderUsed}
                </span>
              )}
            </div>

            {generatedDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 bg-obsidian-900/50 p-8 text-center flex flex-col items-center justify-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-obsidian-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Sparkles className="w-5 h-5 text-flame opacity-70" />
                </div>
                <div className="text-xs font-semibold text-slate-300">Belum Ada Draf yang Dihasilkan</div>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Ketik kata kunci di sebelah kiri lalu klik <strong>"Generate Draf Postingan AI"</strong> untuk menghasilkan variasi tweet berkualitas tinggi.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {generatedDrafts.map((draft, idx) => {
                  const isSelected = activeDraftText === draft;
                  const count = draft.length;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-lg border p-3.5 flex flex-col gap-2.5 transition-all relative group',
                        isSelected
                          ? 'border-flame/70 bg-obsidian-800 shadow-md ring-1 ring-flame/30'
                          : 'border-border/60 bg-obsidian-900/80 hover:bg-obsidian-800/80 hover:border-slate-600'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-flame bg-flame/10 px-2 py-0.5 rounded">
                          Variasi #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.2 rounded',
                              count <= 240
                                ? 'text-emerald bg-emerald/10'
                                : count <= 280
                                ? 'text-amber-300 bg-amber-500/10'
                                : 'text-rose-400 bg-rose-500/10 font-bold'
                            )}
                          >
                            {count}/280 chars
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyDraft(draft, idx)}
                            className="p-1 rounded bg-obsidian-750 hover:bg-obsidian-700 text-slate-400 hover:text-white transition-colors"
                            title="Salin teks"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {draft}
                      </p>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDraftText(draft);
                            toast.info(`Variasi #${idx + 1} dimuat ke Editor Preview.`);
                          }}
                          className={cn(
                            'text-[11px] font-medium px-3 py-1 rounded flex items-center gap-1.5 transition-all',
                            isSelected
                              ? 'bg-flame text-obsidian-950 font-bold'
                              : 'bg-obsidian-750 hover:bg-obsidian-700 text-slate-300 hover:text-white border border-border/50'
                          )}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Sedang Dipilih</span>
                            </>
                          ) : (
                            <>
                              <span>Gunakan Draf Ini</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Live Preview, Editor & Fleet Dispatcher */}
          <div className="rounded-xl border border-border/80 bg-obsidian-850 p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Send className="w-4 h-4 text-blue-400" />
                <span>3. Live Tweet Editor & Fleet Dispatcher</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Step 3</span>
            </div>

            {/* Live Tweet Mockup Card */}
            <div className="rounded-xl border border-slate-700/80 bg-obsidian-950 p-4 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-obsidian-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-white">
                  {selectedAccount?.avatar ? (
                    <img src={selectedAccount.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (selectedAccount?.name || 'X')[0]?.toUpperCase() || 'X'
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        {selectedAccount?.name || selectedAccount?.label || 'Node User'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        @{selectedAccount?.username || 'handle'}
                      </span>
                      <span className="text-[10px] text-slate-600">· now</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-obsidian-800 text-slate-400 border border-border/40">
                      Live Preview
                    </span>
                  </div>

                  {/* Interactive Textarea Editor */}
                  <textarea
                    value={activeDraftText}
                    onChange={(e) => setActiveDraftText(e.target.value)}
                    placeholder="Tulis atau edit postingan di sini sebelum dipublikasikan..."
                    rows={4}
                    className="w-full rounded-lg bg-obsidian-900 border border-border/70 p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-flame transition-all resize-y leading-relaxed font-sans"
                  />

                  {/* Character Counter & Helper Buttons */}
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        {activeDraftText.includes('{') && activeDraftText.includes('}') ? (
                          <span className="text-blue-400">✨ Spintax syntax</span>
                        ) : (
                          'Single-Line Post'
                        )}
                      </span>
                      {activeDraftText.includes('\n') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDraftText(
                              activeDraftText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
                            );
                            toast.success('Newline diubah menjadi spasi (1 baris).');
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] hover:bg-amber-500/25 transition-colors"
                        >
                          ⚡ Format Jadi 1 Baris
                        </button>
                      )}
                    </div>
                    <span
                      className={cn(
                        'font-bold px-2 py-0.5 rounded',
                        charCount <= 240
                          ? 'text-emerald bg-emerald/10'
                          : charCount <= 280
                          ? 'text-amber-300 bg-amber-500/10'
                          : 'text-rose-400 bg-rose-500/20'
                      )}
                    >
                      {charCount} / {charLimit}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Account Selection Mode */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Target Armada Akun (Fleet Target):</span>
                <span className="text-[10px] font-mono text-emerald">
                  {activeAccounts.length} Node Siap
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountMode('all')}
                  className={cn(
                    'flex flex-col p-3 rounded-lg border text-left transition-all',
                    selectedAccountMode === 'all'
                      ? 'border-flame bg-flame/10 text-white font-medium shadow-sm'
                      : 'border-border/60 bg-obsidian-900/60 hover:bg-obsidian-800 text-slate-400 hover:text-white'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-flame" />
                      Semua Node Aktif ({activeAccounts.length}x)
                    </span>
                    {selectedAccountMode === 'all' && <Check className="w-3.5 h-3.5 text-flame" />}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {generatedDrafts.length > 1
                      ? 'Distribusi variasi unik untuk tiap akun'
                      : 'Broadcast draf yang sama ke semua node'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccountMode('single');
                    if (!singleAccountId && activeAccounts.length > 0) {
                      setSingleAccountId(activeAccounts[0].id);
                    }
                  }}
                  className={cn(
                    'flex flex-col p-3 rounded-lg border text-left transition-all',
                    selectedAccountMode === 'single'
                      ? 'border-flame bg-flame/10 text-white font-medium shadow-sm'
                      : 'border-border/60 bg-obsidian-900/60 hover:bg-obsidian-800 text-slate-400 hover:text-white'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      1 Akun Spesifik Saja
                    </span>
                    {selectedAccountMode === 'single' && <Check className="w-3.5 h-3.5 text-flame" />}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Pilih salah satu node akun secara manual
                  </span>
                </button>
              </div>

              {/* Single Account Dropdown if selected */}
              {selectedAccountMode === 'single' && (
                <div className="mt-1 animate-in fade-in duration-200">
                  <select
                    value={singleAccountId}
                    onChange={(e) => setSingleAccountId(e.target.value)}
                    className="w-full rounded-lg bg-obsidian-900 border border-border/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-flame"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} (@{acc.username || 'unknown'}) {acc.proxy ? `[Proxy]` : `[Direct]`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Delay & Safety Setting */}
            {selectedAccountMode === 'all' && activeAccounts.length > 1 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-obsidian-900/70 border border-border/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Jeda Rotasi Antar Node</div>
                    <div className="text-[10px] text-slate-500">Mencegah rate-limit dan deteksi anti-spam</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={switchDelaySec}
                    onChange={(e) => setSwitchDelaySec(parseInt(e.target.value, 10) || 15)}
                    className="w-16 text-center rounded bg-obsidian-800 border border-border/80 px-2 py-1 text-xs font-mono font-bold text-flame"
                  />
                  <span className="text-xs font-mono text-slate-400">detik</span>
                </div>
              </div>
            )}

            {/* Warning if over limit */}
            {isOverLimit && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Panjang postingan melebihi 280 karakter. Mohon edit agar tidak gagal saat diposting.</span>
              </div>
            )}

            {/* Launch / Publish Action Button */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || isRunning || !activeDraftText.trim() || isOverLimit || activeAccounts.length === 0}
              className={cn(
                'w-full py-3.5 rounded-lg font-heading font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg',
                isPublishing || isRunning || !activeDraftText.trim() || isOverLimit || activeAccounts.length === 0
                  ? 'bg-obsidian-800 text-slate-500 cursor-not-allowed border border-border/40'
                  : 'bg-gradient-to-r from-blue-600 via-flame to-amber-500 text-obsidian-950 hover:brightness-110 active:scale-[0.99]'
              )}
            >
              {isPublishing || isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-obsidian-950" />
                  <span>{isRunning ? 'Engine Sedang Berjalan...' : 'Memulai Publikasi ke X...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {selectedAccountMode === 'all'
                      ? `🚀 Luncurkan ke ${activeAccounts.length} Node Armada Sekarang`
                      : `🚀 Publikasikan dengan @${selectedAccount?.username || selectedAccount?.label}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Live Telemetry Stream & Execution Console */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isRunning ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flame opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-flame" />
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald" />
                </>
              )}
            </span>
            <span className="font-mono text-xs font-bold text-slate-200 tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-flame" />
              LIVE TELEMETRY STREAM
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {isRunning ? '(ENGINE ACTIVE / PUBLISHING)' : '(STANDBY / MONITORING)'}
            </span>
          </div>

          {isRunning && (
            <button
              type="button"
              onClick={handleStop}
              className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Square className="w-3 h-3 fill-rose-400" />
              <span>Hentikan Proses (STOP)</span>
            </button>
          )}
        </div>

        {/* Realtime Terminal Console */}
        <TerminalConsole />
      </div>
    </div>
  );
};
