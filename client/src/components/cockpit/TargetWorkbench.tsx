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
} from 'lucide-react';

export const TargetWorkbench: React.FC = () => {
  const { accounts, isRunning, currentTask, setIsRunning } = useStore();

  const [urlsText, setUrlsText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [like, setLike] = useState(true);
  const [retweet, setRetweet] = useState(true);
  const [comment, setComment] = useState(false);
  const [customComment, setCustomComment] = useState('');

  const targetUrls = urlsText.split('\n').map((u) => u.trim()).filter(Boolean);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left Column: Mission Parameters & Launchpad */}
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] font-bold text-flame tracking-wider">
                EXECUTION PIPELINE
              </div>
              <Badge variant={isRunning ? 'success' : 'secondary'} className="font-mono text-[10px]">
                {isRunning ? '● EXECUTING' : '○ STANDBY'}
              </Badge>
            </div>
            <CardTitle>Batch Target Engagement</CardTitle>
            <CardDescription>
              Eksekusi interaksi otomatis berurutan (*Sequential Multi-Node*) dengan delay acak anti-deteksi.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Account Node Selector */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>ASSIGNED NODES</span>
                <span className="text-[10px] text-muted-foreground">ROTATION CLUSTER</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-border/80 bg-obsidian-950 px-3 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-flame"
              >
                <option value="all">
                  ⚡ All Active Nodes ({activeAccounts.length} Nodes - Sequential Rotation)
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.enabled === false ? '⏸' : acc.isValid ? '●' : '○'} {acc.label} (@{acc.username || 'user'})
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
                className="text-xs font-mono"
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
                  className={`cursor-pointer rounded-md border p-3 flex flex-col items-center justify-center text-center transition-all ${
                    like
                      ? 'border-red-500/60 bg-red-500/10 text-white'
                      : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <Heart className={`w-5 h-5 mb-1 ${like ? 'text-red-400 fill-red-400/20' : ''}`} />
                  <div className="font-heading font-semibold text-xs">Like Post</div>
                  <div className="font-mono text-[9px] text-muted-foreground">Vector #1</div>
                </div>

                {/* Retweet Vector */}
                <div
                  onClick={() => setRetweet(!retweet)}
                  className={`cursor-pointer rounded-md border p-3 flex flex-col items-center justify-center text-center transition-all ${
                    retweet
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                      : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <Repeat className={`w-5 h-5 mb-1 ${retweet ? 'text-emerald-400' : ''}`} />
                  <div className="font-heading font-semibold text-xs">Repost / RT</div>
                  <div className="font-mono text-[9px] text-muted-foreground">Vector #2</div>
                </div>

                {/* Comment Vector */}
                <div
                  onClick={() => setComment(!comment)}
                  className={`cursor-pointer rounded-md border p-3 flex flex-col items-center justify-center text-center transition-all ${
                    comment
                      ? 'border-blue-500/60 bg-blue-500/10 text-white'
                      : 'border-border/80 bg-obsidian-950 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <MessageSquare className={`w-5 h-5 mb-1 ${comment ? 'text-blue-400' : ''}`} />
                  <div className="font-heading font-semibold text-xs">Reply Payload</div>
                  <div className="font-mono text-[9px] text-muted-foreground">Vector #3</div>
                </div>
              </div>
            </div>

            {/* Custom Comment Input (Optional Override) */}
            {comment && (
              <div className="space-y-1.5 rounded-md border border-blue-500/30 bg-blue-500/5 p-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    SINGLE OVERRIDE COMMENT (OPTIONAL)
                  </label>
                  <span className="text-[10px] text-slate-400">Kosongkan untuk pakai file .json</span>
                </div>
                <Textarea
                  rows={2}
                  placeholder="{Keren banget|Insightful sekali}! {Makasih infonya ya|Izin bookmark}!"
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  className="text-xs font-mono bg-obsidian-950"
                />
              </div>
            )}

            {/* Progress Bar (Visible when executing) */}
            {isRunning && (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                  <span className="text-flame font-semibold">
                    PIPELINE PROGRESS: {completed}/{total}
                  </span>
                  <span className="text-white font-bold">{progressPct}%</span>
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
                className="w-full text-sm font-heading font-bold"
              >
                <Play className="w-4 h-4 fill-white" />
                EXECUTE ENGAGEMENT MISSION
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleStop}
                className="w-full text-sm font-heading font-bold"
              >
                <Square className="w-4 h-4 fill-red-400" />
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
