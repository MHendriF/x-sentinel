import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { NodeCard } from './NodeCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Plus, RefreshCw, Server, AlertCircle } from 'lucide-react';

export const NodesGrid: React.FC = () => {
  const { accounts, loadAccounts, openAccountModal } = useStore();

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return (
    <div className="space-y-5">
      {/* Top Banner / Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div>
            <div className="font-mono text-[10px] font-bold text-flame tracking-wider">
              CLUSTER TOPOLOGY
            </div>
            <CardTitle className="text-lg">Registered Computing Nodes</CardTitle>
            <CardDescription>
              Setiap node mewakili sesi akun X independen dengan pool komentar dan routing proxy tersendiri.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAccounts()}
              className="gap-1 text-xs"
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
              Register New Node
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
