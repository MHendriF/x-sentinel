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
      toast.error('Masukkan setidaknya satu URL target tweet.');
      return;
    }
    if (!like && !retweet && !comment) {
      toast.error('Pilih setidaknya satu vektor interaksi (Like / Repost / Reply).');
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
        toast.success(`Misi dimulai untuk ${targetUrls.length} target tweet!`);
      } else {
        toast.error(`Gagal memulai misi: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleStop = async () => {
    try {
      await apiClient.stopTask();
      setIsRunning(false);
      toast.info('Perintah penghentian tugas dikirim.');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const total = currentTask?.total || currentTask?.targetCount || targetUrls.length || 1;
  const completed = currentTask?.completed || 0;
  const progressPct = Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Left Column: Mission Parameters & Launchpad */}
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
                EXECUTION PIPELINE
              </div>
              <Badge
                variant={isRunning ? 'success' : 'secondary'}
                className="font-mono text-[10px]"
              >
                {isRunning ? '● EXECUTING' : '○ STANDBY'}
              </Badge>
            </div>
            <CardTitle>Batch Target Engagement</CardTitle>
            <CardDescription>
              Eksekusi interaksi otomatis berurutan (*Sequential Multi-Node*) dengan delay acak
              anti-deteksi.
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
                        <span>🤖 Mode AI Contextual Auto-Replies Aktif</span>
                        <span className="py-0.2 rounded border border-purple-500/30 bg-purple-500/20 px-1.5 text-[10px] font-normal text-purple-300">
                          Payload Kosong
                        </span>
                      </div>
                      <p className="font-sans text-[11px] leading-relaxed text-slate-300">
                        Karena kolom payload di bawah ini <strong>dibiarkan kosong</strong>, bot
                        akan <strong>secara otomatis membaca teks tweet target</strong> dan meracik
                        balasan alami &amp; kontekstual menggunakan AI (
                        {settings?.aiProvider && settings.aiProvider !== 'none'
                          ? settings.aiProvider.toUpperCase()
                          : '9router/LLM'}
                        ).
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                          *Jika Anda mengisi teks manual/JSON di bawah, bot akan menggunakan payload
                          tersebut alih-alih AI.
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <Textarea
                  rows={7}
                  placeholder={`💡 KOSONGKAN kolom ini jika ingin bot otomatis meracik balasan kontekstual menggunakan AI...\n\nAtau isi teks manual / Spintax / JSON Multi-Node jika ingin menggunakan template kustom:\n{\n  "topic": "Topic Title",\n  "replies": [\n    "balasan kustom untuk akun 1",\n    "balasan kustom untuk akun 2"\n  ]\n}`}
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
                        toast.success('Sample JSON Multi-Node Matrix dimuat!');
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
                          '{Keren banget|Insightful sekali|Top markotop} {tweetnya|pembahasannya|infonya} {bang|kak}! 🔥 {Izin bookmark ya|Ditunggu update selanjutnya|Bermanfaat banget}.'
                        );
                        toast.info('Template Spintax dimuat!');
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
                        toast.info('Kolom reply dibersihkan');
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
  );
};
