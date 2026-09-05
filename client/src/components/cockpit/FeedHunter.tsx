import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DeckHeader } from './DeckHeader';
import { toast } from 'sonner';
import { Radar, Heart, Repeat, MessageSquare, Flame } from 'lucide-react';

export const FeedHunter: React.FC = () => {
  const { accounts, setActiveTab, isRunning, setIsRunning } = useStore();

  const [keyword, setKeyword] = useState('');
  const [count, setCount] = useState(10);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [like, setLike] = useState(true);
  const [retweet, setRetweet] = useState(true);
  const [comment, setComment] = useState(false);

  const activeAccounts = accounts.filter((a) => a.enabled !== false);

  const handleStart = async () => {
    if (!keyword.trim()) {
      toast.error('Please enter a search keyword or hashtag.');
      return;
    }
    if (!like && !retweet && !comment) {
      toast.error('Select at least one action vector.');
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
        toast.success(`Feed Hunter activated for keyword "${keyword}"!`);
        setActiveTab('tab-batch');
      } else {
        toast.error(`Failed to start Feed Hunter: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <DeckHeader
        tag="SURVEILLANCE RADAR"
        tagColor="flame"
        icon={<Radar className="h-5 w-5 text-flame" />}
        isActive={isRunning}
        title="Feed Hunter & Lead Radar"
        description="Automatically scan the X/Twitter feed by topic, hashtag, or trending keywords, then execute multi-account engagement immediately."
      />

      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardContent className="space-y-4 pt-6">
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
              <option value="5">Top 5 Posts (Safe / Quick Run)</option>
              <option value="10">Top 10 Posts (Recommended Standard)</option>
              <option value="20">Top 20 Posts (Intensive Engagement)</option>
              <option value="30">Top 30 Posts (High-Quota Cluster)</option>
            </select>
          </div>

          {/* Vectors */}
          <div className="space-y-1.5 pt-2">
            <label className="font-mono text-xs font-bold text-slate-300">
              ACTIVE ENGAGEMENT VECTORS
            </label>
            <div className="grid max-w-2xl grid-cols-3 gap-2.5">
              <div
                onClick={() => setLike(!like)}
                role="switch"
                aria-checked={like}
                aria-label="Like Vector"
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
                    : 'border-border/80 bg-obsidian-950 text-slate-500'
                }`}
              >
                <Heart className={`mb-1 h-5 w-5 ${like ? 'fill-red-400/20 text-red-400' : ''}`} />
                <div className="font-heading text-xs font-semibold">Like</div>
              </div>

              <div
                onClick={() => setRetweet(!retweet)}
                role="switch"
                aria-checked={retweet}
                aria-label="Repost Vector"
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
                    : 'border-border/80 bg-obsidian-950 text-slate-500'
                }`}
              >
                <Repeat className={`mb-1 h-5 w-5 ${retweet ? 'text-emerald-400' : ''}`} />
                <div className="font-heading text-xs font-semibold">Repost</div>
              </div>

              <div
                onClick={() => setComment(!comment)}
                role="switch"
                aria-checked={comment}
                aria-label="Reply Vector"
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
            className="mt-4 w-full max-w-2xl font-heading text-sm font-bold"
          >
            <Flame className="mr-1.5 h-4 w-4" />
            Deploy Feed Hunter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
