import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
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
import { Eye, EyeOff, Key, Shield, Globe, Save } from 'lucide-react';

export const AccountModal: React.FC = () => {
  const { isAccountModalOpen, editingAccount, closeAccountModal, loadAccounts } = useStore();

  const [label, setLabel] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [ct0, setCt0] = useState('');
  const [proxy, setProxy] = useState('');
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showCt0, setShowCt0] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingAccount) {
      setLabel(editingAccount.label || '');
      setAuthToken(editingAccount.auth_token || '');
      setCt0(editingAccount.ct0 || '');
      setProxy(editingAccount.proxy || '');
    } else {
      setLabel('');
      setAuthToken('');
      setCt0('');
      setProxy('');
    }
  }, [editingAccount, isAccountModalOpen]);

  const handleSave = async () => {
    if (!authToken.trim()) {
      toast.error('auth_token cookie wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        label: label.trim() || undefined,
        auth_token: authToken.trim(),
        ct0: ct0.trim() || undefined,
        proxy: proxy.trim() || undefined,
      };

      const res = editingAccount
        ? await apiClient.updateAccount(editingAccount.id, payload)
        : await apiClient.createAccount(payload);

      if (res.success) {
        toast.success(
          editingAccount
            ? `Node ${label || 'Akun'} berhasil diperbarui.`
            : 'Node baru berhasil didaftarkan.'
        );
        closeAccountModal();
        loadAccounts();
      } else {
        toast.error(`Gagal menyimpan akun: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isAccountModalOpen} onOpenChange={(open) => !open && closeAccountModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="font-mono text-[10px] font-bold text-flame tracking-wider">
            NODE REGISTRATION DECK
          </div>
          <DialogTitle>
            {editingAccount ? `Edit Node: ${editingAccount.label}` : 'Register New X Node'}
          </DialogTitle>
          <DialogDescription>
            Masukkan cookie autentikasi dan proxy untuk menambahkan node baru ke cluster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Label */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-semibold text-slate-300">
              NODE ALIAS / LABEL
            </label>
            <Input
              placeholder="e.g. Node-Alpha (Main Account)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* auth_token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-flame" />
                COOKIE: AUTH_TOKEN <span className="text-flame">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">wajib</span>
            </div>
            <div className="relative">
              <Input
                type={showAuthToken ? 'text' : 'password'}
                placeholder="40 karakter auth_token hex..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                onClick={() => setShowAuthToken(!showAuthToken)}
              >
                {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ct0 (CSRF Token) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                COOKIE: CT0 (CSRF TOKEN)
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">opsional / auto</span>
            </div>
            <div className="relative">
              <Input
                type={showCt0 ? 'text' : 'password'}
                placeholder="160 karakter ct0 hex..."
                value={ct0}
                onChange={(e) => setCt0(e.target.value)}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                onClick={() => setShowCt0(!showCt0)}
              >
                {showCt0 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Proxy */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              DEDICATED PROXY TUNNEL (OPTIONAL)
            </label>
            <Input
              placeholder="http://user:pass@host:port atau host:port:user:pass"
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500 font-mono">
              Mendukung format HTTP/HTTPS dan SOCKS5. Kosongkan untuk direct IP.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={closeAccountModal}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="font-heading font-bold"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isSaving ? 'Saving...' : 'Save & Register Node'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
