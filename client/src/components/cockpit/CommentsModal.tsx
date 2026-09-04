import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Upload,
  Trash2,
  Save,
  FileJson,
  MessageSquare,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PRESET_LIBRARY } from '@/lib/presetLibrary';

export const CommentsModal: React.FC = () => {
  const { isCommentsModalOpen, commentsAccount, closeCommentsModal, loadAccounts } = useStore();

  const [comments, setComments] = useState<string[]>([]);
  const [filePath, setFilePath] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI Reply Generator states
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPostInput, setAiPostInput] = useState('');
  const [aiCount, setAiCount] = useState(15);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiPostInput.trim()) return;
    setIsAiGenerating(true);
    try {
      const res = await apiClient.generatePayloadReplies({
        postText: aiPostInput.trim(),
        count: aiCount,
      });
      if (res.success && res.replies && res.replies.length > 0) {
        setComments([...res.replies, ...comments]);
        toast.success(`Successfully added ${res.replies.length} AI replies to stack!`);
        setIsAiOpen(false);
      } else {
        toast.error(res.message || 'Failed to generate replies.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  useEffect(() => {
    if (commentsAccount && isCommentsModalOpen) {
      loadAccountComments(commentsAccount.id);
    }
  }, [commentsAccount, isCommentsModalOpen]);

  const loadAccountComments = async (id: string) => {
    try {
      const res = await apiClient.getAccountComments(id);
      if (res.success) {
        setComments(res.comments || []);
        setFilePath(res.file || `data/comments/comments_${id}.json`);
      }
    } catch (err: any) {
      setComments([]);
      setFilePath(`data/comments/comments_${id}.json`);
    }
  };

  const handleAddComment = () => {
    setComments(['{Great|Awesome} insight! 🔥', ...comments]);
  };

  const handleUpdateComment = (index: number, val: string) => {
    const updated = [...comments];
    updated[index] = val;
    setComments(updated);
  };

  const handleRemoveComment = (index: number) => {
    setComments(comments.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setComments(parsed);
          toast.success(`Successfully imported ${parsed.length} comments from ${file.name}`);
        } else {
          toast.error('JSON format must be an array of strings: ["comment 1", "comment 2"]');
        }
      } catch (err: any) {
        toast.error(`Error reading JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!commentsAccount) return;
    const clean = comments.map((c) => c.trim()).filter(Boolean);
    if (clean.length === 0) {
      toast.error('Please enter at least 1 comment template entry.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.saveAccountComments(commentsAccount.id, clean);
      if (res.success) {
        toast.success(`Payload bank for ${commentsAccount.label} saved successfully!`);
        closeCommentsModal();
        loadAccounts();
      } else {
        toast.error('Failed to save comments.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isCommentsModalOpen} onOpenChange={(open) => !open && closeCommentsModal()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <MessageSquare className="h-3.5 w-3.5" />
            NODE PAYLOAD STORAGE
          </div>
          <DialogTitle>
            Payload Bank: {commentsAccount?.label} (@{commentsAccount?.username || 'user'})
          </DialogTitle>
          <DialogDescription>
            Target File: <code className="text-amber-400">{filePath}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-2 pr-1">
          {/* File Uploader Dropzone */}
          <div className="flex flex-col items-center justify-between gap-3 rounded-md border border-dashed border-slate-700 bg-obsidian-950 p-3.5 sm:flex-row">
            <div className="flex items-center gap-3">
              <FileJson className="h-6 w-6 shrink-0 text-amber-400" />
              <div>
                <div className="text-xs font-semibold text-white">
                  Import Comments from .JSON File
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Format: [&quot;Awesome insight!&quot;, &quot;&#123;Option 1|Option 2&#125;&quot;]
                </div>
              </div>
            </div>

            <label className="shrink-0 cursor-pointer">
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-obsidian-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-obsidian-750 hover:text-white">
                <Upload className="h-3.5 w-3.5" />
                Upload JSON
              </span>
            </label>
          </div>

          {/* AI Reply Generator from Post */}
          <div className="space-y-2 rounded-md border border-flame/30 bg-flame/5 p-3">
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-flame">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-flame" />
                AI REPLY GENERATOR (FROM POST)
              </span>
              <button
                type="button"
                onClick={() => setIsAiOpen(!isAiOpen)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                {isAiOpen ? 'Close Panel' : 'Open Generator'}
              </button>
            </div>

            {isAiOpen && (
              <div className="mt-2 space-y-2.5 border-t border-flame/20 pt-2">
                <Textarea
                  rows={2}
                  value={aiPostInput}
                  onChange={(e) => setAiPostInput(e.target.value)}
                  placeholder="Paste target tweet / post text here..."
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-slate-400">Count:</span>
                    {[10, 15, 20].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setAiCount(cnt)}
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          aiCount === cnt
                            ? 'bg-flame text-white'
                            : 'bg-obsidian-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleAiGenerate}
                    disabled={isAiGenerating || !aiPostInput.trim()}
                    className="h-7 gap-1 font-mono text-xs font-bold"
                  >
                    <Sparkles className="h-3 w-3" />
                    {isAiGenerating ? 'Generating...' : `Generate ${aiCount} Replies`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Niche Presets Quick-Loader */}
          <div className="space-y-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-amber-300">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                LOAD FROM CURATED PRESET LIBRARY
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_LIBRARY.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setComments([...preset.templates]);
                    toast.success(`Loaded ${preset.templates.length} templates from "${preset.name}"!`);
                  }}
                  className="cursor-pointer rounded border border-slate-700 bg-obsidian-950 px-2.5 py-1 font-mono text-[10px] font-medium text-slate-200 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Stack List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-300">
                ACTIVE COMMENTS ({comments.length} ENTRIES)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddComment}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add Entry
              </Button>
            </div>

            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {comments.map((comment, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => handleUpdateComment(idx, e.target.value)}
                    className="font-mono text-xs"
                    placeholder="Supports spintax {Option 1|Option 2}..."
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 shrink-0 px-2.5"
                    onClick={() => handleRemoveComment(idx)}
                    title="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" onClick={closeCommentsModal}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="font-heading font-bold"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save Payload Bank'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
