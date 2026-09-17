import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, FileJson } from 'lucide-react';

interface AccountOption {
  id: string;
  label?: string;
  username?: string;
}

interface SavePayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  replies: string[];
  accounts: AccountOption[];
  onSavedSuccess: (fileName: string) => void;
  initialFileName?: string;
}

export const SavePayloadModal: React.FC<SavePayloadModalProps> = ({
  isOpen,
  onClose,
  replies,
  accounts,
  onSavedSuccess,
  initialFileName,
}) => {
  const [saveFileName, setSaveFileName] = useState(
    initialFileName || `post_replies_${replies.length || 15}.json`
  );
  const [targetAccountId, setTargetAccountId] = useState('');
  const [saveToTemplates, setSaveToTemplates] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSaveFileName(initialFileName || `post_replies_${replies.length || 15}.json`);
    }
  }, [isOpen, initialFileName, replies.length]);

  const handleSavePayloadFile = async () => {
    if (replies.length === 0) {
      toast.error('No replies generated yet.');
      return;
    }
    if (!saveFileName.trim()) {
      toast.error('File name is required.');
      return;
    }

    setIsSavingFile(true);
    try {
      const res = await apiClient.savePayloadFile({
        fileName: saveFileName.trim(),
        replies,
        targetAccountId: targetAccountId || undefined,
        saveToTemplates,
      });

      if (res.success) {
        toast.success(res.message || `File ${res.fileName} saved successfully!`);
        onSavedSuccess(res.fileName || saveFileName.trim());
        onClose();
      } else {
        toast.error(res.message || 'Failed to save file.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSavingFile(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-border/80 bg-obsidian-950 text-slate-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <FileJson className="h-3.5 w-3.5" />
            SAVE PAYLOAD TO VAULT
          </div>
          <DialogTitle className="font-heading text-lg font-bold text-white">
            Save as .JSON File
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Export {replies.length} anti-slop replies into the{' '}
            <code className="rounded bg-obsidian-900 px-1 py-0.5 text-amber-300">
              data/comments/
            </code>{' '}
            directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File Name */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-semibold text-slate-200">FILE NAME</label>
            <Input
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              placeholder="e.g. post_replies_15.json"
              className="border-slate-800 bg-obsidian-900 font-mono text-xs text-slate-200 focus-visible:border-flame/50"
            />
            <span className="font-mono text-[10px] text-slate-500">
              Target path: <code>data/comments/{saveFileName || '*.json'}</code>
            </span>
          </div>

          {/* Target Account Linkage */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-semibold text-slate-200">
              LINK TO FLEET NODE (OPTIONAL)
            </label>
            <select
              className="w-full rounded-md border border-slate-800 bg-obsidian-900 p-2 font-mono text-xs text-slate-200 focus:border-flame/50 focus:outline-none"
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
            >
              <option value="">-- Do not link (Save file only) --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.label || acc.username || acc.id} (@{acc.username || 'user'})
                </option>
              ))}
            </select>
            <span className="font-mono text-[10px] text-slate-500">
              Directly loads this payload into the selected node for instant execution.
            </span>
          </div>

          {/* Global Templates Checkbox */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-800/80 bg-obsidian-900/60 p-3 text-xs text-slate-300 transition-colors hover:border-slate-700">
            <input
              type="checkbox"
              checked={saveToTemplates}
              onChange={(e) => setSaveToTemplates(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-obsidian-950 text-flame focus:ring-0"
            />
            <div>
              <span className="font-medium text-slate-200">
                Also inject into Global Fallback Pool
              </span>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                Appends replies to <code>templates.json</code> for nodes without dedicated files.
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSavePayloadFile}
            disabled={isSavingFile}
            className="gap-1.5 bg-gradient-to-r from-flame to-amber-500 font-heading text-xs font-bold text-white shadow-lg shadow-flame/20 hover:brightness-110"
          >
            {isSavingFile ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
