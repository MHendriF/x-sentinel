import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { NodeCard } from './NodeCard';
import { NodesFilterBar, NodeStatusFilter } from './nodes/NodesFilterBar';
import { NodesPagination } from './nodes/NodesPagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DeckHeader } from './DeckHeader';
import {
  Plus,
  RefreshCw,
  Server,
  Layers,
  UploadCloud,
  Download,
  Stethoscope,
  Loader2,
  SearchX,
  KeyRound,
  Bot,
  Send,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/lib/utils';

const PAGE_SIZE_STORAGE_KEY = 'x_sentinel_page_size';

const loadStoredPageSize = (): number => {
  try {
    const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    if ([12, 24, 48].includes(stored)) return stored;
  } catch {
    // localStorage unavailable — fall back to default
  }
  return 12;
};

export const NodesGrid: React.FC = () => {
  const {
    accounts,
    loadAccounts,
    loadSettings,
    settings,
    stats,
    accountsHydrated,
    openAccountModal,
    openBulkImportModal,
    setActiveTab,
    isCheckingHealth,
    setIsCheckingHealth,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<NodeStatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(loadStoredPageSize);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadSettings();
  }, [loadAccounts, loadSettings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {
      // ignore persistence failure
    }
  }, [pageSize]);

  const handleExportFleet = () => {
    window.open('/api/accounts/export', '_blank');
    toast.success('Downloading fleet node account backup (JSON)...');
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadAccounts();
      toast.success('Fleet node data refreshed successfully.');
    } catch (err: any) {
      toast.error(`Failed to reload data: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckFleetHealth = async () => {
    if (isCheckingHealth) return;
    setIsCheckingHealth(true);
    toast.info('🩺 Initiating session & proxy health diagnostics for all fleet nodes...');

    try {
      const res = await apiClient.checkFleetHealth();
      if (res.success) {
        toast.success(
          `🏁 Fleet verification complete: ${res.healthy}/${res.total} nodes healthy!`
        );
      } else {
        toast.error(`Health check failed: ${res.message}`);
      }
      await loadAccounts();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // 1. Search Filter
  const searchFilteredAccounts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((acc) => {
      return (
        (acc.label && acc.label.toLowerCase().includes(term)) ||
        (acc.username && acc.username.toLowerCase().includes(term)) ||
        (acc.proxy && acc.proxy.toLowerCase().includes(term))
      );
    });
  }, [accounts, searchTerm]);

  // 2. Status counts based on current search query
  const isExpired = (a: (typeof accounts)[number]) =>
    a.healthStatus === 'EXPIRED' || a.healthStatus === 'PROXY_DEAD' || a.isValid === false;
  const isUnchecked = (a: (typeof accounts)[number]) => !a.healthStatus && a.isValid !== false;

  const filterCounts = useMemo(() => {
    return {
      all: searchFilteredAccounts.length,
      online: searchFilteredAccounts.filter((a) => a.enabled !== false).length,
      paused: searchFilteredAccounts.filter((a) => a.enabled === false).length,
      healthy: searchFilteredAccounts.filter((a) => a.healthStatus === 'HEALTHY').length,
      expired: searchFilteredAccounts.filter(isExpired).length,
      unchecked: searchFilteredAccounts.filter(isUnchecked).length,
    };
  }, [searchFilteredAccounts]);

  // 3. Final accounts list after status filter
  const filteredAccounts = useMemo(() => {
    if (statusFilter === 'ALL') return searchFilteredAccounts;
    return searchFilteredAccounts.filter((acc) => {
      if (statusFilter === 'ONLINE') return acc.enabled !== false;
      if (statusFilter === 'PAUSED') return acc.enabled === false;
      if (statusFilter === 'HEALTHY') return acc.healthStatus === 'HEALTHY';
      if (statusFilter === 'EXPIRED') return isExpired(acc);
      if (statusFilter === 'UNCHECKED') return isUnchecked(acc);
      return true;
    });
  }, [searchFilteredAccounts, statusFilter]);

  // Pagination calculations
  const totalItems = filteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Top Banner / Cluster Controls */}
      <DeckHeader
        tag="CLUSTER TOPOLOGY"
        tagColor="flame"
        icon={<Layers className="h-5 w-5 text-flame" />}
        isActive={isCheckingHealth || isRefreshing}
        badge="FLEET CONTROLS"
        title="Registered Nodes"
        titleBadges={
          <>
            <span className="rounded-md border border-slate-700/80 bg-obsidian-950 px-2.5 py-0.5 font-bold text-white shadow-inner">
              {accounts.length} {accounts.length === 1 ? 'Node' : 'Nodes'}
            </span>
            {accounts.length > 0 && (
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                {accounts.filter((a) => a.enabled !== false).length} Active
              </span>
            )}
          </>
        }
        description="Each node represents an independent X session with its own comment pool, proxy tunnel, and session health state."
        actions={
          <>
            {/* 1. Fleet Health Diagnostic Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckFleetHealth}
              disabled={isCheckingHealth}
              className="h-8 shrink-0 gap-1.5 border-rose-500/30 bg-rose-950/20 px-2.5 font-mono text-xs font-semibold text-rose-300 transition-colors hover:border-rose-500/60 hover:bg-rose-900/30 hover:text-rose-200"
              title="Verify session & proxy health across all fleet nodes"
            >
              {isCheckingHealth ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
              ) : (
                <Stethoscope className="h-3.5 w-3.5 text-rose-400" />
              )}
              <span>{isCheckingHealth ? 'Checking...' : 'Fleet Health'}</span>
            </Button>

            {/* 2. Segmented Data Hub Toolbar (Import, Export, Refresh) */}
            <div className="inline-flex h-8 shrink-0 items-center divide-x divide-slate-800 rounded-md border border-slate-700/80 bg-obsidian-950 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => openBulkImportModal()}
                className="inline-flex h-7 items-center gap-1.5 px-2.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-cyan-300 focus:outline-none"
                title="Bulk import accounts from text or token:ct0:proxy:label format"
              >
                <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />
                <span>Import</span>
              </button>

              <button
                type="button"
                onClick={handleExportFleet}
                className="inline-flex h-7 items-center gap-1.5 px-2.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-emerald-300 focus:outline-none"
                title="Export entire fleet configuration backup to .json file"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export</span>
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-200 focus:outline-none disabled:opacity-50"
                title="Reload all fleet node data"
                aria-label="Reload node data"
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    isRefreshing && 'animate-spin text-flame'
                  )}
                />
              </button>
            </div>

            {/* 3. Primary CTA: Add Node */}
            <Button
              variant="default"
              size="sm"
              onClick={() => openAccountModal(null)}
              className="h-8 shrink-0 gap-1.5 bg-gradient-to-r from-flame to-amber-500 px-3 font-heading text-xs font-bold text-white shadow-md shadow-flame/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Add Node</span>
            </Button>
          </>
        }
      />

      {/* Search & Filter Bar (Only if accounts exist) */}
      {accounts.length > 0 && (
        <NodesFilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          counts={filterCounts}
        />
      )}

      {/* Grid of Nodes */}
      {/* Skeleton while the fleet data hydrates (prevents a fake empty-state flash) */}
      {!accountsHydrated ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-obsidian-850 p-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="mt-3 h-7 w-full" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-obsidian-850/50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-obsidian-750 text-slate-400">
            <Server className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-base font-semibold text-white">Fleet Cluster Empty</h3>
          <p className="mx-auto mb-5 mt-1 max-w-md text-xs text-muted-foreground">
            Three steps to get started — follow sequentially, progress tracks automatically.
          </p>

          {/* First-Run Onboarding Checklist */}
          <div className="mx-auto max-w-md space-y-2 text-left">
            {[
              {
                done: accounts.length > 0,
                icon: KeyRound,
                label: 'Register your first fleet node account',
                action: () => openAccountModal(null),
                actionLabel: 'Register',
              },
              {
                done: Boolean(settings?.aiProvider && settings.aiProvider !== 'none'),
                icon: Bot,
                label: 'Connect an AI provider for autonomous replies',
                action: () => setActiveTab('tab-ai'),
                actionLabel: 'Open AI Settings',
              },
              {
                done: Number(stats?.totalPosts ?? 0) > 0,
                icon: Send,
                label: 'Publish your first post via AI Post Studio',
                action: () => setActiveTab('tab-composer'),
                actionLabel: 'Open Post Studio',
              },
            ].map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                    step.done
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : 'border-border/70 bg-obsidian-900'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-600" />
                    )}
                    <StepIcon
                      className={`h-3.5 w-3.5 shrink-0 ${step.done ? 'text-emerald-400/70' : 'text-flame'}`}
                    />
                    <span
                      className={`truncate text-xs ${step.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!step.done && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 px-2.5 font-mono text-[11px]"
                      onClick={step.action}
                    >
                      {step.actionLabel}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : paginatedAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-obsidian-850/50 p-8 text-center">
          <SearchX className="mb-2 h-8 w-8 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-300">No matching nodes found</h4>
          <p className="mt-1 text-xs text-slate-500">
            No account nodes match the provided search term or selected status filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
            className="mt-3 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedAccounts.map((acc) => (
            <NodeCard key={acc.id} account={acc} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {accounts.length > 0 && (
        <NodesPagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPageSize={setPageSize}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
