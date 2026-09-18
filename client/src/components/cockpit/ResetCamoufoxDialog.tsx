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
  Trash2,
  Globe,
  AlertTriangle,
  FolderX,
} from 'lucide-react';

export const ResetCamoufoxDialog: React.FC = () => {
  const { isResetCamoufoxModalOpen, resetCamoufoxAccount, closeResetCamoufoxModal, loadAccounts } =
    useStore();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!resetCamoufoxAccount) return null;

  const handleResetProfile = async () => {
    setIsDeleting(true);
    try {
      const res = await apiClient.deleteCamoufoxProfile(resetCamoufoxAccount.id);
      if (res.success) {
        toast.success(
          `Profil Camoufox untuk @${resetCamoufoxAccount.username || resetCamoufoxAccount.label} berhasil dihapus. Status kembali ke Default.`
        );
        closeResetCamoufoxModal();
        await loadAccounts();
      } else {
        toast.error(`Gagal menghapus profil Camoufox: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cleanProxy = extractProxyHostPort(resetCamoufoxAccount.proxy);
  const lastLoginFormatted = resetCamoufoxAccount.camoufoxProfile?.lastLoginAt
    ? new Date(resetCamoufoxAccount.camoufoxProfile.lastLoginAt).toLocaleString('id-ID')
    : 'Tidak diketahui';

  return (
    <Dialog
      open={isResetCamoufoxModalOpen}
      onOpenChange={(open) => !open && closeResetCamoufoxModal()}
    >
      <DialogContent className="max-w-md border-orange-500/30 bg-obsidian-900 shadow-2xl">
        <DialogHeader className="border-b-orange-500/20">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-orange-400">
            <span className="text-base">🦊</span>
            PENGATURAN SESI · HAPUS PROFIL CAMOUFOX
          </div>
          <DialogTitle className="font-heading text-lg text-white">
            Reset Profil Sesi Camoufox?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Tindakan ini akan menghapus data cache sesi Firefox Gecko persisten untuk node ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* Target Account Summary Card */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-500/20 bg-obsidian-950/80 p-3.5">
            <img
              src={
                resetCamoufoxAccount.avatar ||
                'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
              }
              alt={resetCamoufoxAccount.label}
              className="h-12 w-12 shrink-0 rounded-md border border-slate-700 bg-obsidian-900 object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="truncate font-heading text-sm font-bold text-white">
                  {resetCamoufoxAccount.label}
                </h4>
                <Badge
                  variant="outline"
                  className="h-5 gap-1 border-orange-500/40 bg-orange-500/10 px-1.5 text-[9px] font-mono text-orange-300"
                >
                  🦊 Native Active
                </Badge>
              </div>

              <div className="font-mono text-xs text-flame">
                @{resetCamoufoxAccount.username || 'unverified'}
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

                <span className="font-mono text-[10px] text-slate-400">
                  Login Terakhir: {lastLoginFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Directory Info Box */}
          <div className="rounded-md border border-slate-800 bg-obsidian-950/60 p-2.5 font-mono text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
              <FolderX className="h-3.5 w-3.5 text-orange-400" />
              <span>Direktori yang akan dibersihkan:</span>
            </div>
            <div className="truncate text-[10px] text-slate-500 select-all">
              data/camoufox_profiles/{resetCamoufoxAccount.id}
            </div>
          </div>

          {/* Warning / Explanation Box */}
          <div className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 font-mono text-xs leading-relaxed text-amber-200/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <strong className="mb-0.5 block font-bold text-amber-300">
                Dampak Penghapusan:
              </strong>
              Browser storage, IndexedDB, dan token sesi native Firefox akan dihapus dari disk. Kartu
              node akan kembali ke status default (tombol menjadi <strong>🦊 Login</strong>) sehingga
              Anda dapat melakukan login ulang dengan akun yang benar.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={closeResetCamoufoxModal}
            disabled={isDeleting}
            className="font-mono text-xs"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleResetProfile}
            disabled={isDeleting}
            className="gap-1.5 font-heading text-xs font-bold border border-red-500/40 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? 'Menghapus Profil...' : 'Hapus Sesi & Reset Profil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
