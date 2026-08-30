import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, ProxyTestResult } from '@/services/apiClient';
import { isValidProxyFormat, PROXY_FORMAT_HINT } from '@/lib/proxy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Eye,
  EyeOff,
  Key,
  Shield,
  Globe,
  Save,
  ClipboardPaste,
  HelpCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const AccountModal: React.FC = () => {
  const { isAccountModalOpen, editingAccount, closeAccountModal, loadAccounts } = useStore();

  const [label, setLabel] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [ct0, setCt0] = useState('');
  const [proxy, setProxy] = useState('');
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showCt0, setShowCt0] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Proxy test in modal
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyResult, setProxyResult] = useState<ProxyTestResult | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);

  // Guide drawer
  const [showGuide, setShowGuide] = useState(false);
  const [rawPasteText, setRawPasteText] = useState('');
  const [showRawPaste, setShowRawPaste] = useState(false);

  // A typed value that differs from the masked prefill will REPLACE the stored
  // secret on save — surface it so the masked display can't hide the change.
  const authTokenChanged =
    !!editingAccount && authToken.trim().length > 0 && authToken !== editingAccount.auth_token;
  const ct0Changed = !!editingAccount && ct0.trim().length > 0 && ct0 !== editingAccount.ct0;
  const proxyChanged =
    !!editingAccount &&
    proxy.trim().length > 0 &&
    !proxy.includes('••••') &&
    proxy !== editingAccount.proxy;

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
    setProxyResult(null);
    setProxyError(null);
    setShowGuide(false);
    setShowRawPaste(false);
    setRawPasteText('');
  }, [editingAccount, isAccountModalOpen]);

  // Smart Extractor for Cookies
  const parseAndFillCookies = (text: string) => {
    if (!text || !text.trim()) {
      toast.error('Teks kosong.');
      return false;
    }

    let foundAuth = '';
    let foundCt0 = '';

    // 1. Try JSON Parse
    try {
      const parsed = JSON.parse(text.trim());
      if (parsed.auth_token) foundAuth = parsed.auth_token;
      if (parsed.ct0) foundCt0 = parsed.ct0;
    } catch (e) {
      // ignore
    }

    // 2. Parse from Raw Cookie Header (e.g. auth_token=abcdef...; ct0=12345...)
    if (!foundAuth) {
      const match =
        text.match(/auth_token=([^;]+)/i) ||
        text.match(/auth_token[:=]\s*["']?([a-f0-9]{30,50})["']?/i);
      if (match) foundAuth = match[1].trim();
    }
    if (!foundCt0) {
      const match =
        text.match(/ct0=([^;]+)/i) || text.match(/ct0[:=]\s*["']?([a-f0-9]{30,200})["']?/i);
      if (match) foundCt0 = match[1].trim();
    }

    // 3. Direct 40-char hex string check
    if (!foundAuth && /^[a-f0-9]{40}$/i.test(text.trim())) {
      foundAuth = text.trim();
    }

    if (foundAuth) {
      setAuthToken(foundAuth);
      if (foundCt0) setCt0(foundCt0);
      if (!label) setLabel(`Node-${Date.now().toString().slice(-4)}`);
      toast.success(
        foundCt0 ? 'Berhasil mengekstrak auth_token & ct0!' : 'Berhasil mengekstrak auth_token!'
      );
      setShowRawPaste(false);
      setRawPasteText('');
      return true;
    } else {
      toast.error('Tidak ditemukan auth_token dalam teks yang dimasukkan.');
      return false;
    }
  };

  const handleSmartClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        parseAndFillCookies(text);
      } else {
        setShowRawPaste(true);
      }
    } catch (err) {
      setShowRawPaste(true);
    }
  };

  const handleTestProxyInModal = async () => {
    if (!proxy.trim()) {
      toast.error('Masukkan string proxy terlebih dahulu.');
      return;
    }
    // Masked values are resolved server-side; raw values must be well-formed.
    if (!proxy.includes('••••') && !isValidProxyFormat(proxy)) {
      setProxyError(PROXY_FORMAT_HINT);
      toast.error(`Format proxy tunnel tidak valid. ${PROXY_FORMAT_HINT}`);
      return;
    }
    setProxyError(null);

    setIsTestingProxy(true);
    try {
      // Masked field = stored proxy. Test the real credentials server-side —
      // the masked string itself can never succeed (credentials are hidden).
      const res =
        editingAccount && proxy.includes('••••')
          ? await apiClient.testAccountProxy(editingAccount.id)
          : await apiClient.testProxy(proxy.trim());
      setProxyResult(res);
      if (res.success) {
        toast.success(`Proxy Valid: ${res.ip} (${res.country}) · ${res.latency}ms`);
      } else {
        toast.error(`Proxy Gagal: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error pengujian proxy: ${err.message}`);
    } finally {
      setIsTestingProxy(false);
    }
  };

  const handleSave = async () => {
    if (!authToken.trim()) {
      toast.error('auth_token cookie wajib diisi.');
      return;
    }
    if (proxy.trim() && !proxy.includes('••••') && !isValidProxyFormat(proxy)) {
      setProxyError(PROXY_FORMAT_HINT);
      toast.error(`Format proxy tunnel tidak valid. ${PROXY_FORMAT_HINT}`);
      return;
    }
    setProxyError(null);

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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
              NODE REGISTRATION DECK
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowGuide(!showGuide)}
              className="h-6 gap-1 px-2 font-mono text-[11px] text-flame hover:bg-flame/10"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {showGuide ? 'Tutup Panduan' : 'Cara Ambil Cookie'}
            </Button>
          </div>
          <DialogTitle>
            {editingAccount ? `Edit Node: ${editingAccount.label}` : 'Register New X Node'}
          </DialogTitle>
          <DialogDescription>
            Masukkan cookie autentikasi dan proxy untuk mengonfigurasi cluster akun.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Smart Paste Header Bar */}
          <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
              <Sparkles className="h-4 w-4 shrink-0 text-flame" />
              <span>Smart Paste Header Cookie / Text</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="default"
                onClick={handleSmartClipboardPaste}
                className="h-7 gap-1 font-mono text-xs font-bold"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste Auto
              </Button>
            </div>
          </div>

          {/* Raw Paste Textarea Input (if clipboard auto-read fails or manual paste) */}
          {showRawPaste && (
            <div className="animate-in fade-in space-y-2 rounded-md border border-slate-700 bg-obsidian-950 p-3">
              <div className="flex items-center justify-between font-mono text-xs text-slate-300">
                <span>Tempel String Header Cookie / JSON di sini:</span>
                <button
                  onClick={() => setShowRawPaste(false)}
                  className="text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <Textarea
                rows={3}
                placeholder="auth_token=40_karakter; ct0=160_karakter; atau paste seluruh header cookie..."
                value={rawPasteText}
                onChange={(e) => setRawPasteText(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => parseAndFillCookies(rawPasteText)}
                className="w-full font-mono text-xs"
              >
                Ekstrak & Isi Otomatis
              </Button>
            </div>
          )}

          {/* Step-by-Step Guide Drawer */}
          {showGuide && (
            <div className="animate-in fade-in-50 space-y-3 rounded-md border border-slate-700 bg-obsidian-950 p-3.5 font-mono text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <HelpCircle className="h-4 w-4 text-flame" />
                PANDUAN MENGAMBIL COOKIE (HTTPONLY X.COM):
              </div>
              <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                <p className="text-amber-400">
                  ⚠️{' '}
                  <em>
                    Catatan: Cookie <code>auth_token</code> memiliki proteksi{' '}
                    <code>HttpOnly: true</code> oleh X, sehingga tidak bisa dibaca via
                    script/bookmarklet JavaScript biasa.
                  </em>
                </p>

                <div className="space-y-1.5 rounded border border-slate-800 bg-obsidian-900 p-2.5">
                  <div className="font-bold text-white">⚡ Cara Tercepat (Copy Header Cookie):</div>
                  <ol className="list-decimal space-y-1 pl-4 text-slate-300">
                    <li>
                      Buka <strong>x.com</strong> di browser (pastikan sudah login).
                    </li>
                    <li>
                      Tekan <strong>F12</strong> (DevTools) &gt; pilih tab <strong>Network</strong>.
                    </li>
                    <li>
                      Klik sembarang request (misal: <code>home</code>, <code>graphql</code>, atau
                      reload halaman).
                    </li>
                    <li>
                      Di tab <strong>Headers</strong> &gt; cari bagian{' '}
                      <strong>Request Headers</strong> &gt; baris <code>cookie:</code>.
                    </li>
                    <li>
                      Klik kanan baris <code>cookie:</code> &gt; pilih <strong>Copy value</strong>.
                    </li>
                    <li>
                      Klik tombol <strong>Paste Auto</strong> di atas! (Sistem akan otomatis
                      mengekstrak <code>auth_token</code> &amp; <code>ct0</code>).
                    </li>
                  </ol>
                </div>

                <div className="space-y-1.5 rounded border border-slate-800 bg-obsidian-900 p-2.5">
                  <div className="font-bold text-white">🔍 Cara Manual (Tab Application):</div>
                  <ol className="list-decimal space-y-1 pl-4 text-slate-300">
                    <li>
                      Tekan <strong>F12</strong> &gt; pilih tab <strong>Application</strong>{' '}
                      (Storage).
                    </li>
                    <li>
                      Di menu kiri: <strong>Cookies</strong> &gt; klik <code>https://x.com</code>.
                    </li>
                    <li>
                      Double-click nilai pada baris <strong>auth_token</strong> &gt; Copy &gt; Paste
                      ke field bawah.
                    </li>
                    <li>
                      Lakukan hal yang sama untuk <strong>ct0</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

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
              <label className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-300">
                <Key className="h-3.5 w-3.5 text-flame" />
                COOKIE: AUTH_TOKEN <span className="text-flame">*</span>
              </label>
              <span className="font-mono text-[10px] text-muted-foreground">40 karakter hex</span>
            </div>
            <div className="relative">
              <Input
                type={showAuthToken ? 'text' : 'password'}
                placeholder="Paste 40 karakter auth_token hex di sini..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                onClick={() => setShowAuthToken(!showAuthToken)}
              >
                {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {editingAccount && (
              <p className="font-mono text-[10px] text-slate-500">
                Tersimpan (disamarkan): {editingAccount.auth_token} — biarkan apa adanya untuk
                mempertahankan, atau tempel cookie baru untuk mengganti.
              </p>
            )}
            {authTokenChanged && (
              <p className="font-mono text-[10px] font-bold text-amber-400">
                ● Nilai baru terdeteksi — cookie auth_token akan DIGANTI saat disimpan.
              </p>
            )}
          </div>

          {/* ct0 (CSRF Token) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-300">
                <Shield className="h-3.5 w-3.5 text-blue-400" />
                COOKIE: CT0 (CSRF TOKEN)
              </label>
              <span className="font-mono text-[10px] text-muted-foreground">160 karakter hex</span>
            </div>
            <div className="relative">
              <Input
                type={showCt0 ? 'text' : 'password'}
                placeholder="Paste 160 karakter ct0 hex di sini..."
                value={ct0}
                onChange={(e) => setCt0(e.target.value)}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                onClick={() => setShowCt0(!showCt0)}
              >
                {showCt0 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {editingAccount && editingAccount.ct0 && (
              <p className="font-mono text-[10px] text-slate-500">
                Tersimpan (disamarkan): {editingAccount.ct0} — biarkan apa adanya untuk
                mempertahankan, atau tempel ct0 baru untuk mengganti.
              </p>
            )}
            {ct0Changed && (
              <p className="font-mono text-[10px] font-bold text-amber-400">
                ● Nilai baru terdeteksi — cookie ct0 akan DIGANTI saat disimpan.
              </p>
            )}
          </div>

          {/* Proxy with Test Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-300">
                <Globe className="h-3.5 w-3.5 text-purple-400" />
                DEDICATED PROXY TUNNEL
              </label>
              <span className="font-mono text-[10px] text-muted-foreground">HTTP/SOCKS5</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="user:pass@ip:port atau ip:port:user:pass"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleTestProxyInModal}
                disabled={isTestingProxy || !proxy.trim()}
                className="h-9 shrink-0 gap-1 px-3 font-mono text-xs"
              >
                <Activity
                  className={`h-3.5 w-3.5 ${isTestingProxy ? 'animate-spin text-flame' : 'text-purple-400'}`}
                />
                {isTestingProxy ? 'Ping...' : 'Test'}
              </Button>
            </div>
            {editingAccount && editingAccount.proxy && (
              <p className="font-mono text-[10px] text-slate-500">
                Tersimpan (disamarkan): {editingAccount.proxy} — biarkan apa adanya untuk
                mempertahankan, atau masukkan proxy baru untuk mengganti. Test memakai kredensial
                tersimpan.
              </p>
            )}
            {proxyChanged && (
              <p className="font-mono text-[10px] font-bold text-amber-400">
                ● Nilai baru terdeteksi — proxy tunnel akan DIGANTI saat disimpan.
              </p>
            )}
            {proxyError && <p className="font-mono text-[10px] text-red-400">✕ {proxyError}</p>}

            {/* Proxy Test Result Badge */}
            {proxyResult && (
              <div
                className={`mt-2 flex items-center justify-between rounded-md border p-2 font-mono text-xs ${
                  proxyResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-400'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {proxyResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">
                    {proxyResult.success
                      ? `IP: ${proxyResult.ip} · ${proxyResult.country} (${proxyResult.city || ''})`
                      : proxyResult.message}
                  </span>
                </div>
                <span className="ml-2 shrink-0 font-bold">{proxyResult.latency}ms</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-2">
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
            <Save className="mr-1 h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save & Register Node'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
