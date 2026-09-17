import React from 'react';
import { Heart, Repeat, MessageSquare, Sparkles, CheckCircle, Activity, BarChart3, X, User } from 'lucide-react';
import { DeckHeader } from '../DeckHeader';

interface CumulativeBadgesProps {
  totalLikes: number;
  totalRetweets: number;
  totalComments: number;
  totalPosts: number;
  totalActions: number;
  successRate: number;
  todayStats?: {
    todayLikes: number;
    todayRetweets: number;
    todayComments: number;
    todayPosts: number;
    todayTotal: number;
  };
  selectedNodeLabel?: string | null;
  onClearNodeFilter?: () => void;
}

export const CumulativeBadges: React.FC<CumulativeBadgesProps> = ({
  totalLikes,
  totalRetweets,
  totalComments,
  totalPosts,
  totalActions,
  successRate,
  todayStats,
  selectedNodeLabel,
  onClearNodeFilter,
}) => {
  return (
    <DeckHeader
      tag="AGGREGATED EXECUTION METRICS"
      tagColor="flame"
      icon={<BarChart3 className="h-5 w-5 text-flame" />}
      badge={selectedNodeLabel ? `NODE: ${selectedNodeLabel}` : 'FLEET TOTALS'}
      title="Cumulative Vector Total"
      titleBadges={
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-flame/30 bg-flame/10 px-2 py-0.5 font-mono text-[10px] font-bold text-flame">
            {totalActions.toLocaleString()} TOTAL
          </span>
          {todayStats && todayStats.todayTotal > 0 && (
            <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
              +{todayStats.todayTotal.toLocaleString()} today
            </span>
          )}
        </div>
      }
      description={
        selectedNodeLabel
          ? `Menampilkan performa dan akumulasi interaksi khusus untuk node ${selectedNodeLabel}.`
          : 'Akumulasi seluruh interaksi sukses yang dieksekusi oleh armada node X-SENTINEL.'
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {selectedNodeLabel && onClearNodeFilter && (
            <button
              onClick={onClearNodeFilter}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1.5 font-mono text-xs text-cyan-300 hover:bg-cyan-900/50"
            >
              <User className="h-3.5 w-3.5" />
              <span>Reset Node Filter</span>
              <X className="h-3 w-3 text-slate-400" />
            </button>
          )}
          <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/30 px-3 py-1.5 font-mono text-xs text-purple-300">
            <CheckCircle className="h-3.5 w-3.5 text-purple-400" />
            <span>Success Rate:</span>
            <span className="font-bold text-white">{successRate}%</span>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Likes Tag */}
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/20 px-3.5 py-2">
          <Heart className="h-4 w-4 fill-red-500/20 text-red-400" />
          <span className="font-mono text-xs text-slate-300">Likes:</span>
          <span className="font-mono text-sm font-bold text-red-400">
            {totalLikes.toLocaleString()}
          </span>
          {todayStats && todayStats.todayLikes > 0 && (
            <span className="font-mono text-[10px] text-red-300/80">
              (+{todayStats.todayLikes})
            </span>
          )}
        </div>

        {/* Reposts Tag */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2">
          <Repeat className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-xs text-slate-300">Reposts:</span>
          <span className="font-mono text-sm font-bold text-emerald-400">
            {totalRetweets.toLocaleString()}
          </span>
          {todayStats && todayStats.todayRetweets > 0 && (
            <span className="font-mono text-[10px] text-emerald-300/80">
              (+{todayStats.todayRetweets})
            </span>
          )}
        </div>

        {/* Comments Tag */}
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/20 px-3.5 py-2">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          <span className="font-mono text-xs text-slate-300">Replies:</span>
          <span className="font-mono text-sm font-bold text-blue-400">
            {totalComments.toLocaleString()}
          </span>
          {todayStats && todayStats.todayComments > 0 && (
            <span className="font-mono text-[10px] text-blue-300/80">
              (+{todayStats.todayComments})
            </span>
          )}
        </div>

        {/* Posts Tag */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="font-mono text-xs text-slate-300">Posts:</span>
          <span className="font-mono text-sm font-bold text-amber-400">
            {totalPosts.toLocaleString()}
          </span>
          {todayStats && todayStats.todayPosts > 0 && (
            <span className="font-mono text-[10px] text-amber-300/80">
              (+{todayStats.todayPosts})
            </span>
          )}
        </div>

        {/* Total Actions Tag */}
        <div className="flex items-center gap-2 rounded-lg border border-flame/40 bg-flame/15 px-3.5 py-2 shadow-sm">
          <Activity className="h-4 w-4 text-flame" />
          <span className="font-mono text-xs text-slate-200">Total:</span>
          <span className="font-mono text-sm font-black text-flame">
            {totalActions.toLocaleString()}
          </span>
          {todayStats && todayStats.todayTotal > 0 && (
            <span className="font-mono text-[10px] font-bold text-flame/90">
              (+{todayStats.todayTotal})
            </span>
          )}
        </div>

        {/* Success Rate Tag */}
        <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-950/20 px-3.5 py-2">
          <CheckCircle className="h-4 w-4 text-purple-400" />
          <span className="font-mono text-xs text-slate-300">Success:</span>
          <span className="font-mono text-sm font-bold text-purple-400">{successRate}%</span>
        </div>
      </div>
    </DeckHeader>
  );
};
