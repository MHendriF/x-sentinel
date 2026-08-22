import React, { useState } from 'react';
import { AccountNode, apiClient, ProxyTestResult } from '@/services/apiClient';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Zap,
  Settings as SettingsIcon,
  Trash2,
  Globe,
  MessageSquare,
  CheckCircle2,
  HelpCircle,
  Power,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface NodeCardProps {
  account: AccountNode;
}

export const NodeCard: React.FC<NodeCardProps> = ({ account }) => {
  const { loadAccounts, openAccountModal, openCommentsModal } = useStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPingingProxy, setIsPingingProxy] = useState(false);
  const [proxyTest, setProxyTest] = useState<ProxyTestResult | null>(null);

  const handleToggle = async () => {
    try {
      await apiClient.toggleAccount(account.id);
      loadAccounts();
      toast.success(
        account.enabled !== false
          ? `Node ${account.label} dinonaktifkan.`
          : `Node ${account.label} diaktifkan.`
      );
    } catch (err: any) {
      toast.error(`Gagal mengubah status: ${err.message}`);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await apiClient.verifyAccount(account.id);
      if (res.success && res.account) {
        toast.success(`Node Terverifikasi: @${res.account.username} (${res.account.name})`);
      } else {
        toast.error(`Verifikasi gagal: ${res.message}`);
      }
      loadAccounts();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePingProxy = async () => {
    setIsPingingProxy(true);
    try {
      const res = await apiClient.testAccountProxy(account.id);
      setProxyTest(res);
      if (res.isDirect) {
        toast.info('Node menggunakan koneksi Direct IP (tanpa proxy).');
      } else if (res.success) {
        toast.success(`Proxy Online: ${res.ip} (${res.country}) · Latency: ${res.latency}ms`);
      } else {
        toast.error(`Proxy Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Gagal menguji proxy: ${err.message}`);
    } finally {
      setIsPingingProxy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus node "${account.label}"?`)) return;
    try {
      await apiClient.deleteAccount(account.id);
      loadAccounts();
      toast.success(`Node ${account.label} berhasil dihapus.`);
    } catch (err: any) {
      toast.error(`Gagal menghapus node: ${err.message}`);
    }
  };

  const cleanProxy = account.proxy
    ? account.proxy.replace(/http:\/\/[^@]*@/, '').replace(/socks5:\/\/[^@]*@/, '')
    : null;

  return (
    <div
      className={`rounded-lg border border-border/80 bg-obsidian-850 p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:border-slate-600/80 shadow-md ${
        account.enabled === false ? 'opacity-50 grayscale' : ''
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={account.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'}
              alt={account.label}
              className="w-10 h-10 rounded-md border border-slate-700 object-cover bg-obsidian-950"
            />
            <div>
              <h4 className="font-heading font-semibold text-sm text-white tracking-tight leading-snug">
                {account.label || 'Node'}
              </h4>
              <div className="font-mono text-xs text-flame">
                @{account.username || 'unverified'}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant={account.enabled !== false ? 'secondary' : 'outline'}
            className="h-7 text-xs font-mono"
            onClick={handleToggle}
          >
            <Power className="w-3 h-3 mr-1" />
            {account.enabled !== false ? 'ONLINE' : 'PAUSED'}
          </Button>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
          {account.isValid ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              VALID SESSION
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-slate-400">
              <HelpCircle className="w-3 h-3" />
              UNVERIFIED
            </Badge>
          )}

          {cleanProxy ? (
            <Badge variant="purple" className="gap-1 max-w-[190px] truncate" title={account.proxy}>
              <Globe className="w-3 h-3" />
              {cleanProxy}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-500 text-[10px]">
              DIRECT IP
            </Badge>
          )}

          {/* Proxy Ping Live Status */}
          {proxyTest && !proxyTest.isDirect && (
            <Badge
              variant={proxyTest.success ? 'success' : 'destructive'}
              className="gap-1 animate-in fade-in text-[10px]"
            >
              {proxyTest.success ? (
                <>
                  <Wifi className="w-3 h-3" />
                  {proxyTest.latency}ms · {proxyTest.countryCode || 'OK'}
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  DEAD ({proxyTest.latency}ms)
                </>
              )}
            </Badge>
          )}

          <Badge
            variant="default"
            className="cursor-pointer gap-1 hover:bg-amber-500/20 transition-colors"
            onClick={() => openCommentsModal(account)}
          >
            <MessageSquare className="w-3 h-3" />
            {account.commentsCount ?? 3} PAYLOADS
          </Badge>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-1.5 pt-3 border-t border-border/60">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 text-xs"
          onClick={handleVerify}
          disabled={isVerifying}
        >
          <Zap className="w-3 h-3 mr-1 text-amber-400" />
          {isVerifying ? 'PROBING...' : 'Verify Session'}
        </Button>

        {account.proxy && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs px-2"
            onClick={handlePingProxy}
            disabled={isPingingProxy}
            title="Ping Proxy Latency & Location"
          >
            <Activity className={`w-3.5 h-3.5 ${isPingingProxy ? 'animate-spin text-flame' : 'text-purple-400'}`} />
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="text-xs px-2"
          onClick={() => openAccountModal(account)}
          title="Edit Node Config"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </Button>

        <Button
          size="sm"
          variant="destructive"
          className="text-xs px-2"
          onClick={handleDelete}
          title="Remove Node"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
