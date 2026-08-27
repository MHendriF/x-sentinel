import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { NodeCard } from './NodeCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Plus, RefreshCw, Server, AlertCircle, UploadCloud, Download, Stethoscope, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/apiClient';

export const NodesGrid: React.FC = () => {
  const { accounts, loadAccounts, openAccountModal, openBulkImportModal, isCheckingHealth, setIsCheckingHealth } = useStore();

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
        toast.success(`🏁 Pengecekan armada selesai: ${res.healthy}/${res.total} node dalam kondisi sehat!`);
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
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 gap-3">
          <div>
            <div className="font-mono text-[10px] font-bold text-flame tracking-wider">
              CLUSTER TOPOLOGY
            </div>
            <CardTitle className="text-lg">Registered Computing Nodes ({accounts.length})</CardTitle>
            <CardDescription>
              Setiap node mewakili sesi akun X independen dengan pool komentar, routing proxy, dan status kesehatan sesi.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckFleetHealth}
              disabled={isCheckingHealth}
              className="gap-1.5 text-xs font-mono border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
              title="Periksa kesehatan cookie auth_token & proxy seluruh node"
            >
              {isCheckingHealth ? (
                <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
              ) : (
                <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
              )}
              {isCheckingHealth ? 'Checking Fleet...' : 'Fleet Health'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFleet}
              className="gap-1.5 text-xs font-mono border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              title="Unduh backup seluruh node ke file .json"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export Fleet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkImportModal()}
              className="gap-1.5 text-xs font-mono border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              Bulk Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAccounts()}
              className="gap-1 text-xs font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => openAccountModal(null)}
              className="gap-1.5 text-xs font-heading font-bold"
            >
              <Plus className="w-4 h-4" />
              Register Node
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Grid of Nodes */}
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-obsidian-850/50 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-obsidian-750 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-semibold text-base text-white">Belum Ada Node Terdaftar</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Daftarkan cookie <code className="text-flame">auth_token</code> dan <code className="text-flame">ct0</code> dari akun X Anda untuk menginisialisasi cluster.
          </p>
          <Button onClick={() => openAccountModal(null)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Daftarkan Node Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <NodeCard key={acc.id} account={acc} />
          ))}
        </div>
      )}
    </div>
  );
};
