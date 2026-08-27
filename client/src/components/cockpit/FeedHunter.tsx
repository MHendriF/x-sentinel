import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Radar, Heart, Repeat, MessageSquare, Flame } from 'lucide-react';

export const FeedHunter: React.FC = () => {
  const { accounts, setActiveTab, setIsRunning } = useStore();

  const [keyword, setKeyword] = useState('');
  const [count, setCount] = useState(10);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [like, setLike] = useState(true);
  const [retweet, setRetweet] = useState(true);
  const [comment, setComment] = useState(false);

  const activeAccounts = accounts.filter((a) => a.enabled !== false);

  const handleStart = async () => {
    if (!keyword.trim()) {
      toast.error('Masukkan kata kunci pencarian atau hashtag.');
      return;
    }
    if (!like && !retweet && !comment) {
      toast.error('Pilih setidaknya satu vektor aksi.');
      return;
    }

    try {
      const res = await apiClient.startHunterTask({
        accountIds: selectedAccountId,
        keyword: keyword.trim(),
        count,
        like,
        retweet,
        comment,
      });

      if (res.success) {
        setIsRunning(true, { targetCount: count, completed: 0 });
        toast.success(`Feed Hunter aktif untuk keyword "${keyword}"!`);
        setActiveTab('tab-batch');
      } else {
        toast.error(`Gagal memulai Feed Hunter: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <Radar className="h-3.5 w-3.5 animate-spin" />
            SURVEILLANCE RADAR
          </div>
          <CardTitle className="text-xl">Feed Hunter Intelligence</CardTitle>
          <CardDescription>
            Pindai feed X/Twitter secara otomatis berdasarkan topik, hashtag, atau tren terkini,
            lalu jalankan interaksi multi-akun seketika.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Target Nodes Selector */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold text-slate-300">DEPLOYMENT NODES</label>
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

          {/* Search Query / Hashtag */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold text-slate-300">
              SEARCH QUERY / HASHTAG <span className="text-flame">*</span>
            </label>
            <Input
              type="text"
              placeholder="#AI OR #tech OR 'web development'"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Harvest Quota */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold text-slate-300">MAX HARVEST QUOTA</label>
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="h-9 w-full rounded-md border border-border/80 bg-obsidian-950 px-3 py-1 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-flame"
            >
              <option value="5">5 Postingan Teratas (Aman / Quick Run)</option>
              <option value="10">10 Postingan (Rekomendasi Standar)</option>
              <option value="20">20 Postingan (Engagement Intensif)</option>
              <option value="30">30 Postingan (Cluster Kuota Tinggi)</option>
            </select>
          </div>

          {/* Vectors */}
          <div className="space-y-1.5 pt-2">
            <label className="font-mono text-xs font-bold text-slate-300">
              ACTIVE ENGAGEMENT VECTORS
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <div
                onClick={() => setLike(!like)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-all ${
                  like
                    ? 'border-red-500/60 bg-red-500/10 text-white'
                    : 'border-border/80 bg-obsidian-950 text-slate-500'
                }`}
              >
                <Heart className={`mb-1 h-5 w-5 ${like ? 'fill-red-400/20 text-red-400' : ''}`} />
                <div className="font-heading text-xs font-semibold">Like</div>
              </div>

              <div
                onClick={() => setRetweet(!retweet)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-all ${
                  retweet
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                    : 'border-border/80 bg-obsidian-950 text-slate-500'
                }`}
              >
                <Repeat className={`mb-1 h-5 w-5 ${retweet ? 'text-emerald-400' : ''}`} />
                <div className="font-heading text-xs font-semibold">Repost</div>
              </div>

              <div
                onClick={() => setComment(!comment)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-all ${
                  comment
                    ? 'border-blue-500/60 bg-blue-500/10 text-white'
                    : 'border-border/80 bg-obsidian-950 text-slate-500'
                }`}
              >
                <MessageSquare className={`mb-1 h-5 w-5 ${comment ? 'text-blue-400' : ''}`} />
                <div className="font-heading text-xs font-semibold">Reply</div>
              </div>
            </div>
          </div>

          <Button
            variant="default"
            size="lg"
            onClick={handleStart}
            className="mt-4 w-full font-heading text-sm font-bold"
          >
            <Flame className="mr-1.5 h-4 w-4" />
            DEPLOY FEED HUNTER INTELLIGENCE
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
