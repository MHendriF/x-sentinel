import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { NodeCard } from './NodeCard';
import { NodesFilterBar, NodeStatusFilter, NodeSortOption } from './nodes/NodesFilterBar';
import { NodesPagination } from './nodes/NodesPagination';
import { FleetReadinessRibbon } from './nodes/FleetReadinessRibbon';
import { NodesBulkActionBar } from './nodes/NodesBulkActionBar';
import { NodesTableView } from './nodes/NodesTableView';
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
  Activity,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ProxyTestResult } from '@/services/apiClient';
import { cn } from '@/lib/utils';

const PAGE_SIZE_STORAGE_KEY = 'x_sentinel_page_size';
const VIEW_MODE_STORAGE_KEY = 'x_sentinel_nodes_view_mode';
const SORT_OPTION_STORAGE_KEY = 'x_sentinel_nodes_sort_option';

const loadStoredPageSize = (): number => {
  try {
    const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    if ([12, 24, 48].includes(stored)) return stored;
  } catch {
    // ignore
  }
  return 12;
};

const loadStoredViewMode = (): 'grid' | 'table' => {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === 'grid' || stored === 'table') return stored;
  } catch {
    // ignore
  }
  return 'grid';
};

const loadStoredSortOption = (): NodeSortOption => {
  try {
    const stored = localStorage.getItem(SORT_OPTION_STORAGE_KEY);
    if (stored && ['default', 'health', 'activity', 'name', 'proxy'].includes(stored)) {
      return stored as NodeSortOption;
    }
  } catch {
    // ignore
  }
  return 'default';
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
  const [sortOption, setSortOption] = useState<NodeSortOption>(loadStoredSortOption);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(loadStoredViewMode);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(loadStoredPageSize);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPingingAllProxies, setIsPingingAllProxies] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [proxyResults, setProxyResults] = useState<Record<string, ProxyTestResult>>({});

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAccounts();
    loadSettings();
  }, [loadAccounts, loadSettings]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, pageSize, sortOption]);

  useEffect(() => {
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {}
  }, [pageSize]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_OPTION_STORAGE_KEY, sortOption);
    } catch {}
  }, [sortOption]);

  const handleExportJSON = () => {
    window.open('/api/accounts/export', '_blank');
    toast.success('Downloading fleet node account backup (JSON)...');
  };

  const handleExportCSV = () => {
    window.open('/api/accounts/export-csv', '_blank');
    toast.success('Downloading fleet node account spreadsheet (CSV)...');
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

  const handlePingAllProxies = async () => {
    if (isPingingAllProxies) return;
    setIsPingingAllProxies(true);
    toast.info('⚡ Initiating concurrent proxy connectivity & latency ping for all nodes...');

    try {
      const res = await apiClient.batchTestProxies();
      if (res.success) {
        setProxyResults((prev) => ({ ...prev, ...res.results }));
        const alive = Object.values(res.results).filter((r) => r.success).length;
        toast.success(`🌐 Proxy scan complete: ${alive}/${res.total} proxies online!`);
      } else {
        toast.error('Proxy test encountered an issue.');
      }
    } catch (err: any) {
      toast.error(`Proxy test error: ${err.message}`);
    } finally {
      setIsPingingAllProxies(false);
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredAccounts.map((a) => a.id);
    setSelectedIds(new Set(allFilteredIds));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch action handlers
  const handleBatchActivate = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await apiClient.batchToggleAccounts(Array.from(selectedIds), true);
      if (res.success) {
        toast.success(`Activated ${res.updatedCount} nodes.`);
        await loadAccounts();
        handleClearSelection();
      }
    } catch (err: any) {
      toast.error(`Failed to activate nodes: ${err.message}`);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBatchPause = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await apiClient.batchToggleAccounts(Array.from(selectedIds), false);
      if (res.success) {
        toast.info(`Paused ${res.updatedCount} nodes.`);
        await loadAccounts();
        handleClearSelection();
      }
    } catch (err: any) {
      toast.error(`Failed to pause nodes: ${err.message}`);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBatchPingProxies = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkOperating(true);
    toast.info(`Pinging proxies for ${selectedIds.size} selected nodes...`);
    try {
      const res = await apiClient.batchTestProxies(Array.from(selectedIds));
      if (res.success) {
        setProxyResults((prev) => ({ ...prev, ...res.results }));
        const alive = Object.values(res.results).filter((r) => r.success).length;
        toast.success(`Tested ${res.total} proxies (${alive} alive).`);
      }
    } catch (err: any) {
      toast.error(`Error testing proxies: ${err.message}`);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected node(s)?`)) {
      return;
    }
    setIsBulkOperating(true);
    try {
      const res = await apiClient.batchDeleteAccounts(Array.from(selectedIds));
      if (res.success) {
        toast.success(`Decommissioned ${res.deletedCount} nodes.`);
        await loadAccounts();
        handleClearSelection();
      }
    } catch (err: any) {
      toast.error(`Failed to delete nodes: ${err.message}`);
    } finally {
      setIsBulkOperating(false);
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

  // 3. Status Filter
  const statusFilteredAccounts = useMemo(() => {
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

  // 4. Sort Ordering
  const filteredAccounts = useMemo(() => {
    const list = [...statusFilteredAccounts];
    if (sortOption === 'health') {
      return list.sort((a, b) => {
        const scoreA = isExpired(a) ? 2 : isUnchecked(a) ? 1 : 0;
        const scoreB = isExpired(b) ? 2 : isUnchecked(b) ? 1 : 0;
        return scoreB - scoreA;
      });
    }
    if (sortOption === 'activity') {
      return list.sort((a, b) => {
        const actsA =
          (a.stats?.likes || 0) +
          (a.stats?.retweets || 0) +
          (a.stats?.comments || 0) +
          (a.stats?.posts || 0);
        const actsB =
          (b.stats?.likes || 0) +
          (b.stats?.retweets || 0) +
          (b.stats?.comments || 0) +
          (b.stats?.posts || 0);
        return actsB - actsA;
      });
    }
    if (sortOption === 'name') {
      return list.sort((a, b) => {
        const nameA = (a.username || a.label || '').toLowerCase();
        const nameB = (b.username || b.label || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    if (sortOption === 'proxy') {
      return list.sort((a, b) => {
        const hasProxyA = a.proxy && a.proxy.trim().length > 0 ? 1 : 0;
        const hasProxyB = b.proxy && b.proxy.trim().length > 0 ? 1 : 0;
        return hasProxyB - hasProxyA;
      });
    }
    return list;
  }, [statusFilteredAccounts, sortOption]);

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
        isActive={isCheckingHealth || isRefreshing || isPingingAllProxies}
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
        description="Setiap node merepresentasikan sesi akun X independen dengan pool template komentar, proxy tunnel, dan parameter evasif."
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

            {/* 2. Ping All Proxies Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePingAllProxies}
              disabled={isPingingAllProxies}
              className="h-8 shrink-0 gap-1.5 border-purple-500/30 bg-purple-950/20 px-2.5 font-mono text-xs font-semibold text-purple-300 transition-colors hover:border-purple-500/60 hover:bg-purple-900/30 hover:text-purple-200"
              title="Ping latency and verify GeoIP for all proxies concurrently"
            >
              {isPingingAllProxies ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
              ) : (
                <Activity className="h-3.5 w-3.5 text-purple-400" />
              )}
              <span>{isPingingAllProxies ? 'Pinging...' : 'Ping Proxies'}</span>
            </Button>

            {/* 3. Segmented Data Hub Toolbar (Import, Export JSON/CSV, Refresh) */}
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
                onClick={handleExportCSV}
                className="inline-flex h-7 items-center gap-1.5 px-2.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-emerald-300 focus:outline-none"
                title="Export fleet accounts to spreadsheet (CSV)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex h-7 items-center gap-1.5 px-2.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-blue-300 focus:outline-none"
                title="Export entire fleet configuration backup to .json file"
              >
                <FileJson className="h-3.5 w-3.5 text-blue-400" />
                <span>JSON</span>
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

            {/* 4. Primary CTA: Add Node */}
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

      {/* Fleet Readiness Ribbon */}
      {accounts.length > 0 && (
        <FleetReadinessRibbon
          accounts={accounts}
          onFilterExpired={() => setStatusFilter('EXPIRED')}
          onFilterPaused={() => setStatusFilter('PAUSED')}
          onFilterHealthy={() => setStatusFilter('HEALTHY')}
        />
      )}

      {/* Search & Filter Bar */}
      {accounts.length > 0 && (
        <NodesFilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          counts={filterCounts}
          sortOption={sortOption}
          setSortOption={setSortOption}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {/* Grid or Table of Nodes */}
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
            Ikuti 3 langkah awal untuk mengaktifkan armada otomasi X-Sentinel Anda.
          </p>

          {/* First-Run Onboarding Checklist */}
          <div className="mx-auto max-w-md space-y-2 text-left">
            {[
              {
                done: accounts.length > 0,
                icon: KeyRound,
                label: 'Daftarkan akun node X pertama Anda',
                action: () => openAccountModal(null),
                actionLabel: 'Register',
              },
              {
                done: Boolean(settings?.aiProvider && settings.aiProvider !== 'none'),
                icon: Bot,
                label: 'Hubungkan AI provider untuk pembuatan balasan otomatis',
                action: () => setActiveTab('tab-ai'),
                actionLabel: 'Open AI Settings',
              },
              {
                done: Number(stats?.totalPosts ?? 0) > 0,
                icon: Send,
                label: 'Publikasikan postingan pertama via Post Studio',
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
            Tidak ada akun yang sesuai dengan pencarian atau filter status yang dipilih.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setSortOption('default');
            }}
            className="mt-3 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <NodesTableView
          accounts={paginatedAccounts}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          proxyResults={proxyResults}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedAccounts.map((acc) => (
            <NodeCard
              key={acc.id}
              account={acc}
              isSelected={selectedIds.has(acc.id)}
              onToggleSelect={() => handleToggleSelect(acc.id)}
            />
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

      {/* Floating Bulk Action Bar */}
      <NodesBulkActionBar
        selectedCount={selectedIds.size}
        totalCount={filteredAccounts.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBatchActivate={handleBatchActivate}
        onBatchPause={handleBatchPause}
        onBatchPingProxies={handleBatchPingProxies}
        onBatchDelete={handleBatchDelete}
        isLoading={isBulkOperating}
      />
    </div>
  );
};
