import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, ScheduleItem } from '@/services/apiClient';
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
  Image as ImageIcon,
  Calendar,
  Clock,
  Trash2,
  X,
  Plus,
  Play,
  Pause,
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
  {
    label: '🤖 AI Autonomous Agents',
    kw: 'AI autonomous multi-agent systems and onchain execution',
  },
  {
    label: '⚡ Ethereum L2 / Rollups',
    kw: 'Layer 2 scaling, Arbitrum, Base, and rollup economics',
  },
  { label: '🚀 Memecoin Meta', kw: 'Memecoin narrative, liquidity rotation & risk management' },
  {
    label: '💻 Web Dev Velocity',
    kw: 'Modern web architecture, React 19, TypeScript, and developer velocity',
  },
  { label: '🇮🇩 Komunitas Web3 Indo', kw: 'Perkembangan Web3 dan developer crypto di Indonesia' },
];

export const PostStudio: React.FC = () => {
  const { accounts, settings, loadSettings, schedules, loadSchedules, setActiveTab, isRunning } =
    useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure settings & schedules are loaded when PostStudio mounts
  useEffect(() => {
    loadSettings();
    loadSchedules();
  }, [loadSettings, loadSchedules]);

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

  // Media Attachment State
  const [attachedMedia, setAttachedMedia] = useState<
    { filename: string; localPath: string; previewUrl: string; sizeKb?: string }[]
  >([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Scheduling State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000); // 30 mins from now default
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);

  // Composer & Dispatcher State
  const [activeDraftText, setActiveDraftText] = useState('');
  const [selectedAccountMode, setSelectedAccountMode] = useState<'all' | 'single'>('all');
  const [singleAccountId, setSingleAccountId] = useState<string>('');
  const [switchDelaySec, setSwitchDelaySec] = useState(15);
  const [isPublishing, setIsPublishing] = useState(false);

  const activeAccounts = accounts.filter((a) => a.enabled !== false);
  const selectedAccount =
    accounts.find((a) => a.id === singleAccountId) || activeAccounts[0] || accounts[0];

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

  // Handle Media File Selection & Upload
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachedMedia.length + files.length > 4) {
      toast.error('Twitter/X membatasi maksimal 4 gambar per postingan.');
      return;
    }

    setIsUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} bukan gambar.`);
          continue;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const imageBase64 = await base64Promise;

        const res = await apiClient.uploadMedia(imageBase64, file.name);
        if (res.success && res.localPath) {
          setAttachedMedia((prev) => [
            ...prev,
            {
              filename: res.filename || file.name,
              localPath: res.localPath!,
              previewUrl: imageBase64,
              sizeKb: res.sizeKb,
            },
          ]);
          toast.success(`Gambar ${file.name} (${res.sizeKb} KB) siap dilampirkan.`);
        } else {
          toast.error(`Gagal mengunggah ${file.name}: ${res.message}`);
        }
      }
    } catch (err: any) {
      toast.error(`Error upload gambar: ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
    toast.info('Lampiran gambar dihapus.');
  };

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
        const singleLinePosts = res.posts.map((p) =>
          p
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        );
        setGeneratedDrafts(singleLinePosts);
        setActiveProviderUsed(res.provider || 'AI Engine');
        setActiveDraftText(singleLinePosts[0]);
        toast.success(
          `Berhasil membuat ${singleLinePosts.length} variasi draf postingan (single line)!`,
          {
            description: res.isFallback
              ? 'Dibuat dengan Fallback Template (AI API offline)'
              : `Inference via ${res.provider}`,
          }
        );
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

  // Handle Create Schedule
  const handleCreateSchedule = async () => {
    if (!activeDraftText.trim()) {
      toast.error('Konten postingan tidak boleh kosong.');
      return;
    }

    if (!scheduleDateTime) {
      toast.error('Silakan tentukan tanggal dan waktu jadwal posting.');
      return;
    }

    const scheduledDateObj = new Date(scheduleDateTime);
    if (isNaN(scheduledDateObj.getTime()) || scheduledDateObj.getTime() <= Date.now()) {
      toast.error('Waktu jadwal harus berada di masa mendatang.');
      return;
    }

    setIsCreatingSchedule(true);
    try {
      const accountIds =
        selectedAccountMode === 'all' ? 'all' : [singleAccountId || activeAccounts[0].id];
      let postsToPublish: string[] = [activeDraftText];
      if (selectedAccountMode === 'all' && generatedDrafts.length > 1) {
        postsToPublish = generatedDrafts;
      }

      const res = await apiClient.createSchedule({
        type: 'POST_QUEUE',
        title: scheduleTitle.trim() || `Post: ${activeDraftText.slice(0, 30)}...`,
        scheduledAt: scheduledDateObj.toISOString(),
        accountIds,
        posts: postsToPublish,
        mediaPaths: attachedMedia.map((m) => m.localPath),
        delaySeconds: switchDelaySec,
        enabled: true,
      });

      if (res.success) {
        toast.success(
          `📅 Berhasil menjadwalkan postingan pada ${scheduledDateObj.toLocaleString('id-ID')}!`
        );
        setIsScheduleModalOpen(false);
        setScheduleTitle('');
        await loadSchedules();
      } else {
        toast.error(`Gagal menjadwalkan: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await apiClient.deleteSchedule(id);
      if (res.success) {
        toast.success('Jadwal berhasil dihapus.');
        loadSchedules();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      await apiClient.toggleSchedule(id);
      loadSchedules();
      toast.success('Status jadwal diperbarui.');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Handle Dispatch / Publish to Fleet
  const handlePublish = async () => {
    if (!activeDraftText.trim()) {
      toast.error('Konten postingan tidak boleh kosong.');
      return;
    }

    if (isOverLimit) {
      toast.error(
        `Karakter melebihi batas Twitter (${charCount}/${charLimit}). Silakan ringkas teks.`
      );
      return;
    }

    if (activeAccounts.length === 0) {
      toast.error(
        'Tidak ada akun node yang aktif. Silakan tambahkan atau aktifkan akun di menu Multi-Node.'
      );
      return;
    }

    setIsPublishing(true);
    try {
      const accountIds =
        selectedAccountMode === 'all' ? 'all' : [singleAccountId || activeAccounts[0].id];

      let postsToPublish: string[] = [activeDraftText];
      if (selectedAccountMode === 'all' && generatedDrafts.length > 1) {
        postsToPublish = generatedDrafts;
      }

      const res = await apiClient.startPostTask({
        accountIds,
        posts: postsToPublish,
        delaySeconds: switchDelaySec,
        mediaPaths: attachedMedia.map((m) => m.localPath),
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
    <div className="animate-in fade-in flex flex-col gap-6 duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-r from-obsidian-850 via-obsidian-800 to-obsidian-850 p-5 shadow-lg">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-80 rounded-full bg-flame/5 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-flame/30 bg-flame/15 text-flame shadow-inner">
                <Sparkles className="h-4 w-4" />
              </div>
              <h1 className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-white">
                AI Post Studio & Fleet Publisher
                <span className="rounded-full border border-emerald/30 bg-emerald/20 px-2 py-0.5 font-mono text-[10px] text-emerald">
                  NEW v3.0
                </span>
              </h1>
            </div>
            <p className="max-w-2xl text-xs text-slate-400">
              Racik konten postingan berkelas, anti-AI-slop & high-engagement berdasarkan kata
              kunci, lalu publikasikan langsung ke armada node akun X Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Clickable AI Provider Quick Badge */}
            <button
              type="button"
              onClick={() => setActiveTab('tab-ai')}
              title="Klik untuk mengubah atau menguji konfigurasi AI"
              className={cn(
                'group flex flex-col items-end rounded-lg border px-3 py-2 text-right transition-all',
                hasConfiguredAI
                  ? 'border-purple-500/40 bg-obsidian-900/90 text-white shadow-sm hover:border-purple-400/80 hover:bg-obsidian-850'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              )}
            >
              <div className="flex items-center gap-1 font-mono text-[9px] uppercase text-slate-400 group-hover:text-flame">
                <span>AI Provider Aktif</span>
                <Sliders className="h-2.5 w-2.5 opacity-60 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-xs font-bold text-flame">
                <Bot
                  className={cn(
                    'h-3.5 w-3.5',
                    hasConfiguredAI ? 'text-purple-400' : 'text-amber-400'
                  )}
                />
                <span>
                  {hasConfiguredAI
                    ? aiProviderName
                    : settings?.aiProvider
                      ? `${aiProviderName} (No Key)`
                      : 'FALLBACK TEMPLATE'}
                </span>
                {hasConfiguredAI && aiModelName && (
                  <span className="max-w-[120px] truncate text-[10px] font-normal text-slate-400">
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
              className="group flex flex-col items-end rounded-lg border border-border/60 bg-obsidian-900/80 px-3 py-2 text-right transition-all hover:border-emerald/40 hover:bg-obsidian-850"
            >
              <div className="flex items-center gap-1 font-mono text-[9px] uppercase text-slate-500 group-hover:text-emerald">
                <span>Active Fleet</span>
                <ChevronRight className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-0.5 flex items-center justify-end gap-1.5 font-mono text-xs font-bold text-emerald">
                <Layers className="h-3.5 w-3.5" />
                {activeAccounts.length} Nodes
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Generator Controls & Topic Engine (5 cols) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {/* Card: Topic & Persona Config */}
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Zap className="h-4 w-4 text-flame" />
                <span>1. Konfigurasi Topik & AI Style</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Step 1</span>
            </div>

            {/* Keyword Input */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Kata Kunci / Topik Postingan:</span>
                <span className="font-mono text-[10px] text-slate-500">Wajib</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="Contoh: Solana Layer 2, AI Agents, React 19, Memecoin..."
                  className="w-full rounded-lg border border-border/80 bg-obsidian-900 px-3.5 py-2.5 text-xs text-white transition-all placeholder:text-slate-500 focus:border-flame focus:outline-none focus:ring-1 focus:ring-flame"
                />
              </div>
            </div>

            {/* Trending Quick Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Lightbulb className="h-3 w-3 text-amber-400" />
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
                    className="rounded-md border border-border/60 bg-obsidian-800 px-2.5 py-1 text-[10px] text-slate-300 transition-colors hover:border-slate-600 hover:bg-obsidian-750 hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone / Persona Selector */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-medium text-slate-300">
                Pilih Gaya Bahasa & Persona:
              </label>
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
                        'flex flex-col rounded-lg border p-2.5 text-left transition-all',
                        isSelected
                          ? cn('border-l-4 shadow-sm', style.color)
                          : 'border-border/60 bg-obsidian-900/60 text-slate-400 hover:bg-obsidian-800 hover:text-slate-200'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{style.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-flame" />}
                      </div>
                      <span className="mt-0.5 text-[10px] text-slate-400">{style.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language & Variation Count Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                  <Globe className="h-3 w-3 text-slate-400" />
                  Bahasa:
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-obsidian-900 p-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={cn(
                      'rounded py-1 text-center font-medium transition-all',
                      language === 'en'
                        ? 'bg-flame font-bold text-obsidian-950'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('id')}
                    className={cn(
                      'rounded py-1 text-center font-medium transition-all',
                      language === 'id'
                        ? 'bg-flame font-bold text-obsidian-950'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Bahasa ID
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                  <Hash className="h-3 w-3 text-slate-400" />
                  Variasi Draf:
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/60 bg-obsidian-900 p-1 text-[11px]">
                  {[1, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setVariationCount(cnt)}
                      className={cn(
                        'rounded py-1 text-center font-mono font-medium transition-all',
                        variationCount === cnt
                          ? 'bg-flame font-bold text-obsidian-950'
                          : 'text-slate-400 hover:text-white'
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
                className="flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-slate-200"
              >
                <Sliders className="h-3 w-3 text-flame" />
                <span>
                  {showAdvanced ? 'Sembunyikan Custom Prompt' : '+ Kustomisasi Prompt Tambahan'}
                </span>
              </button>

              {showAdvanced && (
                <div className="animate-in fade-in mt-2 duration-200">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Instruksi tambahan untuk AI (misal: 'Sertakan analogi tentang mobil F1' atau 'Buat nada agak sarkas')..."
                    rows={2}
                    className="w-full rounded-lg border border-border/80 bg-obsidian-900 p-2.5 text-[11px] text-white placeholder:text-slate-500 focus:border-flame focus:outline-none"
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
                'mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-heading text-xs font-bold shadow-md transition-all',
                isGenerating || !keyword.trim()
                  ? 'cursor-not-allowed border border-border/50 bg-obsidian-800 text-slate-500'
                  : 'bg-gradient-to-r from-flame via-amber-500 to-flame text-obsidian-950 hover:brightness-110 active:scale-[0.99]'
              )}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Meracik Draf Konten dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>⚡ Generate {variationCount} Draf Postingan AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Variations Gallery, Live Preview & Fleet Publisher (7 cols) */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* Section: Generated Draft Variations */}
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="h-4 w-4 text-emerald" />
                <span>2. Hasil Variasi Draf Postingan</span>
              </div>
              {activeProviderUsed && (
                <span className="rounded border border-emerald/30 bg-emerald/10 px-2 py-0.5 font-mono text-[10px] text-emerald">
                  {activeProviderUsed}
                </span>
              )}
            </div>

            {generatedDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-border/80 bg-obsidian-900/50 p-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-obsidian-800 text-slate-400">
                  <Sparkles className="h-5 w-5 text-flame opacity-70" />
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  Belum Ada Draf yang Dihasilkan
                </div>
                <p className="max-w-sm text-[11px] text-slate-500">
                  Ketik kata kunci di sebelah kiri lalu klik{' '}
                  <strong>"Generate Draf Postingan AI"</strong> untuk menghasilkan variasi tweet
                  berkualitas tinggi.
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
                        'group relative flex flex-col gap-2.5 rounded-lg border p-3.5 transition-all',
                        isSelected
                          ? 'border-flame/70 bg-obsidian-800 shadow-md ring-1 ring-flame/30'
                          : 'border-border/60 bg-obsidian-900/80 hover:border-slate-600 hover:bg-obsidian-800/80'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-flame/10 px-2 py-0.5 font-mono text-[10px] font-bold text-flame">
                          Variasi #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'py-0.2 rounded px-1.5 font-mono text-[10px]',
                              count <= 240
                                ? 'bg-emerald/10 text-emerald'
                                : count <= 280
                                  ? 'bg-amber-500/10 text-amber-300'
                                  : 'bg-rose-500/10 font-bold text-rose-400'
                            )}
                          >
                            {count}/280 chars
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyDraft(draft, idx)}
                            className="rounded bg-obsidian-750 p-1 text-slate-400 transition-colors hover:bg-obsidian-700 hover:text-white"
                            title="Salin teks"
                          >
                            {copiedIndex === idx ? (
                              <Check className="h-3.5 w-3.5 text-emerald" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
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
                            'flex items-center gap-1.5 rounded px-3 py-1 text-[11px] font-medium transition-all',
                            isSelected
                              ? 'bg-flame font-bold text-obsidian-950'
                              : 'border border-border/50 bg-obsidian-750 text-slate-300 hover:bg-obsidian-700 hover:text-white'
                          )}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Sedang Dipilih</span>
                            </>
                          ) : (
                            <>
                              <span>Gunakan Draf Ini</span>
                              <ArrowRight className="h-3 w-3" />
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
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Send className="h-4 w-4 text-blue-400" />
                <span>3. Live Tweet Editor & Fleet Dispatcher</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Step 3</span>
            </div>

            {/* Live Tweet Mockup Card */}
            <div className="rounded-xl border border-slate-700/80 bg-obsidian-950 p-4 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-obsidian-800 text-xs font-bold text-white">
                  {selectedAccount?.avatar ? (
                    <img
                      src={selectedAccount.avatar}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (selectedAccount?.name || 'X')[0]?.toUpperCase() || 'X'
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        {selectedAccount?.name || selectedAccount?.label || 'Node User'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        @{selectedAccount?.username || 'handle'}
                      </span>
                      <span className="text-[10px] text-slate-600">· now</span>
                    </div>
                    <span className="rounded border border-border/40 bg-obsidian-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                      Live Preview
                    </span>
                  </div>

                  {/* Interactive Textarea Editor */}
                  <textarea
                    value={activeDraftText}
                    onChange={(e) => setActiveDraftText(e.target.value)}
                    placeholder="Tulis atau edit postingan di sini sebelum dipublikasikan..."
                    rows={4}
                    className="w-full resize-y rounded-lg border border-border/70 bg-obsidian-900 p-3 font-sans text-xs leading-relaxed text-white transition-all placeholder:text-slate-600 focus:border-flame focus:outline-none"
                  />

                  {/* Attached Media Previews */}
                  {attachedMedia.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {attachedMedia.map((media, idx) => (
                        <div
                          key={idx}
                          className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-obsidian-900"
                        >
                          <img
                            src={media.previewUrl}
                            alt={media.filename}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-obsidian-950/80 text-white shadow-md transition-colors hover:bg-rose-600"
                            title="Hapus gambar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1.5 rounded bg-obsidian-950/70 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                            {media.sizeKb} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Character Counter & Helper Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleMediaSelect}
                        multiple
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingMedia || attachedMedia.length >= 4}
                        className="flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/15 px-2.5 py-1 text-[10px] text-blue-300 transition-colors hover:bg-blue-500/25"
                      >
                        <ImageIcon className="h-3 w-3 text-blue-400" />
                        <span>
                          {isUploadingMedia
                            ? 'Uploading...'
                            : `+ Gambar (${attachedMedia.length}/4)`}
                        </span>
                      </button>

                      <span className="text-slate-500">
                        {activeDraftText.includes('{') && activeDraftText.includes('}') ? (
                          <span className="text-blue-400">✨ Spintax</span>
                        ) : (
                          'Single-Line'
                        )}
                      </span>
                      {activeDraftText.includes('\n') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDraftText(
                              activeDraftText
                                .replace(/[\r\n]+/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                            );
                            toast.success('Newline diubah menjadi spasi (1 baris).');
                          }}
                          className="rounded border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 transition-colors hover:bg-amber-500/25"
                        >
                          ⚡ 1 Baris
                        </button>
                      )}
                    </div>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 font-bold',
                        charCount <= 240
                          ? 'bg-emerald/10 text-emerald'
                          : charCount <= 280
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-rose-500/20 text-rose-400'
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
              <label className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Target Armada Akun (Fleet Target):</span>
                <span className="font-mono text-[10px] text-emerald">
                  {activeAccounts.length} Node Siap
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountMode('all')}
                  className={cn(
                    'flex flex-col rounded-lg border p-3 text-left transition-all',
                    selectedAccountMode === 'all'
                      ? 'border-flame bg-flame/10 font-medium text-white shadow-sm'
                      : 'border-border/60 bg-obsidian-900/60 text-slate-400 hover:bg-obsidian-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <Flame className="h-3.5 w-3.5 text-flame" />
                      Semua Node Aktif ({activeAccounts.length}x)
                    </span>
                    {selectedAccountMode === 'all' && <Check className="h-3.5 w-3.5 text-flame" />}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400">
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
                    'flex flex-col rounded-lg border p-3 text-left transition-all',
                    selectedAccountMode === 'single'
                      ? 'border-flame bg-flame/10 font-medium text-white shadow-sm'
                      : 'border-border/60 bg-obsidian-900/60 text-slate-400 hover:bg-obsidian-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <Layers className="h-3.5 w-3.5 text-blue-400" />1 Akun Spesifik Saja
                    </span>
                    {selectedAccountMode === 'single' && (
                      <Check className="h-3.5 w-3.5 text-flame" />
                    )}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400">
                    Pilih salah satu node akun secara manual
                  </span>
                </button>
              </div>

              {/* Single Account Dropdown if selected */}
              {selectedAccountMode === 'single' && (
                <div className="animate-in fade-in mt-1 duration-200">
                  <select
                    value={singleAccountId}
                    onChange={(e) => setSingleAccountId(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-obsidian-900 px-3 py-2 text-xs text-white focus:border-flame focus:outline-none"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} (@{acc.username || 'unknown'}){' '}
                        {acc.proxy ? `[Proxy]` : `[Direct]`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Delay & Safety Setting */}
            {selectedAccountMode === 'all' && activeAccounts.length > 1 && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-obsidian-900/70 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Jeda Rotasi Antar Node</div>
                    <div className="text-[10px] text-slate-500">
                      Mencegah rate-limit dan deteksi anti-spam
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={switchDelaySec}
                    onChange={(e) => setSwitchDelaySec(parseInt(e.target.value, 10) || 15)}
                    className="w-16 rounded border border-border/80 bg-obsidian-800 px-2 py-1 text-center font-mono text-xs font-bold text-flame"
                  />
                  <span className="font-mono text-xs text-slate-400">detik</span>
                </div>
              </div>
            )}

            {/* Warning if over limit */}
            {isOverLimit && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Panjang postingan melebihi 280 karakter. Mohon edit agar tidak gagal saat
                  diposting.
                </span>
              </div>
            )}

            {/* Action Buttons: Publish Now & Schedule */}
            <div className="flex flex-col items-center gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                disabled={!activeDraftText.trim() || isOverLimit || activeAccounts.length === 0}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3.5 font-heading text-xs font-bold transition-all sm:w-auto',
                  !activeDraftText.trim() || isOverLimit || activeAccounts.length === 0
                    ? 'cursor-not-allowed border-border/40 bg-obsidian-900 text-slate-600'
                    : 'border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-white'
                )}
              >
                <Calendar className="h-4 w-4 text-purple-400" />
                <span>Jadwalkan Post</span>
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={
                  isPublishing ||
                  isRunning ||
                  !activeDraftText.trim() ||
                  isOverLimit ||
                  activeAccounts.length === 0
                }
                className={cn(
                  'flex w-full flex-1 items-center justify-center gap-2.5 rounded-lg py-3.5 font-heading text-xs font-bold shadow-lg transition-all',
                  isPublishing ||
                    isRunning ||
                    !activeDraftText.trim() ||
                    isOverLimit ||
                    activeAccounts.length === 0
                    ? 'cursor-not-allowed border border-border/40 bg-obsidian-800 text-slate-500'
                    : 'bg-gradient-to-r from-blue-600 via-flame to-amber-500 text-obsidian-950 hover:brightness-110 active:scale-[0.99]'
                )}
              >
                {isPublishing || isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-obsidian-950" />
                    <span>
                      {isRunning ? 'Engine Sedang Berjalan...' : 'Memulai Publikasi ke X...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>
                      {selectedAccountMode === 'all'
                        ? `🚀 Luncurkan ke ${activeAccounts.length} Node Sekarang`
                        : `🚀 Publikasikan (@${selectedAccount?.username || selectedAccount?.label})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Post Modal */}
      {isScheduleModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-slate-700 bg-obsidian-850 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span>Jadwalkan Waktu Publikasi Postingan</span>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  Label / Judul Jadwal (Opsional):
                </label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  placeholder="Misal: Crypto Morning Alpha Post"
                  className="w-full rounded border border-border/80 bg-obsidian-900 p-2 text-white focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  Pilih Waktu & Tanggal Eksekusi:
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="scheme-dark w-full rounded border border-border/80 bg-obsidian-900 p-2 font-mono text-white focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1 rounded border border-border/40 bg-obsidian-900/60 p-3 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-200">Preview Pengiriman:</div>
                <div>
                  • Target:{' '}
                  <strong>
                    {selectedAccountMode === 'all'
                      ? `Semua Node Aktif (${activeAccounts.length} Akun)`
                      : `@${selectedAccount?.username || 'Node'}`}
                  </strong>
                </div>
                <div>
                  • Lampiran Media: <strong>{attachedMedia.length} file gambar</strong>
                </div>
                <div>
                  • Cuplikan Teks: <em>"{activeDraftText.slice(0, 50)}..."</em>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateSchedule}
                disabled={isCreatingSchedule}
                className="flex items-center gap-1.5 rounded bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
              >
                {isCreatingSchedule ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                <span>Simpan Jadwal Antrean</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section: Scheduled Post & Task Queue Deck */}
      {schedules.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Clock className="h-4 w-4 text-purple-400" />
              <span>Antrean Jadwal Eksekusi Otomatis ({schedules.length})</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">Auto-Scheduler 15s</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {schedules.map((sch) => (
              <div
                key={sch.id}
                className={cn(
                  'flex flex-col justify-between gap-2.5 rounded-lg border p-3 transition-all',
                  sch.status === 'COMPLETED'
                    ? 'border-emerald/40 bg-obsidian-900/40 opacity-70'
                    : sch.status === 'FAILED'
                      ? 'border-rose-500/40 bg-obsidian-900/40'
                      : 'border-border/80 bg-obsidian-900'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        {sch.title || 'Scheduled Task'}
                      </span>
                      <span
                        className={cn(
                          'py-0.2 rounded px-1.5 font-mono text-[9px] font-bold uppercase',
                          sch.status === 'COMPLETED'
                            ? 'bg-emerald/10 text-emerald'
                            : sch.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400'
                              : sch.status === 'RUNNING'
                                ? 'animate-pulse bg-amber-500/10 text-amber-300'
                                : 'bg-purple-500/10 text-purple-300'
                        )}
                      >
                        {sch.status}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                      {sch.posts?.[0] || sch.keywords?.join(', ') || '-'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSchedule(sch.id)}
                      className={cn(
                        'rounded p-1.5 text-xs',
                        sch.enabled
                          ? 'text-emerald hover:bg-emerald/10'
                          : 'text-slate-500 hover:bg-slate-800'
                      )}
                      title={sch.enabled ? 'Pause jadwal' : 'Aktifkan jadwal'}
                    >
                      {sch.enabled ? (
                        <Play className="h-3.5 w-3.5" />
                      ) : (
                        <Pause className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSchedule(sch.id)}
                      className="rounded p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                      title="Hapus jadwal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-1 font-mono text-[10px] text-slate-500">
                  <span>Waktu: {new Date(sch.scheduledAt).toLocaleString('id-ID')}</span>
                  <span>
                    {sch.mediaPaths && sch.mediaPaths.length > 0
                      ? `🖼️ ${sch.mediaPaths.length} gambar`
                      : 'Text only'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Live Telemetry Stream & Execution Console */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isRunning ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-flame" />
                </>
              ) : (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald" />
                </>
              )}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider text-slate-200">
              <Terminal className="h-4 w-4 text-flame" />
              LIVE TELEMETRY STREAM
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {isRunning ? '(ENGINE ACTIVE / PUBLISHING)' : '(STANDBY / MONITORING)'}
            </span>
          </div>

          {isRunning && (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 rounded border border-rose-500/40 bg-rose-500/20 px-3 py-1 font-mono text-xs font-bold text-rose-300 shadow-sm transition-all hover:bg-rose-500/30 hover:text-white active:scale-95"
            >
              <Square className="h-3 w-3 fill-rose-400" />
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
