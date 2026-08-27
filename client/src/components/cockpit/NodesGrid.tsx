import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { NodeCard } from './NodeCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Plus,
  RefreshCw,
  Server,
  AlertCircle,
  UploadCloud,
  Download,
  Stethoscope,
  Loader2,
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

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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

  return (
    <div className="space-y-5">
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
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((acc) => (
            <NodeCard key={acc.id} account={acc} />
          ))}
        </div>
      )}
    </div>
  );
};
