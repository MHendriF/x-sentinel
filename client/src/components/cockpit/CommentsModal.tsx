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
import { Plus, Upload, Trash2, Save, FileJson, MessageSquare, Sparkles, Layers } from 'lucide-react';
import { PRESET_LIBRARY } from '@/lib/presetLibrary';

export const CommentsModal: React.FC = () => {
  const { isCommentsModalOpen, commentsAccount, closeCommentsModal, loadAccounts } = useStore();

  const [comments, setComments] = useState<string[]>([]);
  const [filePath, setFilePath] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    setComments(['{Keren|Mantap} banget infonya! 🔥', ...comments]);
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
          toast.success(`Berhasil mengimpor ${parsed.length} komentar dari ${file.name}`);
        } else {
          toast.error('Format JSON harus berupa array string: ["komen 1", "komen 2"]');
        }
      } catch (err: any) {
        toast.error(`Error membaca file JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!commentsAccount) return;
    const clean = comments.map((c) => c.trim()).filter(Boolean);
    if (clean.length === 0) {
      toast.error('Setidaknya masukkan 1 baris template komentar.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.saveAccountComments(commentsAccount.id, clean);
      if (res.success) {
        toast.success(`Bank payload untuk ${commentsAccount.label} berhasil disimpan!`);
        closeCommentsModal();
        loadAccounts();
      } else {
        toast.error('Gagal menyimpan komentar.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isCommentsModalOpen} onOpenChange={(open) => !open && closeCommentsModal()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-flame tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            NODE PAYLOAD STORAGE
          </div>
          <DialogTitle>
            Payload Bank: {commentsAccount?.label} (@{commentsAccount?.username || 'user'})
          </DialogTitle>
          <DialogDescription>
            File Target: <code className="text-amber-400">{filePath}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* File Uploader Dropzone */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-md border border-dashed border-slate-700 bg-obsidian-950">
            <div className="flex items-center gap-3">
              <FileJson className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Import Komentar dari File .JSON</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Format: [&quot;Keren banget!&quot;, &quot;&#123;Opsi 1|Opsi 2&#125;&quot;]
                </div>
              </div>
            </div>

            <label className="cursor-pointer shrink-0">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-obsidian-800 text-xs font-semibold text-slate-200 hover:bg-obsidian-750 hover:text-white transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Upload JSON
              </span>
            </label>
          </div>

          {/* Niche Presets Quick-Loader */}
          <div className="space-y-1.5 p-3 rounded-md border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
                    toast.success(`Memuat ${preset.templates.length} template "${preset.name}"!`);
                  }}
                  className="px-2.5 py-1 rounded text-[10px] font-mono font-medium bg-obsidian-950 border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-200 hover:text-amber-300 transition-all cursor-pointer"
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
              <Button size="sm" variant="outline" onClick={handleAddComment} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" />
                Add Entry
              </Button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {comments.map((comment, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => handleUpdateComment(idx, e.target.value)}
                    className="text-xs font-mono"
                    placeholder="Mendukung spintax {Opsi 1|Opsi 2}..."
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="px-2.5 h-9 shrink-0"
                    onClick={() => handleRemoveComment(idx)}
                    title="Hapus baris"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border/60">
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
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Payload Bank'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
