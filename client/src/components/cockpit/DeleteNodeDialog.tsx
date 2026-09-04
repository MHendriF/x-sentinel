import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, extractProxyHostPort } from '@/services/apiClient';
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
        toast.success(`Node "${deletingAccount.label}" successfully decommissioned and removed.`);
        closeDeleteModal();
        loadAccounts();
      } else {
        toast.error(`Failed to delete node: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cleanProxy = extractProxyHostPort(deletingAccount.proxy);

  return (
    <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
      <DialogContent className="max-w-md border-red-500/30 bg-obsidian-900 shadow-2xl">
        <DialogHeader className="border-b-red-500/20">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-red-400">
            <ShieldAlert className="h-4 w-4 animate-pulse text-red-500" />
            CRITICAL SYSTEM ACTION · DECOMMISSION NODE
          </div>
          <DialogTitle className="font-heading text-lg text-white">
            Confirm Delete Account Node?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            This action will revoke the node from the system and delete its local configuration file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* Target Account Summary Card */}
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-obsidian-950/80 p-3.5">
            <img
              src={
                deletingAccount.avatar ||
                'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
              }
              alt={deletingAccount.label}
              className="h-12 w-12 shrink-0 rounded-md border border-slate-700 bg-obsidian-900 object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="truncate font-heading text-sm font-bold text-white">
                  {deletingAccount.label}
                </h4>
                {deletingAccount.isValid ? (
                  <Badge variant="success" className="h-5 gap-1 px-1.5 text-[9px]">
                    <CheckCircle2 className="h-2.5 w-2.5" /> VALID
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[9px] text-slate-400">
                    <HelpCircle className="h-2.5 w-2.5" /> UNVERIFIED
                  </Badge>
                )}
              </div>

              <div className="font-mono text-xs text-flame">
                @{deletingAccount.username || 'unverified'}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {cleanProxy ? (
                  <Badge variant="purple" className="max-w-[170px] gap-1 truncate text-[10px]">
                    <Globe className="h-2.5 w-2.5" /> {cleanProxy}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-500">
                    DIRECT IP
                  </Badge>
                )}

                <Badge variant="default" className="gap-1 text-[10px]">
                  <MessageSquare className="h-2.5 w-2.5" /> {deletingAccount.commentsCount ?? 3}{' '}
                  Payloads
                </Badge>
              </div>
            </div>
          </div>

          {/* Destructive Warning Box */}
          <div className="flex items-start gap-2.5 rounded-md border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs leading-relaxed text-red-300/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>
              <strong className="mb-0.5 block font-bold text-red-300">Decommission Impact:</strong>
              This node will no longer be included in batch rotations or feed hunter sweeps. Local
              authentication tokens will be destroyed.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={closeDeleteModal}
            disabled={isDeleting}
            className="font-mono text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-1.5 font-heading text-xs font-bold shadow-lg shadow-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? 'Decommissioning...' : 'Delete & Decommission Node'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
