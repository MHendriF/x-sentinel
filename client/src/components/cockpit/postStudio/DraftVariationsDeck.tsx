import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FileText,
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  RefreshCw,
  Star,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface DraftVariationsDeckProps {
  generatedDrafts: string[];
  activeDraftText: string;
  setActiveDraftText: (text: string) => void;
  activeProviderUsed: string | null;
  onRegenerateRow: (index: number) => Promise<void>;
  regeneratingIndex: number | null;
  onSaveToStash: (text: string) => void;
  isStashed: (text: string) => boolean;
  onUpdateDraftRow: (index: number, newText: string) => void;
}

export const DraftVariationsDeck: React.FC<DraftVariationsDeckProps> = ({
  generatedDrafts,
  activeDraftText,
  setActiveDraftText,
  activeProviderUsed,
  onRegenerateRow,
  regeneratingIndex,
  onSaveToStash,
  isStashed,
  onUpdateDraftRow,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyDraft = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Post text copied to clipboard.');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Quick Polisher: Strip hashtags, double quotes & excessive spaces
  const handleStripSlop = (text: string, idx: number) => {
    const cleaned = text
      .replace(/#\w+/g, '') // remove hashtags
      .replace(/["“”]/g, '') // remove quotes
      .replace(/\s+/g, ' ')
      .trim();
    onUpdateDraftRow(idx, cleaned);
    if (activeDraftText === text) {
      setActiveDraftText(cleaned);
    }
    toast.success('Anti-slop applied: Hashtags & quotes eliminated!');
  };

  // Quick Polisher: Make Punchy (shorten to first 1-2 impactful sentences)
  const handleMakePunchy = (text: string, idx: number) => {
    const sentences = text.split(/(?<=[.?!])\s+/);
    let punchy = sentences.slice(0, 2).join(' ').trim();
    if (punchy.length > 200) {
      punchy = punchy.slice(0, 197) + '...';
    }
    onUpdateDraftRow(idx, punchy);
    if (activeDraftText === text) {
      setActiveDraftText(punchy);
    }
    toast.success('Condensed into punchy format!');
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-900/90 p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 font-heading text-sm font-bold text-white">
          <FileText className="h-4 w-4 text-emerald-400" />
          <span>2. Generated Post Variations</span>
        </div>
        {activeProviderUsed && (
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
            Engine: {activeProviderUsed}
          </span>
        )}
      </div>

      {generatedDrafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-slate-800 bg-obsidian-950/60 p-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-obsidian-800 text-slate-400">
            <Sparkles className="h-5 w-5 text-flame opacity-70" />
          </div>
          <div className="font-heading text-xs font-semibold text-slate-300">
            No Drafts Generated Yet
          </div>
          <p className="max-w-sm text-[11px] text-slate-500">
            Enter a keyword topic on the left and click{' '}
            <strong className="text-slate-300">&quot;Generate AI Post Drafts&quot;</strong>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {generatedDrafts.map((draft, idx) => {
            const isSelected = activeDraftText === draft;
            const count = draft.length;
            const stashed = isStashed(draft);

            return (
              <div
                key={idx}
                className={cn(
                  'group relative flex flex-col gap-2.5 rounded-lg border p-3.5 transition-all',
                  isSelected
                    ? 'border-flame/70 bg-obsidian-850 shadow-md ring-1 ring-flame/30'
                    : 'border-slate-800/80 bg-obsidian-950 hover:border-slate-700 hover:bg-obsidian-900'
                )}
              >
                {/* Header row with badges and actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-flame/10 px-2 py-0.5 font-mono text-[10px] font-bold text-flame">
                      Variation #{idx + 1}
                    </span>
                    {stashed && (
                      <span className="flex items-center gap-0.5 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-amber-300">
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                        Stashed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Character counter */}
                    <span
                      className={cn(
                        'rounded px-1.5 font-mono text-[10px] font-bold',
                        count <= 240
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : count <= 280
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-rose-500/10 text-rose-400'
                      )}
                    >
                      {count}/280 chars
                    </span>

                    {/* Single Row Regenerate */}
                    <button
                      type="button"
                      onClick={() => onRegenerateRow(idx)}
                      disabled={regeneratingIndex === idx}
                      className="rounded bg-obsidian-900 p-1 text-slate-400 transition-colors hover:bg-obsidian-800 hover:text-flame disabled:opacity-50"
                      title="Regenerate this single draft"
                    >
                      <RefreshCw
                        className={cn(
                          'h-3.5 w-3.5',
                          regeneratingIndex === idx && 'animate-spin text-flame'
                        )}
                      />
                    </button>

                    {/* Save to Stash ⭐ */}
                    <button
                      type="button"
                      onClick={() => onSaveToStash(draft)}
                      className="rounded bg-obsidian-900 p-1 text-slate-400 transition-colors hover:bg-obsidian-800 hover:text-amber-400"
                      title={stashed ? 'Already in Stash' : 'Save draft to Stash'}
                    >
                      <Star
                        className={cn(
                          'h-3.5 w-3.5',
                          stashed && 'fill-amber-400 text-amber-400'
                        )}
                      />
                    </button>

                    {/* Copy text */}
                    <button
                      type="button"
                      onClick={() => handleCopyDraft(draft, idx)}
                      className="rounded bg-obsidian-900 p-1 text-slate-400 transition-colors hover:bg-obsidian-800 hover:text-white"
                      title="Copy text"
                    >
                      {copiedIndex === idx ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Draft Content */}
                <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200">
                  {draft}
                </p>

                {/* Polish toolbar and selection */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Polish: Strip Slop */}
                    <button
                      type="button"
                      onClick={() => handleStripSlop(draft, idx)}
                      className="flex items-center gap-1 rounded bg-obsidian-900 px-2 py-0.5 font-mono text-[10px] text-slate-400 transition-colors hover:bg-obsidian-800 hover:text-emerald-300"
                      title="Strip hashtags and double quotes"
                    >
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span>No Hashtags</span>
                    </button>

                    {/* Polish: Punchy */}
                    <button
                      type="button"
                      onClick={() => handleMakePunchy(draft, idx)}
                      className="flex items-center gap-1 rounded bg-obsidian-900 px-2 py-0.5 font-mono text-[10px] text-slate-400 transition-colors hover:bg-obsidian-800 hover:text-amber-300"
                      title="Condense into punchy core"
                    >
                      <Zap className="h-3 w-3 text-amber-400" />
                      <span>Make Punchy</span>
                    </button>
                  </div>

                  {/* Use This Draft button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDraftText(draft);
                      toast.info(`Variation #${idx + 1} loaded into Live Preview.`);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-3 py-1 font-mono text-[11px] font-semibold transition-all',
                      isSelected
                        ? 'bg-flame font-bold text-obsidian-950 shadow-sm'
                        : 'border border-slate-700 bg-obsidian-800 text-slate-300 hover:bg-obsidian-750 hover:text-white'
                    )}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Selected in Editor</span>
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
  );
};
