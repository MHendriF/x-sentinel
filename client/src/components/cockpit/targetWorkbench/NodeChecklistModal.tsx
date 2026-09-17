import React, { useState, useMemo } from 'react';
import { AccountNode } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  HelpCircle,
  Users,
} from 'lucide-react';

interface NodeChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountNode[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

export const NodeChecklistModal: React.FC<NodeChecklistModalProps> = ({
  isOpen,
  onClose,
  accounts,
  selectedIds,
  onConfirm,
}) => {
  const [search, setSearch] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(() => selectedIds);

  // Sync tempSelected whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedIds);
    }
  }, [isOpen, selectedIds]);

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.enabled !== false);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeAccounts;
    return activeAccounts.filter(
      (a) =>
        (a.label && a.label.toLowerCase().includes(term)) ||
        (a.username && a.username.toLowerCase().includes(term)) ||
        (a.proxy && a.proxy.toLowerCase().includes(term))
    );
  }, [activeAccounts, search]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setTempSelected(activeAccounts.map((a) => a.id));
  };

  const handleSelectHealthyOnly = () => {
    const healthy = activeAccounts.filter((a) => a.healthStatus === 'HEALTHY' || a.isValid);
    setTempSelected(healthy.map((a) => a.id));
  };

  const handleDeselectAll = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    onConfirm(tempSelected);
    onClose();
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] max-h-[640px] w-full max-w-lg flex-col rounded-xl border border-border/80 bg-obsidian-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h3 className="font-heading text-sm font-bold text-white">Custom Fleet Selection</h3>
            <Badge variant="outline" className="border-emerald-500/40 font-mono text-[10px] text-emerald-400">
              {tempSelected.length} / {activeAccounts.length} Selected
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Quick Filter Toolbar */}
        <div className="space-y-2.5 border-b border-border/50 p-3 bg-obsidian-950/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Search by label, @handle, or proxy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-6 px-2 py-0 text-[10px]"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectHealthyOnly}
              className="h-6 border-emerald-500/30 bg-emerald-500/10 px-2 py-0 text-[10px] text-emerald-300 hover:bg-emerald-500/20"
            >
              <CheckCircle2 className="mr-1 h-2.5 w-2.5 text-emerald-400" />
              Healthy Only
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="h-6 px-2 py-0 text-[10px] text-slate-400 hover:text-red-400"
            >
              Deselect All
            </Button>
          </div>
        </div>

        {/* Scrollable Node List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Users className="mb-2 h-8 w-8 text-slate-600" />
              <p className="font-mono text-xs">No active nodes match the search criteria.</p>
            </div>
          ) : (
            filteredAccounts.map((acc) => {
              const isSelected = tempSelected.includes(acc.id);
              const isHealthy = acc.healthStatus === 'HEALTHY';
              const isExpired = acc.healthStatus === 'EXPIRED';
              const isProxyDead = acc.healthStatus === 'PROXY_DEAD';

              return (
                <div
                  key={acc.id}
                  onClick={() => toggleSelect(acc.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-colors ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-950/20 text-white'
                      : 'border-border/60 bg-obsidian-950/60 text-slate-400 hover:border-slate-700 hover:bg-obsidian-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(acc.id)}
                      className="h-4 w-4 rounded border-slate-700 bg-obsidian-950 text-emerald-500 focus:ring-emerald-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {acc.avatar ? (
                      <img
                        src={acc.avatar}
                        alt={acc.label}
                        className="h-7 w-7 shrink-0 rounded-full border border-slate-800 object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 font-mono text-xs font-bold text-slate-300">
                        {acc.label.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="truncate text-left">
                      <div className="truncate font-heading text-xs font-semibold text-slate-100">
                        {acc.label}
                      </div>
                      <div className="truncate font-mono text-[10px] text-slate-400">
                        @{acc.username || 'unknown'}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {isHealthy ? (
                      <Badge variant="success" className="h-4.5 px-1 font-mono text-[9px]">
                        <CheckCircle2 className="mr-0.5 h-2 w-2" />
                        Healthy
                      </Badge>
                    ) : isExpired ? (
                      <Badge variant="destructive" className="h-4.5 px-1 font-mono text-[9px]">
                        <AlertTriangle className="mr-0.5 h-2 w-2" />
                        Expired
                      </Badge>
                    ) : isProxyDead ? (
                      <Badge variant="destructive" className="h-4.5 px-1 font-mono text-[9px]">
                        <WifiOff className="mr-0.5 h-2 w-2" />
                        Proxy Dead
                      </Badge>
                    ) : acc.isValid ? (
                      <Badge variant="success" className="h-4.5 px-1 font-mono text-[9px]">
                        Valid
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="h-4.5 px-1 font-mono text-[9px] text-slate-400">
                        <HelpCircle className="mr-0.5 h-2 w-2" />
                        Unchecked
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 p-3 bg-obsidian-950">
          <span className="font-mono text-xs text-slate-400">
            Selected: <strong className="text-emerald-400">{tempSelected.length}</strong> node(s)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={tempSelected.length === 0}
              className="border-emerald-500/50 bg-emerald-600 font-mono text-xs font-bold text-white hover:bg-emerald-500"
            >
              Confirm Selection ({tempSelected.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
