import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  RefreshCw,
  Send,
  Sliders,
  Layers,
  ChevronRight,
  Zap,
  Lightbulb,
  FileText,
  Copy,
  Check,
  ArrowRight,
  Globe,
  Bot,
  Calendar,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TweetMockupCard } from './postStudio/TweetMockupCard';
import { ScheduleModal } from './postStudio/ScheduleModal';
import { ScheduledQueueDeck } from './postStudio/ScheduledQueueDeck';
import { DeckHeader } from './DeckHeader';

const PRESET_KEYWORDS = [
  { label: '🔥 Solana Ecosystem', kw: 'Solana DeFi, high throughput, and ecosystem momentum' },
  {
    label: '🤖 Autonomous AI Agents',
    kw: 'Autonomous AI agents changing the future of work and crypto',
  },
  { label: '📈 Base Layer-2', kw: 'Base L2 liquidity growth, consumer crypto onchain adoption' },
  {
    label: '🛠️ SaaS & Indie Hacking',
    kw: 'Building Micro-SaaS in public, shipping velocity and product market fit',
  },
  {
    label: '🌐 Global Crypto Trends',
    kw: 'Crypto ecosystem dynamics, community engagement, and market momentum',
  },
];

const STYLE_OPTIONS = [
  {
    id: 'viral_hook',
    label: '🔥 Viral Hook / Hot Take',
    desc: 'Curiosity-inducing opening statement, daring, punchy, high-retention.',
    color: 'border-amber-500 bg-amber-500/10 text-amber-300',
  },
  {
    id: 'alpha_insight',
    label: '💡 Alpha Insight / Analyst',
    desc: 'Sharp data-driven analysis, logical reasoning, and industry wisdom.',
    color: 'border-blue-500 bg-blue-500/10 text-blue-300',
  },
  {
    id: 'mini_value_drop',
    label: '📊 Mini Value-Drop',
    desc: '1 High-impact takeaway, actionable framework, concise breakdown.',
    color: 'border-emerald bg-emerald/10 text-emerald',
  },
  {
    id: 'founder_story',
    label: '🛠️ Founder / Builder Raw',
    desc: 'Authentic building lessons, technical hurdles, transparent execution.',
    color: 'border-purple-500 bg-purple-500/10 text-purple-300',
  },
  {
    id: 'indo_community',
    label: '🇮🇩 Indo Tech & Crypto Community',
    desc: 'Casual, conversational Indonesian crypto/tech niche style (Bahasa Indonesia).',
    color: 'border-rose-500 bg-rose-500/10 text-rose-300',
  },
];

