import React from 'react';
import { Heart, Repeat, MessageSquare, Sparkles, CheckCircle, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface CumulativeBadgesProps {
  totalLikes: number;
  totalRetweets: number;
  totalComments: number;
  totalPosts: number;
  totalActions: number;
  successRate: number;
}

export const CumulativeBadges: React.FC<CumulativeBadgesProps> = ({
  totalLikes,
  totalRetweets,
  totalComments,
  totalPosts,
  totalActions,
  successRate,
}) => {
  return (
    <Card className="border-border/80 bg-obsidian-850">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
          <Activity className="h-3.5 w-3.5" />
          AGGREGATED EXECUTION METRICS
        </div>
        <CardTitle className="text-lg">Total Kumulatif Vektor</CardTitle>
        <CardDescription>
          Akumulasi seluruh interaksi sukses yang telah dieksekusi oleh armada node akun X-SENTINEL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {/* Likes Tag */}
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/20 px-3.5 py-2">
            <Heart className="h-4 w-4 fill-red-500/20 text-red-400" />
            <span className="font-mono text-xs text-slate-300">Likes:</span>
            <span className="font-mono text-sm font-bold text-red-400">
              {totalLikes.toLocaleString()}
            </span>
          </div>

          {/* Reposts Tag */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2">
            <Repeat className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-300">Reposts:</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              {totalRetweets.toLocaleString()}
            </span>
          </div>

          {/* Comments Tag */}
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/20 px-3.5 py-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span className="font-mono text-xs text-slate-300">Replies:</span>
            <span className="font-mono text-sm font-bold text-blue-400">
              {totalComments.toLocaleString()}
            </span>
          </div>

          {/* Posts Tag */}
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-300">Posts:</span>
            <span className="font-mono text-sm font-bold text-amber-400">
              {totalPosts.toLocaleString()}
            </span>
          </div>

          {/* Total Actions Tag */}
          <div className="flex items-center gap-2 rounded-lg border border-flame/40 bg-flame/15 px-3.5 py-2 shadow-sm">
            <Activity className="h-4 w-4 text-flame" />
            <span className="font-mono text-xs text-slate-200">Total:</span>
            <span className="font-mono text-sm font-black text-flame">
              {totalActions.toLocaleString()}
            </span>
          </div>

          {/* Success Rate Tag */}
          <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-950/20 px-3.5 py-2">
            <CheckCircle className="h-4 w-4 text-purple-400" />
            <span className="font-mono text-xs text-slate-300">Success Rate:</span>
            <span className="font-mono text-sm font-bold text-purple-400">{successRate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
