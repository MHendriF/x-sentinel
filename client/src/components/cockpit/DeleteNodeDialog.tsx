import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  Trash2,
  Globe,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const DeleteNodeDialog: React.FC = () => {
  const { isDeleteModalOpen, deletingAccount, closeDeleteModal, loadAccounts } = useStore();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!deletingAccount) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiClient.deleteAccount(deletingAccount.id);
      if (res.success) {
        toast.success(`Node "${deletingAccount.label}" berhasil didekomisi dan dihapus.`);
        closeDeleteModal();
        loadAccounts();
      } else {
        toast.error(`Gagal menghapus node: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cleanProxy = deletingAccount.proxy
    ? deletingAccount.proxy.replace(/http:\/\/[^@]*@/, '').replace(/socks5:\/\/[^@]*@/, '')
    : null;

  return (
    <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
      <DialogContent className="max-w-md border-red-500/30 bg-obsidian-900 shadow-2xl">
        <DialogHeader className="border-b-red-500/20">
          <div className="flex items-center gap-2 text-red-400 font-mono text-[10px] font-bold tracking-wider">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            CRITICAL SYSTEM ACTION · DECOMMISSION NODE
          </div>
          <DialogTitle className="text-lg text-white font-heading">
            Konfirmasi Hapus Node Akun?
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Tindakan ini akan mencabut node dari sistem dan menghapus file konfigurasinya.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          {/* Target Account Summary Card */}
          <div className="p-3.5 rounded-lg border border-red-500/20 bg-obsidian-950/80 flex items-start gap-3">
            <img
              src={deletingAccount.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'}
              alt={deletingAccount.label}
              className="w-12 h-12 rounded-md border border-slate-700 object-cover bg-obsidian-900 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-heading font-bold text-sm text-white truncate">
                  {deletingAccount.label}
                </h4>
                {deletingAccount.isValid ? (
                  <Badge variant="success" className="h-5 text-[9px] gap-1 px-1.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> VALID
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="h-5 text-[9px] text-slate-400 px-1.5">
                    <HelpCircle className="w-2.5 h-2.5" /> UNVERIFIED
                  </Badge>
                )}
              </div>

              <div className="font-mono text-xs text-flame">
                @{deletingAccount.username || 'unverified'}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {cleanProxy ? (
                  <Badge variant="purple" className="text-[10px] gap-1 max-w-[170px] truncate">
                    <Globe className="w-2.5 h-2.5" /> {cleanProxy}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-500">
                    DIRECT IP
                  </Badge>
                )}

                <Badge variant="default" className="text-[10px] gap-1">
                  <MessageSquare className="w-2.5 h-2.5" /> {deletingAccount.commentsCount ?? 3} Payloads
                </Badge>
              </div>
            </div>
          </div>

          {/* Destructive Warning Box */}
          <div className="p-3 rounded-md border border-red-500/30 bg-red-500/10 flex items-start gap-2.5 text-xs text-red-300/90 font-mono leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-red-300 font-bold block mb-0.5">Dampak Penghapusan:</strong>
              Node ini tidak akan lagi diikutsertakan dalam rotasi batch atau feed hunter. Token otentikasi lokal akan dimusnahkan.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={closeDeleteModal}
            disabled={isDeleting}
            className="font-mono text-xs"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-heading font-bold gap-1.5 text-xs shadow-lg shadow-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Mendekomisi...' : 'Hapus & Dekomisi Node'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