export const PostStudio: React.FC = () => {
  const { accounts, settings, schedules, loadAccounts, loadSettings, loadSchedules, setActiveTab } =
    useStore();

  const [keyword, setKeyword] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('viral_hook');
  const [language, setLanguage] = useState<'en' | 'id'>('en');
  const [variationCount, setVariationCount] = useState(3);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<string[]>([]);
  const [activeDraftText, setActiveDraftText] = useState('');
  const [activeProviderUsed, setActiveProviderUsed] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'single' | 'fleet'>('single');
  const [isPublishing, setIsPublishing] = useState(false);

  const [attachedMedia, setAttachedMedia] = useState<
    Array<{ filename: string; localPath: string; previewUrl: string; sizeKb: string }>
  >([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDelay, setScheduleDelay] = useState(15);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadSettings();
    loadSchedules();
  }, [loadAccounts, loadSettings, loadSchedules]);

  const activeAccounts = accounts.filter((a) => a.enabled !== false);
  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) || activeAccounts[0] || accounts[0];

  useEffect(() => {
    if (!selectedAccountId && activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      toast.error('Please enter a keyword or post topic.');
      return;
    }

    setIsGenerating(true);
    setActiveProviderUsed(null);

    try {
      const res = await apiClient.generateAIPost({
        keyword: keyword.trim(),
        style: selectedStyle,
        language,
        count: variationCount,
        customPrompt: customPrompt.trim(),
      });

      if (res.success && Array.isArray(res.posts) && res.posts.length > 0) {
        const cleanedPosts = res.posts.map((p) =>
          p
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        );
        setGeneratedDrafts(cleanedPosts);
        setActiveDraftText(cleanedPosts[0]);
        setActiveProviderUsed(res.provider || 'AI Engine');
        toast.success(
          `Successfully generated ${cleanedPosts.length} post drafts via ${res.provider}!`
        );
      } else {
        toast.error('Failed to generate post drafts.');
      }
    } catch (err: any) {
      toast.error(`Error generating drafts: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishNow = async () => {
    if (!activeDraftText.trim()) {
      toast.error('Post text cannot be empty.');
      return;
    }

    if (activeAccounts.length === 0) {
      toast.error('No active accounts found in the fleet.');
      return;
    }

    setIsPublishing(true);
    const mediaPaths = attachedMedia.map((m) => m.localPath);

    try {
      if (targetMode === 'single') {
        if (!selectedAccount) {
          toast.error('Please select a node account first.');
          return;
        }

        const res = await apiClient.startPostTask({
          accountIds: [selectedAccount.id],
          posts: [activeDraftText.trim()],
          mediaPaths,
        });

        if (res.success) {
          toast.success(
            `🚀 Initiated post publication to @${selectedAccount.username || selectedAccount.label}!`
          );
        }
      } else {
        const postsToBroadcast =
          generatedDrafts.length > 0 ? generatedDrafts : [activeDraftText.trim()];

        const res = await apiClient.startPostTask({
          accountIds: 'all',
          posts: postsToBroadcast,
          mediaPaths,
        });

        if (res.success) {
          toast.success(
            `🚀 Broadcasting post to entire fleet (${activeAccounts.length} Nodes)!`
          );
        }
      }
    } catch (err: any) {
      toast.error(`Publication failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenScheduleModal = () => {
    if (!activeDraftText.trim()) {
      toast.error('Write or select a post draft first.');
      return;
    }

    const now = new Date();
    now.setHours(now.getHours() + 1);
    setScheduleDate(now.toISOString().slice(0, 10));
    setScheduleTime(now.toTimeString().slice(0, 5));
    setScheduleTitle(`Auto Post: ${keyword || 'Insight'}`);
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Please specify execution date and time.');
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(scheduledDateTime.getTime())) {
      toast.error('Invalid date or time format.');
      return;
    }

    setIsScheduling(true);
    const mediaPaths = attachedMedia.map((m) => m.localPath);
    const posts =
      targetMode === 'fleet' && generatedDrafts.length > 0
        ? generatedDrafts
        : [activeDraftText.trim()];

    try {
      const res = await apiClient.createSchedule({
        title: scheduleTitle.trim() || 'Scheduled Tweet Post',
        scheduledAt: scheduledDateTime.toISOString(),
        accountIds: targetMode === 'single' && selectedAccount ? [selectedAccount.id] : 'all',
        posts,
        mediaPaths,
        delaySeconds: scheduleDelay,
        type: 'POST_QUEUE',
        enabled: true,
      });

      if (res.success) {
        toast.success(
          `📅 Successfully scheduled post for ${scheduledDateTime.toLocaleString()}!`
        );
        setIsScheduleModalOpen(false);
        await loadSchedules();
      }
    } catch (err: any) {
      toast.error(`Failed to schedule: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      const res = await apiClient.toggleSchedule(id);
      if (res.success) {
        toast.success(`Schedule status updated successfully.`);
        await loadSchedules();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await apiClient.deleteSchedule(id);
      if (res.success) {
        toast.success('Schedule deleted successfully.');
        await loadSchedules();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachedMedia.length + files.length > 4) {
      toast.error('Maximum 4 images per tweet post.');
      return;
    }

    setIsUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} is not an image.`);
          continue;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const imageBase64 = await base64Promise;

        const uploadRes = await apiClient.uploadMedia({
          imageBase64,
          filename: file.name,
        });

        if (uploadRes.success) {
          setAttachedMedia((prev) => [
            ...prev,
            {
              filename: uploadRes.filename,
              localPath: uploadRes.localPath,
              previewUrl: imageBase64,
              sizeKb: uploadRes.sizeKb,
            },
          ]);
          toast.success(`Image ${file.name} attached successfully.`);
        }
      }
    } catch (err: any) {
      toast.error(`Failed to upload media: ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleCopyDraft = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Post text copied to clipboard.');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="animate-in fade-in space-y-6">
      {/* Studio Header Banner */}
      <DeckHeader
        tag="PUBLISHING PIPELINE"
        tagColor="flame"
        badge="CONTENT STUDIO"
        icon={<Sparkles className="h-5 w-5 text-flame" />}
        title="Post Studio & Fleet Publisher"
        description="Craft high-engagement, anti-AI-slop posts from target keywords, then publish directly across your X account fleet."
        actions={
          <>
            <button
              type="button"
              onClick={() => setActiveTab('tab-ai')}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800 bg-obsidian-950/80 px-2.5 py-1.5 text-right transition-all hover:border-purple-500/40 hover:bg-obsidian-900"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/10 text-purple-400">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="text-left font-mono">
                <div className="text-[9px] uppercase text-slate-500">AI Provider</div>
                <div className="text-xs font-bold text-purple-300">
                  {settings?.aiProvider ? settings.aiProvider.toUpperCase() : 'SPINTAX'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tab-accounts')}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800 bg-obsidian-950/80 px-2.5 py-1.5 text-right transition-all hover:border-emerald-500/40 hover:bg-obsidian-900"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div className="text-left font-mono">
                <div className="text-[9px] uppercase text-slate-500">Active Fleet</div>
                <div className="text-xs font-bold text-emerald-400">
                  {activeAccounts.length} Nodes
                </div>
              </div>
            </button>
          </>
        }
      />

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Generator Controls */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Zap className="h-4 w-4 text-flame" />
                <span>1. Topic &amp; AI Style Configuration</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Step 1</span>
            </div>

            {/* Keyword Input */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Keyword / Post Topic:</span>
                <span className="font-mono text-[10px] text-slate-500">Required</span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Solana Layer 2, AI Agents, React 19, Memecoin..."
                className="w-full rounded-lg border border-border/80 bg-obsidian-900 px-3.5 py-2.5 text-xs text-white transition-all placeholder:text-slate-500 focus:border-flame focus:outline-none focus:ring-1 focus:ring-flame"
              />
            </div>

            {/* Quick Keyword Presets */}
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

            {/* Tone Selector */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-medium text-slate-300">
                Choose Writing Style &amp; Persona:
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
                        if (style.id === 'indo_community') setLanguage('id');
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

            {/* Language & Count */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                  <Globe className="h-3 w-3 text-slate-400" />
                  Language:
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
                    Indonesia
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-300">Variation Count:</label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/60 bg-obsidian-900 p-1 font-mono text-[11px]">
                  {[1, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setVariationCount(cnt)}
                      className={cn(
                        'rounded py-1 text-center font-bold transition-all',
                        variationCount === cnt
                          ? 'bg-obsidian-750 text-flame'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      {cnt}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Prompt Toggle */}
            <div className="border-t border-border/60 pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:text-flame"
              >
                <Sliders className="h-3 w-3 text-flame" />
                <span>
                  {showAdvanced ? 'Hide Custom Prompt' : '+ Additional Prompt Customization'}
                </span>
              </button>

              {showAdvanced && (
                <div className="animate-in fade-in mt-2">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Additional instructions for AI (e.g. 'Include an F1 racing analogy' or 'Make the tone slightly contrarian')..."
                    rows={2}
                    className="w-full rounded-lg border border-border/80 bg-obsidian-900 p-2.5 text-[11px] text-white placeholder:text-slate-500 focus:border-flame focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Generate Button */}
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
                  <span>Crafting Content Drafts with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>⚡ Generate {variationCount} AI Post Drafts</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Variations, Tweet Mockup & Dispatcher */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* Generated Draft Variations List */}
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="h-4 w-4 text-emerald" />
                <span>2. Generated Post Variations</span>
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
                  No Drafts Generated Yet
                </div>
                <p className="max-w-sm text-[11px] text-slate-500">
                  Enter keywords on the left and click <strong>"Generate AI Post Drafts"</strong>.
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
                          Variation #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded px-1.5 font-mono text-[10px]',
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
                            title="Copy text"
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
                            toast.info(`Variation #${idx + 1} loaded into Preview Editor.`);
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
                              <span>Selected</span>
                            </>
                          ) : (
                            <>
                              <span>Use This Draft</span>
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

          {/* Live Tweet Editor & Fleet Dispatcher */}
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Send className="h-4 w-4 text-blue-400" />
                <span>3. Live Tweet Editor &amp; Fleet Dispatcher</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Step 3</span>
            </div>

            {/* WYSIWYG Tweet Mockup */}
            <TweetMockupCard
              selectedAccount={selectedAccount}
              activeDraftText={activeDraftText}
              setActiveDraftText={setActiveDraftText}
              attachedMedia={attachedMedia}
              setAttachedMedia={setAttachedMedia}
              isUploadingMedia={isUploadingMedia}
              onMediaSelect={handleMediaSelect}
            />

            {/* Target Account Mode Selection */}
            <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-obsidian-900/70 p-3.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Choose Publishing Target:
                </span>
                <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-obsidian-950 p-1">
                  <button
                    type="button"
                    onClick={() => setTargetMode('single')}
                    className={cn(
                      'rounded px-3 py-1 font-mono text-[11px] font-semibold transition-all',
                      targetMode === 'single'
                        ? 'bg-flame text-obsidian-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    1 Node Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('fleet')}
                    className={cn(
                      'rounded px-3 py-1 font-mono text-[11px] font-semibold transition-all',
                      targetMode === 'fleet'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Broadcast Fleet ({activeAccounts.length})
                  </button>
                </div>
              </div>

              {targetMode === 'single' && (
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-[11px] text-slate-400">Node:</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="flex-1 rounded-md border border-border/80 bg-obsidian-950 px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-flame focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} (@{acc.username || 'user'}){' '}
                        {acc.enabled === false ? '(PAUSED)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons: Publish Now or Schedule */}
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenScheduleModal}
                disabled={isPublishing || !activeDraftText.trim()}
                className="gap-1.5 border-amber-500/40 font-heading text-xs font-bold text-amber-300 hover:bg-amber-500/10"
              >
                <Calendar className="h-4 w-4 text-amber-400" />
                <span>📅 Schedule Post</span>
              </Button>

              <Button
                type="button"
                onClick={handlePublishNow}
                disabled={isPublishing || !activeDraftText.trim() || activeAccounts.length === 0}
                className={cn(
                  'gap-2 font-heading text-xs font-bold shadow-md transition-all',
                  targetMode === 'single'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110'
                    : 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:brightness-110'
                )}
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>
                      {targetMode === 'single'
                        ? 'Publish Now (1 Account)'
                        : `Broadcast to Entire Fleet (${activeAccounts.length})`}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Active Scheduled Queue Deck */}
          <ScheduledQueueDeck
            schedules={schedules}
            onToggleSchedule={handleToggleSchedule}
            onDeleteSchedule={handleDeleteSchedule}
          />
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        scheduleTitle={scheduleTitle}
        setScheduleTitle={setScheduleTitle}
        scheduleDate={scheduleDate}
        setScheduleDate={setScheduleDate}
        scheduleTime={scheduleTime}
        setScheduleTime={setScheduleTime}
        scheduleDelay={scheduleDelay}
        setScheduleDelay={setScheduleDelay}
        targetMode={targetMode}
        selectedAccountName={selectedAccount?.label}
        activeAccountsCount={activeAccounts.length}
        isSubmitting={isScheduling}
        onSubmit={handleSaveSchedule}
      />
    </div>
  );
};
