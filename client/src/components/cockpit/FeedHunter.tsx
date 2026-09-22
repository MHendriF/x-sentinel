import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeckHeader } from './DeckHeader';
import { TerminalConsole } from './TerminalConsole';
import { NodeChecklistModal } from './targetWorkbench/NodeChecklistModal';
import { TemplatePresetModal } from './targetWorkbench/TemplatePresetModal';
import { RecurringRadarModal } from './feedHunter/RecurringRadarModal';
import { ActiveRadarStations } from './feedHunter/ActiveRadarStations';
import { toast } from 'sonner';
import {
  Radar,
  Heart,
  Repeat,
  MessageSquare,
  Flame,
  Pause,
  Play,
  Square,
  Sparkles,
  Sliders,
  Layers,
  Clock,
  Bot,
  Filter,
  Dice5,
  BookOpen,
  Calendar,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Trash2,
  Globe,
  Radio,
} from 'lucide-react';

const PRESET_NICHE_CHIPS = [
  { label: '🤖 #AI & Autonomous Agents', query: '#AI OR #AutonomousAgents OR "AI agent"' },
  { label: '⚡ #Solana Ecosystem', query: '#Solana OR $SOL OR "Solana DeFi"' },
  { label: '📈 #Bitcoin & Alpha', query: '#Bitcoin OR #BTC OR "crypto alpha"' },
  { label: '🛠️ #BuildInPublic SaaS', query: '#BuildInPublic OR #IndieHacker OR "micro saas"' },
  { label: '🇮🇩 Crypto Indonesia', query: '#CryptoIndonesia OR "airdrop indo" OR "komunitas web3"' },
  { label: '🌐 Base Layer-2', query: '"Base L2" OR #BaseEcosystem OR #Onchain' },
];

function parseSpintaxClient(text: string): string {
  let prev = '';
  let current = text;
  let iterations = 0;
  while (prev !== current && iterations < 20) {
    prev = current;
    current = current.replace(/\{([^{}]+)\}/g, (_, choices) => {
      const parts = choices.split('|');
      return parts[Math.floor(Math.random() * parts.length)] || '';
    });
    iterations++;
  }
  return current;
}

