import React, { useState } from 'react';
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
  CheckSquare,
  Square as SquareOutline,
  Layers,
  Sparkles,
  FileJson,
  Braces,
  Bot,
  Info,
} from 'lucide-react';
import { DeckHeader } from './DeckHeader';

export const TargetWorkbench: React.FC = () => {
  const { accounts, isRunning, currentTask, setIsRunning, settings } = useStore();

  const [urlsText, setUrlsText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [like, setLike] = useState(true);
  const [retweet, setRetweet] = useState(true);
  const [comment, setComment] = useState(false);
  const [customComment, setCustomComment] = useState('');

  const targetUrls = urlsText
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);
  const activeAccounts = accounts.filter((a) => a.enabled !== false);

  const handleStart = async () => {
    if (targetUrls.length === 0) {
      toast.error('Please enter at least one target tweet URL.');
      return;
    }
    if (!like && !retweet && !comment) {
      toast.error('Select at least one interaction vector (Like / Repost / Reply).');
      return;
    }

    try {
      const res = await apiClient.startBatchTask({
        accountIds: selectedAccountId,
        urls: targetUrls,
        like,
        retweet,
        comment,
        commentText: customComment.trim() || undefined,
      });

      if (res.success) {
        setIsRunning(true, { total: targetUrls.length, completed: 0 });
        toast.success(`Mission started for ${targetUrls.length} target tweets!`);
      } else {
        toast.error(`Failed to start mission: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleStop = async () => {
    try {
      await apiClient.stopTask();
      setIsRunning(false);
      toast.info('Task abort signal sent.');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const total = currentTask?.total || currentTask?.targetCount || targetUrls.length || 1;
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
              <span className="font-bold text-emerald-400">{activeAccounts.length} Nodes</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-2.5 py-1.5 text-slate-300">
              <span className="text-[10px] uppercase text-slate-500">Delays:</span>
              <span className="font-bold text-slate-200">
                {settings?.minDelaySeconds ?? 30}s - {settings?.maxDelaySeconds ?? 90}s
              </span>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Column: Mission Parameters & Launchpad */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
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

          <CardContent className="space-y-4">
            {/* Account Node Selector */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                <span>ASSIGNED NODES</span>
                <span className="text-[10px] text-muted-foreground">ROTATION CLUSTER</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="h-9 w-full rounded-md border border-border/80 bg-obsidian-950 px-3 py-1 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-flame"
              >
                <option value="all">
                  ⚡ All Active Nodes ({activeAccounts.length} Nodes - Sequential Rotation)
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.enabled === false ? '⏸' : acc.isValid ? '●' : '○'} {acc.label} (@
                    {acc.username || 'user'})
                  </option>
                ))}
              </select>
            </div>

            {/* Target URLs Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold text-slate-300">
                  TARGET TWEET URLS <span className="text-flame">*</span>
                </label>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {targetUrls.length} TARGETS
                </Badge>
              </div>
              <Textarea
                rows={5}
                placeholder="https://x.com/username/status/189123456789&#10;https://x.com/another/status/189987654321"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                className="font-mono text-xs"
              />
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

            {/* Custom Comment Input (Optional Override) */}
            {comment && (
              <div className="animate-in fade-in-50 space-y-2 rounded-lg border border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-obsidian-950/80 p-3.5 shadow-lg shadow-blue-950/20">
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
                            🤖 Auto AI Reply Mode ({settings.aiProvider.toUpperCase()})
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
                            🟢 JSON Matrix: {count} Unique Replies
                          </Badge>
                        );
                      }
                    } catch (e) {}
                    return (
                      <Badge
                        variant="outline"
                        className="border-blue-500/50 bg-blue-500/15 font-mono text-[9px] text-blue-300"
                      >
                        ⚡ Custom Spintax / Text Override
                      </Badge>
                    );
                  })()}
                </div>

                {/* Informative AI Auto-Reply Banner when payload is empty */}
                {!customComment.trim() && (
                  <div className="animate-in fade-in flex items-start gap-2.5 rounded-md border border-purple-500/30 bg-purple-950/30 p-2.5 font-mono text-xs text-purple-200">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-100">
                        <span>🤖 Contextual AI Auto-Replies Active</span>
                        <span className="py-0.2 rounded border border-purple-500/30 bg-purple-500/20 px-1.5 text-[10px] font-normal text-purple-300">
                          Empty Payload
                        </span>
                      </div>
                      <p className="font-sans text-[11px] leading-relaxed text-slate-300">
                        Because the payload field below is <strong>left empty</strong>, the bot
                        will <strong>automatically read the target tweet text</strong> and formulate
                        a natural &amp; contextual reply using AI (
                        {settings?.aiProvider && settings.aiProvider !== 'none'
                          ? settings.aiProvider.toUpperCase()
                          : '9router/LLM'}
                        ).
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                          *If you provide manual text or JSON below, the bot will use that payload
                          instead of AI.
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <Textarea
                  rows={7}
                  placeholder={`💡 LEAVE this field empty for automatic contextual AI replies...\n\nOr enter manual text / Spintax / Multi-Node JSON to use a custom template:\n{\n  "topic": "Topic Title",\n  "replies": [\n    "custom reply for node 1",\n    "custom reply for node 2"\n  ]\n}`}
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  className="min-h-[160px] resize-y border-blue-500/30 bg-obsidian-950/90 font-mono text-xs font-medium leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-blue-400"
                />

                {/* Cyber Toolbar with Action Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-500/20 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Preset 1: AI / Tech Matrix */}
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
                                'tao going live on base with no admin key is a bigger deal than it sounds, agents holding and deploying it directly changes a lot',
                              ],
                            },
                            null,
                            2
                          )
                        );
                        toast.success('Sample JSON Multi-Node Matrix loaded!');
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/20 px-2.5 py-1 font-mono text-[11px] font-medium text-blue-300 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-500/30 hover:shadow-blue-500/20 active:scale-95"
                    >
                      <Braces className="h-3 w-3 text-blue-400" />
                      <span>+ Paste Sample JSON Payload</span>
                    </button>

                    {/* Preset 2: Spintax Permutation */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomComment(
                          '{Great insight|Super helpful|Solid breakdown} on {this topic|these points|the details}! 🔥 {Bookmarked for later|Excited for future updates|Much appreciated}.'
                        );
                        toast.info('Spintax template loaded!');
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 font-mono text-[11px] font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-95"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>+ Spintax Preset</span>
                    </button>
                  </div>

                  {/* Clear button if text exists */}
                  {customComment && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomComment('');
                        toast.info('Reply input cleared');
                      }}
                      className="cursor-pointer font-mono text-[10px] text-slate-500 transition-colors hover:text-red-400"
                    >
                      Clear
                    </button>
                  )}
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

            {/* Launch / Stop Trigger Button */}
            {!isRunning ? (
              <Button
                variant="execute"
                size="lg"
                onClick={handleStart}
                className="w-full font-heading text-sm font-bold"
              >
                <Play className="h-4 w-4 fill-white" />
                EXECUTE ENGAGEMENT MISSION
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleStop}
                className="w-full font-heading text-sm font-bold"
              >
                <Square className="h-4 w-4 fill-red-400" />
                ABORT & STOP ALL NODES
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Live Terminal Console */}
      <div>
        <TerminalConsole />
      </div>
    </div>
  </div>
  );
};
