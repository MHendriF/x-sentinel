import React, { useState } from 'react';
import { Star, Trash2, Copy, Check, ArrowRight, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export interface StashedDraft {
  id: string;
  text: string;
  keyword?: string;
  style?: string;
  savedAt: string;
}

interface DraftsStashDrawerProps {
  stashedDrafts: StashedDraft[];
  onLoadDraft: (text: string) => void;
  onRemoveDraft: (id: string) => void;
  onClearStash: () => void;
}

export const DraftsStashDrawer: React.FC<DraftsStashDrawerProps> = ({
  stashedDrafts,
  onLoadDraft,
  onRemoveDraft,
  onClearStash,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = stashedDrafts.filter(
    (d) =>
      d.text.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (d.keyword && d.keyword.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Stashed draft copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-900/90 p-5 shadow-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-heading text-sm font-bold text-white">
            Saved Drafts Stash ({stashedDrafts.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search stash..."
              className="h-8 border-slate-800 bg-obsidian-950 pl-8 font-mono text-xs text-slate-200"
            />
          </div>

          {stashedDrafts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClearStash}
              className="h-8 border-rose-500/30 font-mono text-[11px] text-rose-400 hover:bg-rose-950/20"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-obsidian-950/50 py-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-600" />
          <div className="mt-2 font-heading text-xs font-semibold text-slate-300">
            {stashedDrafts.length === 0 ? 'Drafts Stash is Empty' : 'No stashed drafts match filter'}
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            Click the ⭐ Star icon on any generated draft to save it here for future reuse.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const dateFormatted = new Date(item.savedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between gap-2.5 rounded-lg border border-slate-800 bg-obsidian-950 p-3 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-2">
                    {item.keyword && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-bold text-amber-300">
                        {item.keyword}
                      </span>
                    )}
                    <span>{dateFormatted}</span>
                  </div>
                  <span>{item.text.length} chars</span>
                </div>

                <p className="font-sans text-xs leading-relaxed text-slate-200">{item.text}</p>

                <div className="flex items-center justify-end gap-1.5 border-t border-slate-800/80 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.text)}
                    className="flex items-center gap-1 rounded bg-obsidian-900 px-2 py-1 font-mono text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveDraft(item.id)}
                    className="flex items-center gap-1 rounded bg-obsidian-900 px-2 py-1 font-mono text-[10px] text-slate-400 hover:bg-rose-950/40 hover:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLoadDraft(item.text);
                      toast.info('Draft loaded into Live Editor!');
                    }}
                    className="flex items-center gap-1 rounded bg-flame px-2.5 py-1 font-mono text-[10px] font-bold text-obsidian-950 shadow-sm hover:brightness-110"
                  >
                    <span>Load to Editor</span>
                    <ArrowRight className="h-3 w-3" />
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
