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
      className={`flex flex-col justify-between gap-4 rounded-lg border border-border/80 bg-obsidian-850 p-4 shadow-md transition-all duration-200 hover:border-slate-600/80 ${
        account.enabled === false ? 'opacity-50 grayscale' : ''
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={
                account.avatar ||
                'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
              }
              alt={account.label}
              className="h-10 w-10 rounded-md border border-slate-700 bg-obsidian-950 object-cover"
            />
            <div>
              <h4 className="font-heading text-sm font-semibold leading-snug tracking-tight text-white">
                {account.label || 'Node'}
              </h4>
              <div className="font-mono text-xs text-flame">
                @{account.username || 'unverified'}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className={`h-7 font-mono text-xs font-bold transition-all ${
              account.enabled !== false
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-950/40 hover:bg-emerald-500/20 hover:text-emerald-300'
                : 'border-slate-700 bg-obsidian-900 text-slate-400 hover:bg-slate-800'
            }`}
            onClick={handleToggle}
          >
            {account.enabled !== false ? (
              <span className="flex items-center font-bold tracking-wide text-emerald-400">
                <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                ONLINE
              </span>
            ) : (
              <span className="flex items-center text-slate-400">
                <Power className="mr-1 h-3 w-3 text-slate-400" />
                PAUSED
              </span>
            )}
          </Button>
        </div>

        {/* Tags Row */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {/* Health status badge */}
          {account.healthStatus === 'HEALTHY' ? (
            <Badge variant="success" className="gap-1 font-mono text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Healthy
            </Badge>
          ) : account.healthStatus === 'EXPIRED' ? (
            <Badge variant="destructive" className="gap-1 font-mono text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              Expired
            </Badge>
          ) : account.healthStatus === 'PROXY_DEAD' ? (
            <Badge variant="destructive" className="gap-1 font-mono text-[10px]">
              <WifiOff className="h-3 w-3" />
              Proxy Dead
            </Badge>
          ) : account.isValid ? (
            <Badge variant="success" className="gap-1 font-mono text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 font-mono text-[10px] text-slate-400">
              <HelpCircle className="h-3 w-3" />
              Unverified
            </Badge>
          )}

          {/* Warmup progress badge */}
          {account.warmupMode !== false && (
            <Badge
              variant="outline"
              className="cursor-pointer gap-1 border-amber-500/40 bg-amber-500/10 font-mono text-[10px] text-amber-300 hover:bg-amber-500/20"
              onClick={handleStartWarmup}
              title="Klik untuk jalankan rutinitas pemanasan"
            >
              <Flame className="h-3 w-3 text-amber-400" />
              Day {account.warmupDay || 1}/7
            </Badge>
          )}

          {cleanProxy ? (
            <Badge
              variant="purple"
              className="max-w-[150px] gap-1 truncate font-mono text-[10px]"
              title={`Proxy: ${cleanProxy}`}
            >
              <Globe className="h-3 w-3" />
              {cleanProxy}
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono text-[10px] text-slate-500">
              Direct
            </Badge>
          )}

          {/* Proxy Ping Live Status */}
          {proxyTest && !proxyTest.isDirect && (
            <Badge
              variant={proxyTest.success ? 'success' : 'destructive'}
              className="animate-in fade-in gap-1 font-mono text-[10px]"
            >
              {proxyTest.success ? (
                <>
                  <Wifi className="h-3 w-3" />
                  {proxyTest.latency}ms · {proxyTest.countryCode || 'OK'}
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Dead ({proxyTest.latency}ms)
                </>
              )}
            </Badge>
          )}

          <Badge
            variant="default"
            className="cursor-pointer gap-1 font-mono text-[10px] transition-colors hover:bg-amber-500/20"
            onClick={() => openCommentsModal(account)}
            title="Kelola komentar akun ini"
          >
            <MessageSquare className="h-3 w-3" />
            {account.commentsCount ?? 3} Payloads
          </Badge>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-1.5 border-t border-border/60 pt-3">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 text-xs"
          onClick={handleVerify}
          disabled={isVerifying}
          title="Periksa kesehatan sesi login dan koneksi node"
        >
          <HeartPulse className="mr-1 h-3 w-3 text-amber-400" />
          {isVerifying ? 'PROBING...' : 'Health Check'}
        </Button>

        {account.proxy && (
          <Button
            size="sm"
            variant="outline"
            className="px-2 text-xs"
            onClick={handlePingProxy}
            disabled={isPingingProxy}
            title="Ping Proxy Latency & Location"
          >
            <Activity
              className={`h-3.5 w-3.5 ${isPingingProxy ? 'animate-spin text-flame' : 'text-purple-400'}`}
            />
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="px-2 text-xs"
          onClick={() => openAccountModal(account)}
          title="Edit Node Config"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="destructive"
          className="px-2 text-xs"
          onClick={handleDelete}
          title="Remove Node"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
