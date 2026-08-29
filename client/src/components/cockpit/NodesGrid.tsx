import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { NodeCard } from './NodeCard';
import { NodesFilterBar, NodeStatusFilter } from './nodes/NodesFilterBar';
import { NodesPagination } from './nodes/NodesPagination';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  RefreshCw,
  Server,
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
    toast.success('Mengunduh backup seluruh armada node akun (JSON)...');
  };

  const handleCheckFleetHealth = async () => {
    if (isCheckingHealth) return;
    setIsCheckingHealth(true);
    toast.info('🩺 Memulai pengujian kesehatan sesi & proxy seluruh armada node...');

    try {
      const res = await apiClient.checkFleetHealth();
      if (res.success) {
        toast.success(
          `🏁 Pengecekan armada selesai: ${res.healthy}/${res.total} node dalam kondisi sehat!`
        );
      } else {
        toast.error(`Pengecekan gagal: ${res.message}`);
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
      {/* Top Banner / Actions */}
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 pb-3 md:flex-row md:items-center">
          <div>
            <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
              CLUSTER TOPOLOGY
            </div>
            <CardTitle className="text-lg">Node Terdaftar ({accounts.length})</CardTitle>
            <CardDescription>
              Setiap node mewakili sesi akun X independen dengan pool komentar, routing proxy, dan
              status kesehatan sesi.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckFleetHealth}
              disabled={isCheckingHealth}
              className="gap-1.5 border-rose-500/30 font-mono text-xs text-rose-300 hover:bg-rose-500/10"
              title="Periksa kesehatan sesi & proxy seluruh armada"
            >
              {isCheckingHealth ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
              ) : (
                <Stethoscope className="h-3.5 w-3.5 text-rose-400" />
              )}
              <span>{isCheckingHealth ? 'Memeriksa...' : 'Fleet Health'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkImportModal()}
              className="gap-1.5 border-cyan-500/30 font-mono text-xs text-cyan-300 hover:bg-cyan-500/10"
              title="Import massal akun (format teks / CSV)"
            >
              <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />
              <span>Import</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFleet}
              className="gap-1.5 border-emerald-500/30 font-mono text-xs text-emerald-300 hover:bg-emerald-500/10"
              title="Unduh backup seluruh node ke file .json"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAccounts()}
              className="h-8 w-8 p-0"
              title="Muat ulang data node"
              aria-label="Muat ulang data node"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => openAccountModal(null)}
              className="gap-1.5 font-heading text-xs font-bold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Daftarkan Node</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

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
          <h3 className="font-heading text-base font-semibold text-white">Armada Masih Kosong</h3>
          <p className="mx-auto mb-5 mt-1 max-w-md text-xs text-muted-foreground">
            Tiga langkah untuk memulai — kerjakan berurutan, progres akan tercentang otomatis.
          </p>

          {/* First-Run Onboarding Checklist */}
          <div className="mx-auto max-w-md space-y-2 text-left">
            {[
              {
                done: accounts.length > 0,
                icon: KeyRound,
                label: 'Daftarkan node akun pertama Anda',
                action: () => openAccountModal(null),
                actionLabel: 'Daftarkan',
              },
              {
                done: Boolean(settings?.aiProvider && settings.aiProvider !== 'none'),
                icon: Bot,
                label: 'Hubungkan AI provider untuk balasan otomatis',
                action: () => setActiveTab('tab-ai'),
                actionLabel: 'Buka Pengaturan AI',
              },
              {
                done: Number(stats?.totalPosts ?? 0) > 0,
                icon: Send,
                label: 'Publikasikan postingan pertama via AI Post Studio',
                action: () => setActiveTab('tab-composer'),
                actionLabel: 'Buka Post Studio',
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
          <h4 className="text-sm font-semibold text-slate-300">Tidak ada node yang cocok</h4>
          <p className="mt-1 text-xs text-slate-500">
            Tidak ditemukan node akun yang sesuai dengan kata kunci atau filter status yang dipilih.
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
            Reset Filter
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