export const FeedHunter: React.FC = () => {
  const {
    accounts,
    isRunning,
    currentTask,
    setIsRunning,
    settings,
    schedules,
    loadSchedules,
    history,
  } = useStore();

  const [rawKeyword, setRawKeyword] = useState('');
  const [count, setCount] = useState(10);
  const [selectedAccountMode, setSelectedAccountMode] = useState('all');
  const [customAccountIds, setCustomAccountIds] = useState<string[]>([]);

  // Engagement Vectors
  const [like, setLike] = useState(true);
  const [retweet, setRetweet] = useState(true);
  const [comment, setComment] = useState(false);
  const [customComment, setCustomComment] = useState('');
  const [spintaxSample, setSpintaxSample] = useState<string | null>(null);

  // Search Filters
  const [feedType, setFeedType] = useState<'live' | 'top'>('live');
  const [excludeRetweets, setExcludeRetweets] = useState(true);
  const [minLikesFilter, setMinLikesFilter] = useState<'none' | '10' | '25' | '50'>('none');
  const [langFilter, setLangFilter] = useState<'all' | 'en' | 'id'>('all');

  // Modals state
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  // Right column active tab: 'console' | 'stations' | 'leads'
  const [rightTab, setRightTab] = useState<'console' | 'stations' | 'leads'>('console');

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.enabled !== false);
  }, [accounts]);

  const healthyAccounts = useMemo(() => {
    return activeAccounts.filter((a) => a.healthStatus === 'HEALTHY' || a.isValid);
  }, [activeAccounts]);

  // Determine effective target accounts based on mode
  const effectiveAccounts = useMemo(() => {
    if (selectedAccountMode === 'all') return activeAccounts;
    if (selectedAccountMode === 'healthy') return healthyAccounts;
    if (selectedAccountMode === 'custom') {
      return activeAccounts.filter((a) => customAccountIds.includes(a.id));
    }
    const single = activeAccounts.find((a) => a.id === selectedAccountMode);
    return single ? [single] : activeAccounts;
  }, [activeAccounts, healthyAccounts, selectedAccountMode, customAccountIds]);

  // Construct effective query string incorporating smart filters
  const effectiveQuery = useMemo(() => {
    let q = rawKeyword.trim();
    if (!q) return '';

    const parts = [q];
    if (excludeRetweets && !q.includes('-is:retweet')) {
      parts.push('-is:retweet');
    }
    if (minLikesFilter !== 'none' && !q.includes('min_faves:')) {
      parts.push(`min_faves:${minLikesFilter}`);
    }
    if (langFilter !== 'all' && !q.includes('lang:')) {
      parts.push(`lang:${langFilter}`);
    }
    return parts.join(' ');
  }, [rawKeyword, excludeRetweets, minLikesFilter, langFilter]);

  // Resolve accountIds payload
  const getTargetAccountIdsPayload = (): string | string[] => {
    if (selectedAccountMode === 'all') return 'all';
    if (selectedAccountMode === 'healthy') return healthyAccounts.map((a) => a.id);
    if (selectedAccountMode === 'custom') {
      return customAccountIds.length > 0 ? customAccountIds : 'all';
    }
    return selectedAccountMode;
  };

  // Quick Action: Spintax Re-Roll Tester
  const handleTestSpintax = () => {
    if (!customComment.trim()) {
      toast.info('Enter a Spintax payload like {Great|Awesome} post! first.');
      return;
    }
    const sample = parseSpintaxClient(customComment);
    setSpintaxSample(sample);
    toast.success('Generated Spintax permutation preview!');
  };

  // Telemetry Calculations
  const nodeCount = effectiveAccounts.length;
  const activeVectorsCount = (like ? 1 : 0) + (retweet ? 1 : 0) + (comment ? 1 : 0);
  const totalOperations = count * nodeCount * activeVectorsCount;
  const minDelay = settings?.minDelaySeconds ?? 30;
  const maxDelay = settings?.maxDelaySeconds ?? 90;
  const switchDelay = settings?.accountSwitchDelaySec ?? 10;
  const estMinMinutes = Math.max(1, Math.round((count * nodeCount * (minDelay + switchDelay)) / 60));
  const estMaxMinutes = Math.max(1, Math.round((count * nodeCount * (maxDelay + switchDelay)) / 60));

  // Execute Immediate Hunter Run
  const handleStart = async () => {
    if (!effectiveQuery.trim()) {
      toast.error('Please enter a search keyword or click a trending niche chip.');
      return;
    }
    if (!like && !retweet && !comment) {
      toast.error('Select at least one action vector (Like / Repost / Reply).');
      return;
    }

    try {
      const res = await apiClient.startHunterTask({
        accountIds: getTargetAccountIdsPayload(),
        keyword: effectiveQuery,
        count,
        like,
        retweet,
        comment,
        commentText: customComment.trim() || undefined,
        minDelay,
        maxDelay,
      });

      if (res.success) {
        setIsRunning(true, { targetCount: count, completed: 0 });
        toast.success(`Feed Hunter deployed for "${effectiveQuery}"!`);
        setRightTab('console');
      } else {
        toast.error(`Failed to deploy Feed Hunter: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Pause Mission
  const handlePause = async () => {
    try {
      const res = await apiClient.pauseTask('Manual pause by operator');
      if (res.success) {
        toast.warning('Radar mission paused by operator.');
        if (currentTask) {
          setIsRunning(true, {
            ...currentTask,
            isPaused: true,
            pauseReason: 'Manual pause by operator',
            currentAction: 'PAUSED',
          });
        }
      } else {
        toast.error(res.message || 'Failed to pause mission.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Resume Mission
  const handleResume = async () => {
    try {
      const res = await apiClient.resumeTask();
      if (res.success) {
        toast.success('Radar mission resumed.');
        if (currentTask) {
          setIsRunning(true, {
            ...currentTask,
            isPaused: false,
            pauseReason: null,
            currentAction: 'RESUMING',
          });
        }
      } else {
        toast.error(res.message || 'Failed to resume mission.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Abort Running Task
  const handleStop = async () => {
    try {
      await apiClient.stopTask();
      setIsRunning(false);
      toast.info('Radar mission abort signal sent.');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Filter recent hunter leads from history
  const recentHunterLeads = useMemo(() => {
    return (history || []).filter((h) => h.action !== 'POST').slice(0, 15);
  }, [history]);

  const activeRadarStationsCount = useMemo(() => {
    return (schedules || []).filter((s) => s.type === 'RECURRING_HUNTER' && s.enabled).length;
  }, [schedules]);

  return (
    <div className="animate-in fade-in space-y-6">
      {/* Top Deck Header */}
      <DeckHeader
        tag="SURVEILLANCE RADAR"
        tagColor="flame"
        icon={<Radar className="h-5 w-5 text-flame" />}
        isActive={isRunning}
        badge={isRunning ? '● SWEEPING FEED' : '○ STANDBY'}
        title="Feed Hunter & Lead Radar"
        description="Autonomous keyword, topic, and competitor radar sweeping X feeds for high-intent conversations with multi-node engagement vectors."
        actions={
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-2.5 py-1.5 text-slate-300">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[10px] uppercase text-slate-500">Radar Stations:</span>
              <span className="font-bold text-cyan-400">{activeRadarStationsCount} Active</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-2.5 py-1.5 text-slate-300">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase text-slate-500">Fleet:</span>
              <span className="font-bold text-emerald-400">{effectiveAccounts.length} Nodes</span>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Column: Radar Configuration & Launchpad */}
        <div className="space-y-5">
          <Card className="border-border/80 bg-obsidian-900 shadow-xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Flame className="h-4 w-4 text-flame" />
                  Surveillance Scope &amp; Parameters
                </CardTitle>
                <Badge
                  variant={isRunning ? 'success' : 'secondary'}
                  className="font-mono text-[10px]"
                >
                  {isRunning ? 'RADAR ACTIVE' : 'READY'}
                </Badge>
              </div>
              <CardDescription>
                Define target keywords, quality thresholds, and multi-node engagement vectors.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Niche Chips Quick Select */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                  <span>TRENDING TOPIC PRESETS</span>
                  <span className="text-[10px] text-muted-foreground">1-CLICK QUERY</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_NICHE_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRawKeyword(chip.query)}
                      className="inline-flex cursor-pointer items-center rounded-md border border-slate-800 bg-obsidian-950 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-all hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-300 active:scale-95"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Query Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold text-slate-300">
                    SEARCH QUERY / KEYWORDS <span className="text-flame">*</span>
                  </label>
                  {rawKeyword && (
                    <button
                      type="button"
                      onClick={() => setRawKeyword('')}
                      className="cursor-pointer font-mono text-[10px] text-slate-500 hover:text-red-400"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Input
                  type="text"
                  placeholder="#AI OR #AutonomousAgents OR 'web3 alpha'"
                  value={rawKeyword}
                  onChange={(e) => setRawKeyword(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              {/* Smart Query Refinement Filters */}
              <div className="rounded-lg border border-slate-800 bg-obsidian-950/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-cyan-400" />
                    TARGET QUALITY FILTERS
                  </span>
                  <span className="text-[10px] text-cyan-400">SMART FILTERS</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  {/* Filter: Exclude Retweets */}
                  <label className="flex cursor-pointer items-center gap-2 rounded border border-border/60 bg-obsidian-900 p-2 text-slate-300 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={excludeRetweets}
                      onChange={(e) => setExcludeRetweets(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-700 bg-obsidian-950 text-cyan-500"
                    />
                    <span className="text-[11px]">Original Tweets Only</span>
                  </label>

                  {/* Filter: Min Likes */}
                  <div className="flex items-center justify-between rounded border border-border/60 bg-obsidian-900 px-2 py-1.5">
                    <span className="text-[11px] text-slate-300">Min Likes:</span>
                    <select
                      value={minLikesFilter}
                      onChange={(e) => setMinLikesFilter(e.target.value as any)}
                      className="bg-transparent font-mono text-[11px] text-cyan-300 focus:outline-none"
                    >
                      <option value="none" className="bg-obsidian-900 text-slate-300">Any</option>
                      <option value="10" className="bg-obsidian-900 text-slate-300">≥ 10 Likes</option>
                      <option value="25" className="bg-obsidian-900 text-slate-300">≥ 25 Likes</option>
                      <option value="50" className="bg-obsidian-900 text-slate-300">≥ 50 Likes</option>
                    </select>
                  </div>
                </div>

                {/* Live Query String Preview */}
                {effectiveQuery && (
                  <div className="rounded border border-slate-800/80 bg-obsidian-950 p-2 font-mono text-[10.5px] text-slate-400 flex items-start gap-1.5 overflow-x-auto">
                    <span className="text-cyan-400 font-bold shrink-0">X Query:</span>
                    <span className="text-slate-200 truncate">{effectiveQuery}</span>
                  </div>
                )}
              </div>

              {/* Node Fleet Selector & Harvest Quota */}
              <div className="grid grid-cols-2 gap-3">
                {/* Deployment Nodes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                    <span>DEPLOYMENT NODES</span>
                    {selectedAccountMode === 'custom' && (
                      <button
                        type="button"
                        onClick={() => setIsNodeModalOpen(true)}
                        className="cursor-pointer text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
                      >
                        <Sliders className="h-2.5 w-2.5" />
                        ({customAccountIds.length})
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedAccountMode}
                    onChange={(e) => {
                      setSelectedAccountMode(e.target.value);
                      if (e.target.value === 'custom') {
                        setIsNodeModalOpen(true);
                      }
                    }}
                    className="h-9 w-full rounded-md border border-border/80 bg-obsidian-950 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-flame"
                  >
                    <option value="all">⚡ All Nodes ({activeAccounts.length})</option>
                    <option value="healthy">🟢 Healthy Only ({healthyAccounts.length})</option>
                    <option value="custom">⚙️ Custom Selection ({customAccountIds.length})</option>
                    <optgroup label="Single Specific Node">
                      {activeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          👤 {acc.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Harvest Quota */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs font-bold text-slate-300">
                    HARVEST QUOTA
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10))}
                    className="h-9 w-full rounded-md border border-border/80 bg-obsidian-950 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-flame"
                  >
                    <option value="3">Top 3 Posts (Stealth Sweep)</option>
                    <option value="5">Top 5 Posts (Safe Standard)</option>
                    <option value="10">Top 10 Posts (Recommended)</option>
                    <option value="20">Top 20 Posts (Deep Harvest)</option>
                    <option value="30">Top 30 Posts (Maximum Swarm)</option>
                  </select>
                </div>
              </div>

              {/* Engagement Vectors */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-slate-300">
                  ACTIVE ENGAGEMENT VECTORS
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Like Vector */}
                  <div
                    onClick={() => setLike(!like)}
                    role="switch"
                    aria-checked={like}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLike(!like);
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-2.5 text-center transition-all ${
                      like
                        ? 'border-red-500/60 bg-red-500/10 text-white'
                        : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <Heart className={`mb-1 h-4 w-4 ${like ? 'fill-red-400/20 text-red-400' : ''}`} />
                    <div className="font-heading text-xs font-semibold">Like</div>
                  </div>

                  {/* Repost Vector */}
                  <div
                    onClick={() => setRetweet(!retweet)}
                    role="switch"
                    aria-checked={retweet}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setRetweet(!retweet);
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-2.5 text-center transition-all ${
                      retweet
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                        : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <Repeat className={`mb-1 h-4 w-4 ${retweet ? 'text-emerald-400' : ''}`} />
                    <div className="font-heading text-xs font-semibold">Repost</div>
                  </div>

                  {/* Reply Vector */}
                  <div
                    onClick={() => setComment(!comment)}
                    role="switch"
                    aria-checked={comment}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setComment(!comment);
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-2.5 text-center transition-all ${
                      comment
                        ? 'border-blue-500/60 bg-blue-500/10 text-white'
                        : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <MessageSquare className={`mb-1 h-4 w-4 ${comment ? 'text-blue-400' : ''}`} />
                    <div className="font-heading text-xs font-semibold">Reply</div>
                  </div>
                </div>
              </div>

              {/* Reply Payload Configuration (When Comment Vector Active) */}
              {comment && (
                <div className="animate-in fade-in-50 space-y-2 rounded-lg border border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-obsidian-950/80 p-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-200 flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-blue-400" />
                      REPLY SYNTHESIS MATRIX
                    </span>
                    {!customComment.trim() ? (
                      <Badge
                        variant="outline"
                        className="animate-pulse border-purple-500/50 bg-purple-500/15 font-mono text-[9px] text-purple-300"
                      >
                        🤖 Auto AI Contextual Reply
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-blue-500/50 bg-blue-500/15 font-mono text-[9px] text-blue-300"
                      >
                        ⚡ Custom Text / Spintax
                      </Badge>
                    )}
                  </div>

                  <Textarea
                    rows={4}
                    placeholder={`💡 LEAVE empty for automatic contextual AI replies...\n\nOr enter manual Spintax: {Awesome|Great} thread on this topic! 🔥`}
                    value={customComment}
                    onChange={(e) => {
                      setCustomComment(e.target.value);
                      setSpintaxSample(null);
                    }}
                    className="font-mono text-xs border-blue-500/30 bg-obsidian-950/90 text-slate-100"
                  />

                  {/* Spintax Test Preview */}
                  {spintaxSample && (
                    <div className="rounded border border-amber-500/40 bg-amber-950/20 p-2 font-mono text-xs text-amber-200">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 pb-0.5">
                        <span>🎲 SPINTAX SAMPLE</span>
                        <button
                          type="button"
                          onClick={handleTestSpintax}
                          className="hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Dice5 className="h-2.5 w-2.5" /> Re-Roll
                        </button>
                      </div>
                      <p className="font-sans text-slate-200 text-xs italic">"{spintaxSample}"</p>
                    </div>
                  )}

                  {/* Reply Toolbar */}
                  <div className="flex items-center justify-between pt-1 font-mono text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsPresetModalOpen(true)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded border border-blue-500/40 bg-blue-500/20 px-2 py-0.5 text-blue-300 hover:bg-blue-500/30"
                      >
                        <BookOpen className="h-2.5 w-2.5" />
                        <span>Presets</span>
                      </button>
                      {customComment.includes('{') && (
                        <button
                          type="button"
                          onClick={handleTestSpintax}
                          className="inline-flex cursor-pointer items-center gap-1 rounded border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-amber-300 hover:bg-amber-500/30"
                        >
                          <Dice5 className="h-2.5 w-2.5" />
                          <span>Test Spintax</span>
                        </button>
                      )}
                    </div>
                    {customComment && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomComment('');
                          setSpintaxSample(null);
                        }}
                        className="cursor-pointer text-slate-500 hover:text-red-400"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Telemetry HUD */}
              <div className="rounded-lg border border-slate-800 bg-obsidian-950/80 p-3 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    RADAR MISSION ESTIMATE
                  </span>
                  <span className="text-[10px] text-slate-500">FLEET SWARM</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded border border-slate-800/80 bg-obsidian-900/60 p-1.5">
                    <div className="text-[10px] text-slate-500">TARGETS</div>
                    <div className="font-bold text-white text-sm">Top {count}</div>
                  </div>
                  <div className="rounded border border-slate-800/80 bg-obsidian-900/60 p-1.5">
                    <div className="text-[10px] text-slate-500">TOTAL ACTIONS</div>
                    <div className="font-bold text-cyan-400 text-sm">{totalOperations}</div>
                  </div>
                  <div className="rounded border border-slate-800/80 bg-obsidian-900/60 p-1.5">
                    <div className="text-[10px] text-slate-500">EST. DURATION</div>
                    <div className="font-bold text-amber-400 text-sm">~{estMinMinutes}-{estMaxMinutes}m</div>
                  </div>
                </div>
              </div>

              {/* Paused Notification Banner */}
              {isRunning && currentTask?.isPaused && (
                <div className="animate-in fade-in slide-in-from-top-1 rounded-md border border-amber-500/60 bg-amber-950/40 p-3 font-mono text-xs text-amber-200 shadow-lg">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span>⏸️ RADAR SWEEP PAUSED</span>
                  </div>
                  <p className="mt-1 font-sans text-xs text-amber-300/90">
                    {currentTask?.pauseReason || 'Task is paused. Click Resume when ready to continue.'}
                  </p>
                </div>
              )}

              {/* Action Buttons: Deploy Now vs Autopilot Recurring */}
              <div className="flex items-center gap-2 pt-1">
                {!isRunning ? (
                  <>
                    <Button
                      variant="default"
                      size="lg"
                      onClick={handleStart}
                      className="flex-1 border-flame/50 bg-flame font-heading text-sm font-bold text-white hover:bg-flame/90"
                    >
                      <Flame className="mr-1.5 h-4 w-4" />
                      Deploy Radar Now
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      type="button"
                      onClick={() => {
                        if (!effectiveQuery.trim()) {
                          toast.error('Enter a search query before setting up recurring radar.');
                          return;
                        }
                        setIsRecurringModalOpen(true);
                      }}
                      title="Set up background autopilot radar schedule"
                      className="border-cyan-500/40 font-mono text-xs text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/10"
                    >
                      <Radar className="h-4 w-4 mr-1 text-cyan-400 animate-spin-slow" />
                      Autopilot
                    </Button>
                  </>
                ) : (
                  <div className="flex w-full items-center gap-2">
                    {currentTask?.isPaused ? (
                      <Button
                        variant="default"
                        size="lg"
                        onClick={handleResume}
                        className="flex-1 bg-emerald-600 font-heading text-sm font-bold text-white hover:bg-emerald-500 shadow-md transition-all active:scale-95"
                      >
                        <Play className="h-4 w-4 fill-white mr-1.5" />
                        RESUME SWEEP
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePause}
                        className="flex-1 border-amber-500/50 bg-amber-500/15 font-heading text-sm font-bold text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 shadow-md transition-all active:scale-95"
                      >
                        <Pause className="h-4 w-4 fill-amber-300 mr-1.5" />
                        PAUSE SWEEP
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={handleStop}
                      className="font-heading text-sm font-bold shadow-md transition-all active:scale-95 px-4"
                      title="Abort current radar sweep immediately"
                    >
                      <Square className="h-4 w-4 fill-red-400 mr-1.5" />
                      ABORT
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Split Tab View */}
        <div className="flex flex-col space-y-3">
          {/* Tab Switcher */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRightTab('console')}
                className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                  rightTab === 'console'
                    ? 'bg-flame text-white shadow-md'
                    : 'text-slate-400 hover:bg-obsidian-850 hover:text-slate-200'
                }`}
              >
                🖥️ Live Console
              </button>
              <button
                type="button"
                onClick={() => setRightTab('stations')}
                className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all flex items-center gap-1 ${
                  rightTab === 'stations'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-obsidian-850 hover:text-slate-200'
                }`}
              >
                <Radio className="h-3 w-3" />
                <span>Radar Stations ({activeRadarStationsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('leads')}
                className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all flex items-center gap-1 ${
                  rightTab === 'leads'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-obsidian-850 hover:text-slate-200'
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Harvested Leads</span>
              </button>
            </div>

            {isRunning && (
              <Badge variant="success" className="animate-pulse font-mono text-[9px]">
                ● SWEEPING
              </Badge>
            )}
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1">
            {rightTab === 'console' ? (
              <TerminalConsole />
            ) : rightTab === 'stations' ? (
              <ActiveRadarStations
                schedules={schedules}
                onRefresh={loadSchedules}
                onDeployNew={() => setIsRecurringModalOpen(true)}
              />
            ) : (
              <Card className="border-border/80 bg-obsidian-900 shadow-xl h-full flex flex-col">
                <CardHeader className="border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-400" />
                      Recent Surveillance Trail
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {recentHunterLeads.length} Captured
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-2 custom-scrollbar">
                  {recentHunterLeads.length === 0 ? (
                    <div className="flex h-60 flex-col items-center justify-center text-center text-slate-500">
                      <Radar className="mb-2 h-8 w-8 text-slate-700" />
                      <p className="font-mono text-xs">No hunter lead interactions captured yet.</p>
                    </div>
                  ) : (
                    recentHunterLeads.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-obsidian-950/80 p-2.5 font-mono text-xs transition-colors hover:border-slate-700"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {item.action === 'LIKE' ? (
                            <Heart className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          ) : item.action === 'RETWEET' ? (
                            <Repeat className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          )}
                          <span className="font-bold text-slate-200 truncate">
                            @{item.accountName || 'node'}
                          </span>
                          <span className="text-slate-500 text-[10px] truncate max-w-[120px]">
                            {item.tweetUrl}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-500">{item.timeFormatted}</span>
                          <Badge
                            variant={item.status === 'SUCCESS' ? 'success' : 'destructive'}
                            className="h-4 px-1 text-[9px]"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <NodeChecklistModal
        isOpen={isNodeModalOpen}
        onClose={() => setIsNodeModalOpen(false)}
        accounts={accounts}
        selectedIds={customAccountIds.length > 0 ? customAccountIds : activeAccounts.map((a) => a.id)}
        onConfirm={(ids) => {
          setCustomAccountIds(ids);
          setSelectedAccountMode('custom');
          toast.success(`Custom fleet selection updated: ${ids.length} nodes.`);
        }}
      />

      <TemplatePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectTemplate={(tpl) => {
          setCustomComment(tpl);
          setSpintaxSample(null);
          toast.success('Template loaded into Reply payload!');
        }}
      />

      <RecurringRadarModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        keyword={effectiveQuery || rawKeyword}
        count={count}
        like={like}
        retweet={retweet}
        comment={comment}
        commentText={customComment}
        accountIds={getTargetAccountIdsPayload()}
        defaultDelay={minDelay}
        onScheduledSuccess={() => {
          loadSchedules();
          setRightTab('stations');
        }}
      />
    </div>
  );
};
