import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TerminalConsole } from './TerminalConsole';
import { toast } from 'sonner';
import {
  Crosshair,
  Heart,
  Repeat,
  MessageSquare,
  Play,
  Square,
  Layers,
  Sparkles,
  FileJson,
  Braces,
  Bot,
  Clock,
  ClipboardPaste,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Dice5,
  BookOpen,
  Calendar,
  Activity,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DeckHeader } from './DeckHeader';
import { ScheduleBatchModal } from './targetWorkbench/ScheduleBatchModal';
import { NodeChecklistModal } from './targetWorkbench/NodeChecklistModal';
import { TemplatePresetModal } from './targetWorkbench/TemplatePresetModal';
import { MissionMonitorDeck } from './targetWorkbench/MissionMonitorDeck';

// Client-side Spintax parser for instant zero-latency permutation testing
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

export const TargetWorkbench: React.FC = () => {
  const {
    accounts,
    isRunning,
    currentTask,
    lastMission,
    setIsRunning,
    setLastMission,
    setStats,
    settings,
    history,
    loadHistory,
    loadSchedules,
    workbenchUrls: urlsText,
    setWorkbenchUrls: setUrlsText,
  } = useStore();

  // Sync URLs from active task if workbench was opened with empty target input
  useEffect(() => {
    if (currentTask?.urls && Array.isArray(currentTask.urls) && currentTask.urls.length > 0 && !urlsText.trim()) {
      setUrlsText(currentTask.urls.join('\n'));
    }
  }, [currentTask, urlsText, setUrlsText]);

  const [selectedAccountMode, setSelectedAccountMode] = useState<string>('all');
  const [customAccountIds, setCustomAccountIds] = useState<string[]>([]);
  const [like, setLike] = useState(true);
  const [retweet, setRetweet] = useState(true);
  const [comment, setComment] = useState(false);
  const [customComment, setCustomComment] = useState('');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // Spintax permutation preview state
  const [spintaxSample, setSpintaxSample] = useState<string | null>(null);

  // Right column active tab: 'console' | 'monitor'
  const [rightTab, setRightTab] = useState<'console' | 'monitor'>('console');

  // Track mission start timestamp for current-mission filtering
  const [missionStartTime, setMissionStartTime] = useState<number | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory(100);
  }, [loadHistory]);

  // Live polling of history and task status while task is running or when monitor tab is active
  useEffect(() => {
    if (!isRunning && rightTab !== 'monitor') return;
    loadHistory(100);
    const poll = async () => {
      loadHistory(100);
      try {
        const data = await apiClient.getStatus();
        if (data.success) {
          if (data.stats) setStats(data.stats);
          setIsRunning(Boolean(data.isRunning), data.currentTask || null);
          if (data.lastMission) setLastMission(data.lastMission);
        }
      } catch {}
    };
    const interval = setInterval(poll, isRunning ? 2000 : 5000);
    return () => clearInterval(interval);
  }, [isRunning, rightTab, loadHistory, setIsRunning, setLastMission, setStats]);

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

  // Live URL Analysis & Sanitization
  const urlAnalysis = useMemo(() => {
    const lines = urlsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const validUrls: string[] = [];
    const seenIds = new Set<string>();
    let duplicateCount = 0;
    let invalidCount = 0;

    lines.forEach((line) => {
      const match = line.match(/(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i);
      if (match) {
        const tweetId = match[2];
        if (seenIds.has(tweetId)) {
          duplicateCount++;
        } else {
          seenIds.add(tweetId);
          validUrls.push(`https://x.com/i/status/${tweetId}`);
        }
      } else {
        invalidCount++;
      }
    });

    return {
      rawLines: lines,
      validUrls,
      duplicateCount,
      invalidCount,
    };
  }, [urlsText]);

  // Quick Action: Paste from Clipboard
  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.error('Clipboard access not supported by browser.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.info('Clipboard is empty.');
        return;
      }
      setUrlsText((prev) => (prev.trim() ? `${prev.trim()}\n${text.trim()}` : text.trim()));
      toast.success('Pasted content from clipboard!');
    } catch {
      toast.error('Could not access clipboard. Please paste manually.');
    }
  };

  // Quick Action: Deduplicate & Canonicalize URLs
  const handleDeduplicate = () => {
    if (urlAnalysis.validUrls.length === 0) {
      toast.info('No valid tweet URLs to deduplicate.');
      return;
    }
    setUrlsText(urlAnalysis.validUrls.join('\n'));
    toast.success(
      `Cleaned & formatted ${urlAnalysis.validUrls.length} unique canonical tweet URLs!`
    );
  };

  // Quick Action: Load Sample Targets
  const handleLoadSample = () => {
    const samples = [
      'https://x.com/elonmusk/status/1965829183492817291',
      'https://x.com/sama/status/1962381928374928192',
      'https://x.com/VitalikButerin/status/1959827182918273641',
    ];
    setUrlsText(samples.join('\n'));
    toast.info('Loaded 3 sample target tweets.');
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

  // Resolve accountIds payload for startBatchTask
  const getTargetAccountIdsPayload = (): string | string[] => {
    if (selectedAccountMode === 'all') return 'all';
    if (selectedAccountMode === 'healthy') return healthyAccounts.map((a) => a.id);
    if (selectedAccountMode === 'custom') {
      return customAccountIds.length > 0 ? customAccountIds : 'all';
    }
    return selectedAccountMode;
  };

  // Start Batch Mission
  const handleStart = async () => {
    if (urlAnalysis.validUrls.length === 0) {
      toast.error('Please enter at least one valid target tweet URL.');
      return;
    }
    if (!like && !retweet && !comment) {
      toast.error('Select at least one interaction vector (Like / Repost / Reply).');
      return;
    }

    try {
      const res = await apiClient.startBatchTask({
        accountIds: getTargetAccountIdsPayload(),
        urls: urlAnalysis.validUrls,
        like,
        retweet,
        comment,
        commentText: customComment.trim() || undefined,
      });

      if (res.success) {
        const now = Date.now();
        setMissionStartTime(now);
        const totalOps = urlAnalysis.validUrls.length * effectiveAccounts.length;
        setIsRunning(true, {
          total: totalOps,
          completed: 0,
          startedAt: new Date(now).toISOString(),
          currentNode: effectiveAccounts[0]?.username || effectiveAccounts[0]?.label || '',
          currentAction: 'INITIALIZING',
        });
        toast.success(`Mission started for ${urlAnalysis.validUrls.length} target tweets!`);
      } else {
        toast.error(`Failed to start mission: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Stop Mission
  const handleStop = async () => {
    try {
      await apiClient.stopTask();
      setIsRunning(false);
      await loadHistory(100);
      toast.info('Task abort signal sent.');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Telemetry Calculations
  const targetCount = urlAnalysis.validUrls.length;
  const nodeCount = effectiveAccounts.length;
  const activeVectorsCount = (like ? 1 : 0) + (retweet ? 1 : 0) + (comment ? 1 : 0);
  const totalOperations = targetCount * nodeCount * activeVectorsCount;

  const minDelay = settings?.minDelaySeconds ?? 30;
  const maxDelay = settings?.maxDelaySeconds ?? 90;
  const switchDelay = settings?.accountSwitchDelaySec ?? 10;
  const avgDelaySec = (minDelay + maxDelay) / 2 + switchDelay;
  const estTotalSeconds = targetCount * nodeCount * avgDelaySec;
  const estMinMinutes = Math.max(1, Math.round((targetCount * nodeCount * (minDelay + switchDelay)) / 60));
  const estMaxMinutes = Math.max(1, Math.round((targetCount * nodeCount * (maxDelay + switchDelay)) / 60));

  const total = currentTask?.total || currentTask?.targetCount || targetCount || 1;
  const completed = currentTask?.completed || 0;
  const progressPct = Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="animate-in fade-in space-y-6">
      {/* Top Deck Header Banner */}
      <DeckHeader
        tag="EXECUTION PIPELINE"
        tagColor="flame"
        icon={<Crosshair className="h-5 w-5 text-flame" />}
        isActive={isRunning}
        badge={isRunning ? '● EXECUTING' : '○ STANDBY'}
        title="Target Engagement Workbench"
        titleBadges={
          isRunning ? (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400">
              {progressPct}% ({completed}/{total})
            </span>
          ) : undefined
        }
        description="Automated sequential multi-node engagement across target tweets with anti-detection randomized delays and AI payload synthesis."
        actions={
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-2.5 py-1.5 text-slate-300">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase text-slate-500">Fleet:</span>
              <span className="font-bold text-emerald-400">{effectiveAccounts.length} Nodes</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-2.5 py-1.5 text-slate-300">
              <span className="text-[10px] uppercase text-slate-500">Delays:</span>
              <span className="font-bold text-slate-200">
                {minDelay}s - {maxDelay}s
              </span>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Column: Mission Parameters & Launchpad */}
        <div className="space-y-5">
          <Card className="border-border/80 bg-obsidian-900 shadow-xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4 text-flame" />
                  Mission Parameters &amp; Launchpad
                </CardTitle>
                <Badge
                  variant={isRunning ? 'success' : 'secondary'}
                  className="font-mono text-[10px]"
                >
                  {isRunning ? 'EXECUTING' : 'READY'}
                </Badge>
              </div>
              <CardDescription>
                Configure target URLs, interaction vectors, and AI reply synthesis for this execution batch.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Account Node Selector & Custom Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                  <span>ASSIGNED NODES ({effectiveAccounts.length})</span>
                  {selectedAccountMode === 'custom' && (
                    <button
                      type="button"
                      onClick={() => setIsNodeModalOpen(true)}
                      className="cursor-pointer text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Sliders className="h-3 w-3" />
                      Configure Selection ({customAccountIds.length})
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedAccountMode}
                    onChange={(e) => {
                      setSelectedAccountMode(e.target.value);
                      if (e.target.value === 'custom') {
                        setIsNodeModalOpen(true);
                      }
                    }}
                    className="h-9 w-full rounded-md border border-border/80 bg-obsidian-950 px-3 py-1 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-flame"
                  >
                    <option value="all">
                      ⚡ All Active Nodes ({activeAccounts.length} Nodes - Sequential Rotation)
                    </option>
                    <option value="healthy">
                      🟢 Only Healthy Nodes ({healthyAccounts.length} Nodes Verified)
                    </option>
                    <option value="custom">
                      ⚙️ Custom Multi-Node Selection (
                      {customAccountIds.length > 0 ? `${customAccountIds.length} Nodes` : 'Configure...'}
                      )
                    </option>
                    <optgroup label="Single Specific Node">
                      {activeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          👤 {acc.label} (@{acc.username || 'user'})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Target URLs Textarea & Sanitizer Toolbar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold text-slate-300">
                    TARGET TWEET URLS <span className="text-flame">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {urlAnalysis.validUrls.length > 0 && (
                      <Badge variant="success" className="font-mono text-[9.5px]">
                        {urlAnalysis.validUrls.length} VALID
                      </Badge>
                    )}
                    {urlAnalysis.duplicateCount > 0 && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-300 font-mono text-[9.5px]">
                        {urlAnalysis.duplicateCount} DUPLICATE
                      </Badge>
                    )}
                    {urlAnalysis.invalidCount > 0 && (
                      <Badge variant="destructive" className="font-mono text-[9.5px]">
                        {urlAnalysis.invalidCount} INVALID
                      </Badge>
                    )}
                  </div>
                </div>

                <Textarea
                  id="target-urls-input"
                  rows={5}
                  placeholder="https://x.com/username/status/189123456789&#10;https://x.com/another/status/189987654321"
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  className="font-mono text-xs"
                />

                {/* URL Quick Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                    <Button
                      id="btn-paste-clipboard"
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePasteClipboard}
                      className="h-6 px-2 text-[10px]"
                    >
                      <ClipboardPaste className="mr-1 h-2.5 w-2.5 text-blue-400" />
                      Paste Clipboard
                    </Button>
                    {urlAnalysis.duplicateCount > 0 && (
                      <Button
                        id="btn-deduplicate"
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeduplicate}
                        className="h-6 border-amber-500/40 bg-amber-500/10 px-2 text-[10px] text-amber-300 hover:bg-amber-500/20"
                      >
                        <Sparkles className="mr-1 h-2.5 w-2.5 text-amber-400" />
                        Clean &amp; Deduplicate ({urlAnalysis.duplicateCount})
                      </Button>
                    )}
                    {urlAnalysis.validUrls.length === 0 && (
                      <Button
                        id="btn-load-samples"
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadSample}
                        className="h-6 px-2 text-[10px] text-slate-400 hover:text-white"
                      >
                        <Zap className="mr-1 h-2.5 w-2.5 text-amber-400" />
                        Load Samples
                      </Button>
                    )}
                  </div>

                  {urlsText.trim() && (
                    <button
                      type="button"
                      onClick={() => setUrlsText('')}
                      className="cursor-pointer font-mono text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-0.5"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Interaction Vectors Selector */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-slate-300">
                  INTERACTION VECTORS
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Like Vector */}
                  <div
                    onClick={() => setLike(!like)}
                    role="switch"
                    aria-checked={like}
                    aria-label="Like Post Vector"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLike(!like);
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-all ${
                      like
                        ? 'border-red-500/60 bg-red-500/10 text-white'
                        : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <Heart className={`mb-1 h-5 w-5 ${like ? 'fill-red-400/20 text-red-400' : ''}`} />
                    <div className="font-heading text-xs font-semibold">Like Post</div>
                    <div className="font-mono text-[9px] text-muted-foreground">Vector #1</div>
                  </div>

                  {/* Retweet Vector */}
                  <div
                    onClick={() => setRetweet(!retweet)}
                    role="switch"
                    aria-checked={retweet}
                    aria-label="Repost / RT Vector"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setRetweet(!retweet);
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-all ${
                      retweet
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                        : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <Repeat className={`mb-1 h-5 w-5 ${retweet ? 'text-emerald-400' : ''}`} />
                    <div className="font-heading text-xs font-semibold">Repost / RT</div>
                    <div className="font-mono text-[9px] text-muted-foreground">Vector #2</div>
                  </div>

                  {/* Comment Vector */}
                  <div
                    onClick={() => setComment(!comment)}
                    role="switch"
                    aria-checked={comment}
                    aria-label="Reply Payload Vector"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setComment(!comment);
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-all ${
                      comment
                        ? 'border-blue-500/60 bg-blue-500/10 text-white'
                        : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <MessageSquare className={`mb-1 h-5 w-5 ${comment ? 'text-blue-400' : ''}`} />
                    <div className="font-heading text-xs font-semibold">Reply Payload</div>
                    <div className="font-mono text-[9px] text-muted-foreground">Vector #3</div>
                  </div>
                </div>
              </div>

              {/* Custom Comment Input & Suite */}
              {comment && (
                <div className="animate-in fade-in-50 space-y-2.5 rounded-lg border border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-obsidian-950/80 p-3.5 shadow-lg shadow-blue-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded border border-blue-500/30 bg-blue-500/20 p-1 text-blue-400">
                        <FileJson className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-mono text-xs font-bold tracking-wide text-blue-200">
                        REPLY PAYLOAD MATRIX
                      </span>
                    </div>

                    {/* Mode Detector Badge */}
                    {(() => {
                      if (!customComment.trim()) {
                        if (settings?.aiProvider && settings.aiProvider !== 'none') {
                          return (
                            <Badge
                              variant="outline"
                              className="flex animate-pulse items-center gap-1 border-purple-500/50 bg-purple-500/15 font-mono text-[9px] text-purple-300"
                            >
                              <Bot className="h-3 w-3 text-purple-400" />
                              🤖 Auto AI ({settings.aiProvider.toUpperCase()})
                            </Badge>
                          );
                        }
                        return (
                          <Badge
                            variant="outline"
                            className="border-slate-700 bg-slate-900/60 font-mono text-[9px] text-slate-400"
                          >
                            📦 Node Spintax Pool Default
                          </Badge>
                        );
                      }
                      try {
                        const parsed = JSON.parse(customComment);
                        const count = Array.isArray(parsed)
                          ? parsed.length
                          : parsed.replies
                            ? parsed.replies.length
                            : 0;
                        if (count > 0) {
                          return (
                            <Badge
                              variant="outline"
                              className="animate-pulse border-emerald-500/50 bg-emerald-500/15 font-mono text-[9px] text-emerald-300"
                            >
                              🟢 JSON Matrix: {count} Replies
                            </Badge>
                          );
                        }
                      } catch {}
                      return (
                        <Badge
                          variant="outline"
                          className="border-blue-500/50 bg-blue-500/15 font-mono text-[9px] text-blue-300"
                        >
                          ⚡ Custom Spintax / Text
                        </Badge>
                      );
                    })()}
                  </div>

                  {/* Informative AI Banner */}
                  {!customComment.trim() && (
                    <div className="animate-in fade-in flex items-start gap-2.5 rounded-md border border-purple-500/30 bg-purple-950/30 p-2.5 font-mono text-xs text-purple-200">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-100">
                          <span>🤖 Contextual AI Auto-Replies Active</span>
                          <span className="rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-normal text-purple-300">
                            Empty Payload
                          </span>
                        </div>
                        <p className="font-sans text-[11px] leading-relaxed text-slate-300">
                          The bot will automatically read each target tweet and synthesize a natural,
                          contextual response via AI (
                          {settings?.aiProvider && settings.aiProvider !== 'none'
                            ? settings.aiProvider.toUpperCase()
                            : '9router/LLM'}
                          ).
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Textarea
                      rows={6}
                      placeholder={`💡 LEAVE this field empty for automatic contextual AI replies...\n\nOr enter manual text / Spintax / Multi-Node JSON:\n{\n  "topic": "Topic Title",\n  "replies": [\n    "custom reply for node 1",\n    "custom reply for node 2"\n  ]\n}`}
                      value={customComment}
                      onChange={(e) => {
                        setCustomComment(e.target.value);
                        setSpintaxSample(null);
                      }}
                      className="min-h-[140px] resize-y border-blue-500/30 bg-obsidian-950/90 font-mono text-xs font-medium leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-blue-400"
                    />
                    {customComment.length > 0 && (
                      <div className="absolute bottom-2 right-2.5 font-mono text-[10px] text-slate-400">
                        <span
                          className={
                            customComment.length > 280
                              ? 'text-red-400 font-bold'
                              : customComment.length > 240
                                ? 'text-amber-400'
                                : 'text-slate-400'
                          }
                        >
                          {customComment.length}
                        </span>{' '}
                        / 280 chars
                      </div>
                    )}
                  </div>

                  {/* Spintax Permutation Live Preview Box */}
                  {spintaxSample && (
                    <div className="animate-in fade-in rounded-md border border-amber-500/40 bg-amber-950/20 p-2.5 font-mono text-xs text-amber-200">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 pb-1">
                        <span>🎲 SPINTAX RANDOM SAMPLE PREVIEW</span>
                        <button
                          type="button"
                          onClick={handleTestSpintax}
                          className="hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Dice5 className="h-3 w-3" />
                          Re-Roll Permutation
                        </button>
                      </div>
                      <p className="font-sans text-slate-200 text-xs italic">"{spintaxSample}"</p>
                    </div>
                  )}

                  {/* Cyber Toolbar with Action Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-500/20 pt-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Preset 1: Library Selector Modal */}
                      <button
                        type="button"
                        onClick={() => setIsPresetModalOpen(true)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/20 px-2.5 py-1 font-mono text-[11px] font-medium text-blue-300 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-500/30 active:scale-95"
                      >
                        <BookOpen className="h-3 w-3 text-blue-400" />
                        <span>📚 Preset Library...</span>
                      </button>

                      {/* Preset 2: Spintax Tester */}
                      {customComment.includes('{') && (
                        <button
                          type="button"
                          onClick={handleTestSpintax}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-1 font-mono text-[11px] font-medium text-amber-300 transition-all hover:bg-amber-500/30 active:scale-95"
                        >
                          <Dice5 className="h-3 w-3 text-amber-400" />
                          <span>Test Spintax</span>
                        </button>
                      )}

                      {/* Preset 3: JSON Matrix Sample */}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomComment(
                            JSON.stringify(
                              {
                                topic: 'Agentic AI & Web3',
                                replies: [
                                  'the rails are commodity now, occupying them is the game. that line sums up the whole shift honestly',
                                  'stripe buying openrouter for that much money says a lot about where the actual value is moving',
                                  'autonomous agents holding and deploying directly changes the entire paradigm',
                                ],
                              },
                              null,
                              2
                            )
                          );
                          toast.success('Sample JSON Multi-Node Matrix loaded!');
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 font-mono text-[11px] font-medium text-slate-300 transition-all hover:bg-slate-800 active:scale-95"
                      >
                        <Braces className="h-3 w-3 text-slate-400" />
                        <span>+ JSON Matrix</span>
                      </button>
                    </div>

                    {customComment && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomComment('');
                          setSpintaxSample(null);
                          toast.info('Reply input cleared');
                        }}
                        className="cursor-pointer font-mono text-[10px] text-slate-500 hover:text-red-400"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mission Telemetry & ETA HUD */}
              {targetCount > 0 && (
                <div className="rounded-lg border border-slate-800 bg-obsidian-950/80 p-3 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      MISSION TELEMETRY ESTIMATE
                    </span>
                    <span className="text-[10px] text-slate-500">DYNAMIC MODEL</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded border border-slate-800/80 bg-obsidian-900/60 p-1.5">
                      <div className="text-[10px] text-slate-500">TOTAL ACTIONS</div>
                      <div className="font-bold text-white text-sm">{totalOperations}</div>
                    </div>
                    <div className="rounded border border-slate-800/80 bg-obsidian-900/60 p-1.5">
                      <div className="text-[10px] text-slate-500">EST. DURATION</div>
                      <div className="font-bold text-amber-400 text-sm">
                        ~{estMinMinutes}-{estMaxMinutes}m
                      </div>
                    </div>
                    <div className="rounded border border-slate-800/80 bg-obsidian-900/60 p-1.5">
                      <div className="text-[10px] text-slate-500">ROTATION DELAY</div>
                      <div className="font-bold text-emerald-400 text-sm">~{Math.round(avgDelaySec)}s</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar (Visible when executing) */}
              {isRunning && (
                <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                    <span className="font-semibold text-flame">
                      PIPELINE PROGRESS: {completed}/{total}
                    </span>
                    <span className="font-bold text-white">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} />
                </div>
              )}

              {/* Dual Launch Actions: Execute Now or Schedule for Later */}
              <div className="flex items-center gap-2 pt-1">
                {!isRunning ? (
                  <>
                    <Button
                      variant="execute"
                      size="lg"
                      onClick={handleStart}
                      className="flex-1 font-heading text-sm font-bold"
                    >
                      <Play className="h-4 w-4 fill-white mr-1" />
                      EXECUTE ENGAGEMENT MISSION
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      type="button"
                      onClick={() => {
                        if (urlAnalysis.validUrls.length === 0) {
                          toast.error('Enter at least 1 valid tweet URL before scheduling.');
                          return;
                        }
                        setIsScheduleModalOpen(true);
                      }}
                      title="Schedule this mission for future execution"
                      className="border-amber-500/40 font-mono text-xs text-amber-300 hover:border-amber-400 hover:bg-amber-500/10"
                    >
                      <Calendar className="h-4 w-4 mr-1 text-amber-400" />
                      Schedule
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleStop}
                    className="w-full font-heading text-sm font-bold"
                  >
                    <Square className="h-4 w-4 fill-red-400 mr-1" />
                    ABORT &amp; STOP ALL NODES
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dual-Tab Console / Monitor */}
        <div className="flex flex-col space-y-3">
          {/* Tab Bar Switcher */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <button
                id="tab-btn-console"
                type="button"
                onClick={() => setRightTab('console')}
                className={`cursor-pointer rounded-md px-3 py-1 font-mono text-xs font-semibold transition-all ${
                  rightTab === 'console'
                    ? 'bg-flame text-white shadow-md'
                    : 'text-slate-400 hover:bg-obsidian-850 hover:text-slate-200'
                }`}
              >
                🖥️ Live Terminal Console
              </button>
              <button
                id="tab-btn-monitor"
                type="button"
                onClick={() => setRightTab('monitor')}
                className={`cursor-pointer rounded-md px-3 py-1 font-mono text-xs font-semibold transition-all ${
                  rightTab === 'monitor'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-obsidian-850 hover:text-slate-200'
                }`}
              >
                📊 Mission Monitor &amp; Metrics
              </button>
            </div>

            {isRunning && (
              <Badge variant="success" className="animate-pulse font-mono text-[9px]">
                ● STREAMING
              </Badge>
            )}
          </div>

          {/* Active Tab Content */}
          <div className="flex-1">
            {rightTab === 'console' ? (
              <TerminalConsole />
            ) : (
              <MissionMonitorDeck
                isRunning={isRunning}
                currentTask={currentTask}
                lastMission={lastMission}
                targetUrls={urlAnalysis.validUrls}
                recentHistory={history}
                missionStartedAt={missionStartTime}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ScheduleBatchModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        targetUrls={urlAnalysis.validUrls}
        accountIds={getTargetAccountIdsPayload()}
        like={like}
        retweet={retweet}
        comment={comment}
        commentText={customComment}
        defaultDelay={minDelay}
        onScheduledSuccess={() => {
          loadSchedules();
        }}
      />

      <NodeChecklistModal
        isOpen={isNodeModalOpen}
        onClose={() => setIsNodeModalOpen(false)}
        accounts={accounts}
        selectedIds={customAccountIds.length > 0 ? customAccountIds : activeAccounts.map((a) => a.id)}
        onConfirm={(ids) => {
          setCustomAccountIds(ids);
          setSelectedAccountMode('custom');
          toast.success(`Custom selection updated: ${ids.length} nodes selected.`);
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
        globalTemplates={[]}
      />
    </div>
  );
};
