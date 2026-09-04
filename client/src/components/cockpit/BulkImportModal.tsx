import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose }) => {
  const { loadAccounts } = useStore();
  const [rawText, setRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const sampleFormat = `# Format 1: token:ct0:proxy:Label
3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b:31.56.70.92:1338:Node Alpha

# Format 2: token:ct0:user:pass@ip:port:Label
3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b:usr:pwd@31.56.70.92:1338:Node Beta

# Format 3: Direct IP (no proxy): token:ct0:Label
3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b:Node Gamma`;

  const handleImport = async () => {
    if (!rawText.trim()) {
      toast.error('Please enter account data first.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await apiClient.bulkImportAccounts({ rawText: rawText.trim() });
      if (res.success && res.addedCount > 0) {
        toast.success(`Successfully imported ${res.addedCount} fleet node accounts!`);
        setRawText('');
        loadAccounts();
        onClose();
      } else {
        toast.error(`Import failed: ${res.message || 'Invalid data format'}`);
      }
    } catch (err: any) {
      toast.error(`Error during import: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportBackup = () => {
    window.open('/api/accounts/export', '_blank');
    toast.success('Downloading fleet node account backup (JSON)...');
  };

  // Preview lines count
  const validLinesCount = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#')).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border-border/80 bg-obsidian-900 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-cyan-400">
              <UploadCloud className="h-4 w-4 text-cyan-400" />
              FLEET MANAGEMENT · BULK ONBOARDING
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              className="h-7 gap-1.5 border-slate-700 font-mono text-xs text-slate-300 hover:bg-slate-800"
            >
              <Download className="h-3 w-3 text-emerald-400" />
              Export Fleet Backup (.json)
            </Button>
          </div>
          <DialogTitle className="font-heading text-lg text-white">
            Bulk Import Multi-Node Fleet
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Paste multiple accounts at once (1 line per account) to onboard your fleet in seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Format Helper Info */}
          <div className="space-y-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3 font-mono text-xs">
            <div className="flex items-center justify-between font-bold text-cyan-300">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                SUPPORTED FORMATS (Colon ':' or Pipe '|' delimiter)
              </span>
              <button
                type="button"
                onClick={() => setRawText(sampleFormat)}
                className="cursor-pointer text-[10px] text-cyan-400 underline hover:text-cyan-200"
              >
                + Load Sample Format
              </button>
            </div>
            <div className="text-[11px] leading-relaxed text-slate-400">
              <code>auth_token:ct0:proxy:label</code> or{' '}
              <code>auth_token:ct0:user:pass@ip:port:label</code>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-bold text-slate-300">
                RAW ACCOUNTS DATA
              </label>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {validLinesCount} NODES DETECTED
              </Badge>
            </div>
            <Textarea
              rows={9}
              placeholder={`Paste accounts here...\nExample:\n3a1b2c...:1a2b3c...:31.56.70.92:1338:Node Alpha\n3a1b2c...:1a2b3c...:usr:pwd@31.56.70.92:1338:Node Beta`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="border-slate-700 bg-obsidian-950/90 font-mono text-xs leading-relaxed placeholder:text-slate-600"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-border/80 pt-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="font-mono text-xs text-slate-400"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={handleImport}
            disabled={isImporting || validLinesCount === 0}
            className="gap-1.5 bg-cyan-600 font-mono text-xs font-bold text-white hover:bg-cyan-500"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {isImporting ? 'Importing Fleet...' : `Import ${validLinesCount} Nodes Now`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
