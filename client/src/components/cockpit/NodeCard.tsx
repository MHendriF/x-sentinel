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
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  account,
  isSelected = false,
  onToggleSelect,
}) => {
  const { loadAccounts, openAccountModal, openCommentsModal, openDeleteModal } = useStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPingingProxy, setIsPingingProxy] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [isLoggingInCamoufox, setIsLoggingInCamoufox] = useState(false);
  const [proxyTest, setProxyTest] = useState<ProxyTestResult | null>(null);

  const handleCamoufoxLogin = async () => {
    setIsLoggingInCamoufox(true);
    toast.info(
      `🦊 Opening Camoufox for @${account.username || account.label}. Please complete login in the opened browser window...`,
      { duration: 10000 }
    );
    try {
      const res = await apiClient.startCamoufoxLogin(account.id);
      if (res.success) {
        toast.success(res.message);
        loadAccounts();
      } else {
        toast.error(`Camoufox login failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Camoufox login error: ${err.message}`);
    } finally {
      setIsLoggingInCamoufox(false);
    }
  };

  const handleToggle = async () => {
    try {
      await apiClient.toggleAccount(account.id);
      loadAccounts();
      toast.success(
        account.enabled !== false
          ? `Node ${account.label} paused.`
          : `Node ${account.label} activated.`
      );
    } catch (err: any) {
      toast.error(`Failed to toggle status: ${err.message}`);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await apiClient.checkAccountHealth(account.id);
      if (res.success) {
        toast.success(`🩺 Node @${res.account?.username || account.label} Healthy: ${res.message}`);
      } else {
        toast.error(`Node health warning: ${res.message}`);
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
          `🐣 Warmup initiated for @${account.username || account.label} (Day ${account.warmupDay || 1}/7)...`
        );
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Failed to start warmup: ${err.message}`);
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
        toast.info('Node using Direct IP connection (no proxy).');
      } else if (res.success) {
        toast.success(`Proxy Online: ${res.ip} (${res.country}) · Latency: ${res.latency}ms`);
      } else {
        toast.error(`Proxy Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Failed to test proxy: ${err.message}`);
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
      className={`group relative flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 shadow-md transition-all duration-200 ${
        isSelected
          ? 'border-cyan-500/80 bg-cyan-950/20 ring-1 ring-cyan-500/40 shadow-cyan-950/50'
          : 'border-slate-800/80 bg-obsidian-850 hover:border-slate-700/80 hover:shadow-lg hover:shadow-black/30'
      } ${account.enabled === false ? 'opacity-65' : ''}`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="checkbox-flame shrink-0"
                title="Select node"
              />
            )}
            <div className="relative shrink-0">
              <img
                src={
                  account.avatar ||
                  'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
                }
                alt={account.label}
                className="h-8 w-8 rounded-lg border border-slate-700/70 bg-obsidian-950 object-cover"
              />
              {account.camoufoxProfile?.hasProfile && (
                <span
                  className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-obsidian-900 text-[9px] shadow"
                  title="Native Camoufox Profile active"
                >
                  🦊
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="truncate font-heading text-xs font-bold leading-snug tracking-tight text-white">
                {account.label || 'Node'}
              </h4>
              <div className="truncate font-mono text-[10.5px] text-flame">
                @{account.username || 'unverified'}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className={`h-6 shrink-0 px-2 font-mono text-[10px] font-bold transition-all ${
              account.enabled !== false
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm hover:bg-emerald-500/20'
                : 'border-slate-700 bg-obsidian-900 text-slate-400 hover:bg-slate-800'
            }`}
            onClick={handleToggle}
          >
            {account.enabled !== false ? (
              <span className="flex items-center text-emerald-400">
                <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                ONLINE
              </span>
            ) : (
              <span className="flex items-center text-slate-400">
                <Power className="mr-1.5 h-2.5 w-2.5 text-slate-400" />
                PAUSED
              </span>
            )}
          </Button>
        </div>

        {/* Structured Info Rows */}
        <div className="mt-2.5 flex flex-col gap-1.5">
          {/* Row 1: Session Health & Warmup Progress */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {account.healthStatus === 'HEALTHY' ? (
                <Badge variant="success" className="gap-1 px-1.5 py-0.5 font-mono text-[9.5px]">
                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                  Healthy
                </Badge>
              ) : account.healthStatus === 'EXPIRED' ? (
                <Badge variant="destructive" className="gap-1 px-1.5 py-0.5 font-mono text-[9.5px]">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-red-400" />
                  Expired
                </Badge>
              ) : account.healthStatus === 'PROXY_DEAD' ? (
                <Badge variant="destructive" className="gap-1 px-1.5 py-0.5 font-mono text-[9.5px]">
                  <WifiOff className="h-2.5 w-2.5 shrink-0 text-red-400" />
                  Proxy Dead
                </Badge>
              ) : account.isValid ? (
                <Badge variant="success" className="gap-1 px-1.5 py-0.5 font-mono text-[9.5px]">
                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                  Valid
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="gap-1 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400"
                >
                  <HelpCircle className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                  Unchecked
                </Badge>
              )}

              {account.warmupMode !== false && (
                <Badge
                  variant="outline"
                  className="cursor-pointer gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9.5px] text-amber-300 hover:bg-amber-500/20 transition-colors"
                  onClick={handleStartWarmup}
                  title="Click to run warmup routine"
                >
                  <Flame className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                  Day {account.warmupDay || 1}/7
                </Badge>
              )}
            </div>

            {account.camoufoxProfile?.hasProfile ? (
              <Badge
                variant="outline"
                className="shrink-0 gap-1 border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-orange-300"
                title={`Camoufox Native Profile Active (Last login: ${account.camoufoxProfile.lastLoginAt ? new Date(account.camoufoxProfile.lastLoginAt).toLocaleDateString() : 'Active'})`}
              >
                <span>🦊 Native</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="shrink-0 border-slate-700/60 bg-slate-800/40 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400"
                title="Standard Session Profile"
              >
                <span>Default</span>
              </Badge>
            )}
          </div>

          {/* Row 2: Proxy Tunnel & Comments Pool */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              {cleanProxy ? (
                <div
                  className="inline-flex max-w-full items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-300"
                  title={
                    proxyTest?.success
                      ? `Proxy: ${cleanProxy} (${proxyTest.latency}ms · ${proxyTest.countryCode || 'OK'})`
                      : `Proxy: ${cleanProxy}`
                  }
                >
                  <Globe className="h-2.5 w-2.5 shrink-0 text-purple-400" />
                  <span className="truncate">{cleanProxy}</span>
                  {proxyTest && !proxyTest.isDirect && (
                    <span
                      className={`shrink-0 text-[9px] font-bold ${
                        proxyTest.success ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      · {proxyTest.success ? `${proxyTest.latency}ms` : 'Dead'}
                    </span>
                  )}
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className="border-slate-700/50 bg-slate-800/30 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400"
                >
                  Direct IP
                </Badge>
              )}
            </div>

            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 transition-colors hover:border-amber-500/60 hover:bg-amber-500/20"
              onClick={() => openCommentsModal(account)}
              title="Manage comment payload pool for this node"
            >
              <MessageSquare className="h-2.5 w-2.5 text-amber-400" />
              <span>{account.commentsCount ?? 3} Payloads</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-1.5 border-t border-slate-800/80 pt-2.5">
        {/* Camoufox Native Login Action */}
        <Button
          size="sm"
          variant="outline"
          className={`h-7 flex-1 px-2 text-[11px] font-medium transition-all ${
            account.camoufoxProfile?.hasProfile
              ? 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200'
              : 'border-slate-700/80 bg-slate-800/40 text-slate-300 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-200'
          }`}
          onClick={handleCamoufoxLogin}
          disabled={isLoggingInCamoufox}
          title={
            account.camoufoxProfile?.hasProfile
              ? 'Camoufox Profile Active - Click to Re-Login'
              : 'Launch Camoufox to generate native Firefox session'
          }
        >
          <span className="mr-1">🦊</span>
          <span className="truncate">
            {isLoggingInCamoufox
              ? 'Opening...'
              : account.camoufoxProfile?.hasProfile
              ? 'Re-Login'
              : 'Login'}
          </span>
        </Button>

        {/* Health Check Action */}
        <Button
          size="sm"
          variant="secondary"
          className="h-7 flex-1 px-2 text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200"
          onClick={handleVerify}
          disabled={isVerifying}
          title="Verify login session health and node connection"
        >
          <HeartPulse
            className={`mr-1 h-3 w-3 shrink-0 ${
              isVerifying ? 'animate-pulse text-amber-400' : 'text-emerald-400'
            }`}
          />
          <span className="truncate">{isVerifying ? 'Checking...' : 'Check'}</span>
        </Button>

        {/* Utility Quick Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {account.proxy && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-400 hover:text-purple-300 hover:bg-purple-950/30"
              onClick={handlePingProxy}
              disabled={isPingingProxy}
              title="Ping Proxy Latency & Location"
              aria-label="Test proxy latency & location for this node"
            >
              <Activity
                className={`h-3.5 w-3.5 ${isPingingProxy ? 'animate-spin text-flame' : 'text-purple-400'}`}
              />
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            onClick={() => openAccountModal(account)}
            title="Edit Node Config"
            aria-label="Edit node configuration"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
            onClick={handleDelete}
            title="Remove Node"
            aria-label="Delete this node"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
