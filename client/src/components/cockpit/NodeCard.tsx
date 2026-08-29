import React, { useState } from 'react';
import {
  AccountNode,
  apiClient,
  ProxyTestResult,
  extractProxyHostPort,
} from '@/services/apiClient';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
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
  Flame,
  AlertTriangle,
  HeartPulse,
} from 'lucide-react';

interface NodeCardProps {
  account: AccountNode;
}

export const NodeCard: React.FC<NodeCardProps> = ({ account }) => {
  const { loadAccounts, openAccountModal, openCommentsModal, openDeleteModal } = useStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPingingProxy, setIsPingingProxy] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
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
      const res = await apiClient.checkAccountHealth(account.id);
      if (res.success) {
        toast.success(`🩺 Node @${res.account?.username || account.label} Sehat: ${res.message}`);
      } else {
        toast.error(`Peringatan kesehatan node: ${res.message}`);
      }
      loadAccounts();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStartWarmup = async () => {
    setIsWarmingUp(true);
    try {
      const res = await apiClient.startWarmup(account.id);
      if (res.success) {
        toast.info(
          `🐣 Pemanasan dimulai untuk @${account.username || account.label} (Hari ${account.warmupDay || 1}/7)...`
        );
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Gagal memulai warmup: ${err.message}`);
    } finally {
      setIsWarmingUp(false);
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

  const handleDelete = () => {
    openDeleteModal(account);
  };

  const cleanProxy = extractProxyHostPort(account.proxy);

  return (
    <div
      className={`flex flex-col justify-between gap-2.5 rounded-lg border border-border/80 bg-obsidian-850 p-3 shadow-md transition-all duration-200 hover:border-slate-600/80 ${
        account.enabled === false ? 'opacity-50 grayscale' : ''
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={
                account.avatar ||
                'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
              }
              alt={account.label}
              className="h-8 w-8 shrink-0 rounded-md border border-slate-700 bg-obsidian-950 object-cover"
            />
            <div className="min-w-0">
              <h4 className="max-w-[130px] truncate font-heading text-xs font-bold leading-tight tracking-tight text-white sm:max-w-[160px]">
                {account.label || 'Node'}
              </h4>
              <div className="max-w-[130px] truncate font-mono text-[10.5px] text-flame sm:max-w-[160px]">
                @{account.username || 'unverified'}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className={`h-6 shrink-0 px-2 font-mono text-[10px] font-bold transition-all ${
              account.enabled !== false
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-sm hover:bg-emerald-500/20'
                : 'border-slate-700 bg-obsidian-900 text-slate-400 hover:bg-slate-800'
            }`}
            onClick={handleToggle}
          >
            {account.enabled !== false ? (
              <span className="flex items-center text-emerald-400">
                <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                ONLINE
              </span>
            ) : (
              <span className="flex items-center text-slate-400">
                <Power className="mr-1 h-2.5 w-2.5 text-slate-400" />
                PAUSED
              </span>
            )}
          </Button>
        </div>

        {/* Tags Row */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {/* Health status badge */}
          {account.healthStatus === 'HEALTHY' ? (
            <Badge variant="success" className="gap-0.5 px-1.5 py-0.5 font-mono text-[9.5px]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Healthy
            </Badge>
          ) : account.healthStatus === 'EXPIRED' ? (
            <Badge variant="destructive" className="gap-0.5 px-1.5 py-0.5 font-mono text-[9.5px]">
              <AlertTriangle className="h-2.5 w-2.5" />
              Expired
            </Badge>
          ) : account.healthStatus === 'PROXY_DEAD' ? (
            <Badge variant="destructive" className="gap-0.5 px-1.5 py-0.5 font-mono text-[9.5px]">
              <WifiOff className="h-2.5 w-2.5" />
              Proxy Dead
            </Badge>
          ) : account.isValid ? (
            <Badge variant="success" className="gap-0.5 px-1.5 py-0.5 font-mono text-[9.5px]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Valid
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-0.5 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400"
            >
              <HelpCircle className="h-2.5 w-2.5" />
              Unverified
            </Badge>
          )}

          {/* Warmup progress badge */}
          {account.warmupMode !== false && (
            <Badge
              variant="outline"
              className="cursor-pointer gap-0.5 border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9.5px] text-amber-300 hover:bg-amber-500/20"
              onClick={handleStartWarmup}
              title="Klik untuk jalankan rutinitas pemanasan"
            >
              <Flame className="h-2.5 w-2.5 text-amber-400" />
              Day {account.warmupDay || 1}/7
            </Badge>
          )}

          {cleanProxy ? (
            <Badge
              variant="purple"
              className="max-w-[130px] gap-0.5 truncate px-1.5 py-0.5 font-mono text-[9.5px]"
              title={`Proxy: ${cleanProxy}`}
            >
              <Globe className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{cleanProxy}</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500"
            >
              Direct
            </Badge>
          )}

          {/* Proxy Ping Live Status */}
          {proxyTest && !proxyTest.isDirect && (
            <Badge
              variant={proxyTest.success ? 'success' : 'destructive'}
              className="animate-in fade-in gap-0.5 px-1.5 py-0.5 font-mono text-[9.5px]"
            >
              {proxyTest.success ? (
                <>
                  <Wifi className="h-2.5 w-2.5" />
                  {proxyTest.latency}ms · {proxyTest.countryCode || 'OK'}
                </>
              ) : (
                <>
                  <WifiOff className="h-2.5 w-2.5" />
                  Dead ({proxyTest.latency}ms)
                </>
              )}
            </Badge>
          )}

          <Badge
            variant="default"
            className="cursor-pointer gap-0.5 px-1.5 py-0.5 font-mono text-[9.5px] transition-colors hover:bg-amber-500/20"
            onClick={() => openCommentsModal(account)}
            title="Kelola pool komentar akun ini"
          >
            <MessageSquare className="h-2.5 w-2.5" />
            {account.commentsCount ?? 3} Payloads
          </Badge>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-1 border-t border-border/50 pt-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 flex-1 px-2 text-[11px] font-medium"
          onClick={handleVerify}
          disabled={isVerifying}
          title="Periksa kesehatan sesi login dan koneksi node"
        >
          <HeartPulse className="mr-1 h-3 w-3 text-amber-400" />
          <span>{isVerifying ? 'Checking...' : 'Health Check'}</span>
        </Button>

        {account.proxy && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 shrink-0 p-0 text-xs"
            onClick={handlePingProxy}
            disabled={isPingingProxy}
            title="Ping Proxy Latency & Location"
            aria-label="Uji latensi & lokasi proxy node ini"
          >
            <Activity
              className={`h-3 w-3 ${isPingingProxy ? 'animate-spin text-flame' : 'text-purple-400'}`}
            />
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 shrink-0 p-0 text-xs text-slate-300 hover:text-white"
          onClick={() => openAccountModal(account)}
          title="Edit Node Config"
          aria-label="Edit konfigurasi node ini"
        >
          <SettingsIcon className="h-3 w-3" />
        </Button>

        <Button
          size="sm"
          variant="destructive"
          className="h-7 w-7 shrink-0 p-0 text-xs"
          onClick={handleDelete}
          title="Remove Node"
          aria-label="Hapus node ini"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
