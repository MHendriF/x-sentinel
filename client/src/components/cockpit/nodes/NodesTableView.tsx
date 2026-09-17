import React from 'react';
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

interface NodesTableViewProps {
  accounts: AccountNode[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  proxyResults?: Record<string, ProxyTestResult>;
}

export const NodesTableView: React.FC<NodesTableViewProps> = ({
  accounts,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  proxyResults = {},
}) => {
  const { loadAccounts, openAccountModal, openCommentsModal, openDeleteModal } = useStore();

  const isAllSelected = accounts.length > 0 && accounts.every((a) => selectedIds.has(a.id));

  const handleToggle = async (account: AccountNode) => {
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

  const handleVerify = async (account: AccountNode) => {
    toast.info(`Checking health for @${account.username || account.label}...`);
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
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-obsidian-900/90 shadow-xl">
      <table className="w-full text-left font-mono text-xs">
        <thead className="border-b border-border/80 bg-obsidian-950 text-slate-400">
          <tr>
            <th className="w-10 px-3 py-3 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => (isAllSelected ? onClearSelection() : onSelectAll())}
                className="checkbox-flame"
                title="Select all on this page"
              />
            </th>
            <th className="px-3 py-3 font-semibold text-slate-300">NODE / ACCOUNT</th>
            <th className="px-3 py-3 font-semibold text-slate-300">STATUS</th>
            <th className="px-3 py-3 font-semibold text-slate-300">HEALTH</th>
            <th className="px-3 py-3 font-semibold text-slate-300">PROXY TUNNEL</th>
            <th className="px-3 py-3 font-semibold text-slate-300">PAYLOADS</th>
            <th className="px-3 py-3 font-semibold text-slate-300">ACTIONS METRICS</th>
            <th className="px-3 py-3 text-right font-semibold text-slate-300">MANAGE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {accounts.map((account) => {
            const isSelected = selectedIds.has(account.id);
            const cleanProxy = extractProxyHostPort(account.proxy);
            const proxyTest = proxyResults[account.id];
            const totalActs =
              (account.stats?.likes || 0) +
              (account.stats?.retweets || 0) +
              (account.stats?.comments || 0) +
              (account.stats?.posts || 0);

            return (
              <tr
                key={account.id}
                className={`transition-colors ${
                  isSelected
                    ? 'bg-cyan-950/20 hover:bg-cyan-950/30'
                    : 'hover:bg-obsidian-850/80'
                }`}
              >
                {/* Selection Checkbox */}
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(account.id)}
                    className="checkbox-flame"
                  />
                </td>

                {/* Avatar & Handle */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={
                        account.avatar ||
                        'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
                      }
                      alt={account.label}
                      className="h-7 w-7 rounded-md border border-slate-700 bg-obsidian-950 object-cover"
                    />
                    <div>
                      <div className="font-heading text-xs font-bold text-white">
                        {account.label || 'Node'}
                      </div>
                      <div className="text-[11px] text-flame">
                        @{account.username || 'unverified'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Enabled Toggle */}
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => handleToggle(account)}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-all ${
                      account.enabled !== false
                        ? 'border border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                        : 'border border-slate-700 bg-obsidian-950 text-slate-500'
                    }`}
                  >
                    <Power className="h-2.5 w-2.5" />
                    {account.enabled !== false ? 'ONLINE' : 'PAUSED'}
                  </button>
                </td>

                {/* Health Status Badge */}
                <td className="px-3 py-2.5">
                  {account.healthStatus === 'HEALTHY' ? (
                    <Badge variant="success" className="gap-1 px-2 py-0.5 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Healthy
                    </Badge>
                  ) : account.healthStatus === 'EXPIRED' ? (
                    <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-[10px]">
                      <AlertTriangle className="h-3 w-3" />
                      Expired
                    </Badge>
                  ) : account.healthStatus === 'PROXY_DEAD' ? (
                    <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-[10px]">
                      <WifiOff className="h-3 w-3" />
                      Proxy Dead
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] text-slate-400">
                      <HelpCircle className="h-3 w-3" />
                      Unchecked
                    </Badge>
                  )}
                </td>

                {/* Proxy Tunnel */}
                <td className="px-3 py-2.5">
                  {cleanProxy ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-purple-300">
                        <Globe className="h-3 w-3 text-purple-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{cleanProxy}</span>
                      </div>
                      {proxyTest && (
                        <div className="text-[10px] text-slate-400">
                          {proxyTest.success ? (
                            <span className="text-emerald-400">
                              {proxyTest.latency}ms · {proxyTest.countryCode || 'OK'}
                            </span>
                          ) : (
                            <span className="text-rose-400">Dead</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Direct IP</span>
                  )}
                </td>

                {/* Comments Pool */}
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => openCommentsModal(account)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-amber-400 transition-colors"
                  >
                    <MessageSquare className="h-3 w-3 text-amber-400" />
                    <span>{account.commentsCount ?? 3} templates</span>
                  </button>
                </td>

                {/* Total Actions */}
                <td className="px-3 py-2.5">
                  <span className="rounded bg-obsidian-950 px-2 py-0.5 font-bold text-flame border border-slate-800">
                    {totalActs.toLocaleString()} acts
                  </span>
                </td>

                {/* Quick Action Buttons */}
                <td className="px-3 py-2.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => handleVerify(account)}
                      title="Health check node"
                    >
                      <HeartPulse className="h-3 w-3 text-amber-400" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0 text-slate-300 hover:text-white"
                      onClick={() => openAccountModal(account)}
                      title="Edit Node"
                    >
                      <SettingsIcon className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0"
                      onClick={() => openDeleteModal(account)}
                      title="Delete Node"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
