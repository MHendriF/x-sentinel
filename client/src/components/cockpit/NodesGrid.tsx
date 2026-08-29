import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { NodeCard } from './NodeCard';
import { NodesFilterBar, NodeStatusFilter } from './nodes/NodesFilterBar';
import { NodesPagination } from './nodes/NodesPagination';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Plus,
  RefreshCw,
  Server,
  UploadCloud,
  Download,
  Stethoscope,
  Loader2,
  SearchX,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/apiClient';

export const NodesGrid: React.FC = () => {
  const {
    accounts,
    loadAccounts,
    openAccountModal,
    openBulkImportModal,
    isCheckingHealth,
    setIsCheckingHealth,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<NodeStatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

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
            <CardTitle className="text-lg">
              Registered Computing Nodes ({accounts.length})
            </CardTitle>
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
              <span>{isCheckingHealth ? 'Checking...' : 'Fleet Health'}</span>
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
              title="Refresh data node"
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
              <span>Register Node</span>
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
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-obsidian-850/50 p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-obsidian-750 text-slate-400">
            <Server className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-base font-semibold text-white">
            Belum Ada Node Terdaftar
          </h3>
          <p className="mb-4 mt-1 max-w-sm text-xs text-muted-foreground">
            Daftarkan cookie <code className="text-flame">auth_token</code> dan{' '}
            <code className="text-flame">ct0</code> dari akun X Anda untuk menginisialisasi cluster.
          </p>
          <Button onClick={() => openAccountModal(null)} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Daftarkan Node Pertama
          </Button>
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
