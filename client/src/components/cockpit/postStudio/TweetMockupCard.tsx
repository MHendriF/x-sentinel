import React, { useRef } from 'react';
import { Account } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Trash2, Copy, Sparkles, X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TweetMockupCardProps {
  selectedAccount?: Account;
  activeDraftText: string;
  setActiveDraftText: (text: string) => void;
  attachedMedia: Array<{ filename: string; localPath: string; previewUrl: string; sizeKb: string }>;
  setAttachedMedia: React.Dispatch<
    React.SetStateAction<
      Array<{ filename: string; localPath: string; previewUrl: string; sizeKb: string }>
    >
  >;
  isUploadingMedia: boolean;
  onMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TweetMockupCard: React.FC<TweetMockupCardProps> = ({
  selectedAccount,
  activeDraftText,
  setActiveDraftText,
  attachedMedia,
  setAttachedMedia,
  isUploadingMedia,
  onMediaSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charCount = activeDraftText.length;
  const remaining = 280 - charCount;
  const isOverLimit = remaining < 0;

  const handleRemoveMedia = (index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCleanFormat = () => {
    if (!activeDraftText.trim()) return;
    const clean = activeDraftText
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    setActiveDraftText(clean);
    toast.success('Post format cleaned into a single continuous line.');
  };

  return (
    <div className="rounded-xl border border-slate-700/80 bg-obsidian-950 p-4 shadow-inner">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-obsidian-800 text-xs font-bold text-white">
          {selectedAccount?.avatar ? (
            <img src={selectedAccount.avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            (selectedAccount?.name || 'X')[0]?.toUpperCase() || 'X'
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">
                {selectedAccount?.name || selectedAccount?.label || 'Node User'}
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                @{selectedAccount?.username || 'handle'}
              </span>
              <span className="text-[10px] text-slate-600">· now</span>
            </div>
            <span className="rounded border border-border/40 bg-obsidian-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              Live Preview
            </span>
          </div>

          {/* Interactive Textarea */}
          <textarea
            value={activeDraftText}
            onChange={(e) => setActiveDraftText(e.target.value)}
            placeholder="Write or edit post draft here before publishing..."
            rows={4}
            className="w-full resize-y rounded-lg border border-border/70 bg-obsidian-900 p-3 font-sans text-xs leading-relaxed text-white transition-all placeholder:text-slate-600 focus:border-flame focus:outline-none"
          />

          {/* Attached Media Grid */}
          {attachedMedia.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {attachedMedia.map((media, idx) => (
                <div
                  key={idx}
                  className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-obsidian-900"
                >
                  <img
                    src={media.previewUrl}
                    alt={media.filename}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-obsidian-950/80 text-white shadow-md transition-colors hover:bg-rose-600"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1.5 rounded bg-obsidian-950/70 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                    {media.sizeKb} KB
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Character Counter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onMediaSelect}
                multiple
                accept="image/png, image/jpeg, image/gif, image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMedia || attachedMedia.length >= 4}
                className="flex items-center gap-1 rounded bg-obsidian-800 px-2 py-1 text-slate-300 transition-colors hover:bg-obsidian-750 hover:text-white disabled:opacity-50"
                title="Attach images (PNG/JPG/GIF/WebP, max 4)"
              >
                {isUploadingMedia ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImageIcon className="h-3 w-3 text-amber-400" />
                )}
                <span>+ Media ({attachedMedia.length}/4)</span>
              </button>

              <button
                type="button"
                onClick={handleCleanFormat}
                className="flex items-center gap-1 rounded bg-obsidian-800 px-2 py-1 text-slate-300 transition-colors hover:bg-obsidian-750 hover:text-white"
                title="Trim extra spacing and collapse into single line"
              >
                <Sparkles className="h-3 w-3 text-emerald" />
                <span>Single-Line</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveDraftText('');
                  setAttachedMedia([]);
                  toast.info('Editor cleared.');
                }}
                className="flex items-center gap-1 rounded bg-obsidian-800 px-2 py-1 text-slate-400 transition-colors hover:bg-obsidian-750 hover:text-rose-400"
                title="Clear text & media"
              >
                <Trash2 className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Character meter */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-obsidian-800">
                <div
                  className={cn(
                    'h-full transition-all',
                    remaining > 40 ? 'bg-emerald' : remaining >= 0 ? 'bg-amber-400' : 'bg-rose-500'
                  )}
                  style={{ width: `${Math.min(100, (charCount / 280) * 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  'font-bold',
                  remaining >= 0 ? 'text-slate-400' : 'font-black text-rose-400'
                )}
              >
                {remaining}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
