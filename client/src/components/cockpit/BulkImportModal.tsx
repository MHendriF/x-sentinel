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
  HelpCircle
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

# Format 3: Direct IP (tanpa proxy): token:ct0:Label
3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b:Node Gamma`;

  const handleImport = async () => {
    if (!rawText.trim()) {
      toast.error('Masukkan data akun terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await apiClient.bulkImportAccounts({ rawText: rawText.trim() });
      if (res.success && res.addedCount > 0) {
        toast.success(`Berhasil mengimpor ${res.addedCount} node armada akun!`);
        setRawText('');
        loadAccounts();
        onClose();
      } else {
        toast.error(`Impor gagal: ${res.message || 'Format data tidak valid'}`);
      }
    } catch (err: any) {
      toast.error(`Error saat mengimpor: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportBackup = () => {
    window.open('/api/accounts/export', '_blank');
    toast.success('Mengunduh backup seluruh armada node akun (JSON)...');
  };

  // Preview lines count
  const validLinesCount = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#')).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-obsidian-900 border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold tracking-wider">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              FLEET MANAGEMENT · BULK ONBOARDING
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              className="h-7 text-xs font-mono border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              Export Fleet Backup (.json)
            </Button>
          </div>
          <DialogTitle className="text-lg text-white font-heading">
            Bulk Import Multi-Node Fleet
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Tempelkan daftar akun sekaligus (1 baris per akun) untuk mendaftarkan armada node dalam hitungan detik.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Format Helper Info */}
          <div className="p-3 rounded-md border border-cyan-500/30 bg-cyan-500/5 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-cyan-300 font-bold">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                FORMAT DIDUKUNG (Pemisah Titik Dua ':' atau Pipe '|')
              </span>
              <button
                type="button"
                onClick={() => setRawText(sampleFormat)}
                className="text-[10px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
              >
                + Muat Contoh Format
              </button>
            </div>
            <div className="text-slate-400 text-[11px] leading-relaxed">
              <code>auth_token:ct0:proxy:label</code> atau <code>auth_token:ct0:user:pass@ip:port:label</code>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-bold text-slate-300">
                RAW ACCOUNTS DATA
              </label>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {validLinesCount} NODES TERDETEKSI
              </Badge>
            </div>
            <Textarea
              rows={9}
              placeholder={`Paste akun di sini...\nContoh:\n3a1b2c...:1a2b3c...:31.56.70.92:1338:Node Alpha\n3a1b2c...:1a2b3c...:usr:pwd@31.56.70.92:1338:Node Beta`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="text-xs font-mono bg-obsidian-950/90 border-slate-700 leading-relaxed placeholder:text-slate-600"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border/80 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs font-mono text-slate-400"
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={handleImport}
            disabled={isImporting || validLinesCount === 0}
            className="text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            {isImporting ? 'Mengimpor Armada...' : `Impor ${validLinesCount} Node Sekarang`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
