import React, { useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FolderOpen,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Copy,
  Check,
  Download,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  FileJson,
  AlertCircle,
} from 'lucide-react';
import { PRESET_LIBRARY } from '@/lib/presetLibrary';

export interface SavedPayloadFile {
  fileName: string;
  filePath: string;
  count: number;
  sizeBytes: number;
  updatedAt: string;
}

interface AccountOption {
  id: string;
  label?: string;
  username?: string;
}

interface PayloadVaultDeckProps {
  savedFiles: SavedPayloadFile[];
  isLoadingFiles: boolean;
  onRefreshFiles: () => void;
  accounts: AccountOption[];
  loadAccounts: () => void;
  onApplyPresetToStack: (templates: string[], presetName: string) => void;
  onLoadTemplateToTester: (template: string) => void;
}

export const PayloadVaultDeck: React.FC<PayloadVaultDeckProps> = ({
  savedFiles,
  isLoadingFiles,
  onRefreshFiles,
  accounts,
  loadAccounts,
  onApplyPresetToStack,
  onLoadTemplateToTester,
}) => {
  // Search states
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_LIBRARY[0].id);

  // Inspector Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectFileName, setInspectFileName] = useState<string | null>(null);
  const [inspectReplies, setInspectReplies] = useState<string[]>([]);
  const [inspectSearchFilter, setInspectSearchFilter] = useState('');
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);
  const [inspectCopiedAll, setInspectCopiedAll] = useState(false);

  // Delete Dialog State
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered files
  const filteredFiles = savedFiles.filter((f) =>
    f.fileName.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  const activePreset =
    PRESET_LIBRARY.find((p) => p.id === selectedPresetId) || PRESET_LIBRARY[0];

  const filteredPresetTemplates = activePreset.templates.filter((tmpl) =>
    tmpl.toLowerCase().includes(presetSearchQuery.toLowerCase())
  );

  // Open file content inspector
  const handleInspectFile = async (fileName: string) => {
    setInspectFileName(fileName);
    setInspectSearchFilter('');
    setInspectModalOpen(true);
    setIsLoadingInspect(true);
    try {
      const res = await apiClient.getPayloadFileContent(fileName);
      if (res.success && res.replies) {
        setInspectReplies(res.replies);
      } else {
        toast.error(res.message || 'Failed to read file content.');
        setInspectReplies([]);
      }
    } catch (err: any) {
      toast.error(`Inspect error: ${err.message}`);
      setInspectReplies([]);
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // Delete file handler
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.deletePayloadFile(fileToDelete);
      if (res.success) {
        toast.success(`Deleted payload file '${fileToDelete}'`);
        setFileToDelete(null);
        onRefreshFiles();
      } else {
        toast.error(res.message || 'Failed to delete file.');
      }
    } catch (err: any) {
      toast.error(`Delete error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Direct deploy from file to account
  const handleDeployFileToAccount = async (fileName: string, accountId: string) => {
    if (!accountId) return;
    try {
      // First fetch content if needed
      const res = await apiClient.getPayloadFileContent(fileName);
      if (res.success && res.replies && res.replies.length > 0) {
        const assignRes = await apiClient.saveAccountComments(accountId, res.replies);
        if (assignRes.success) {
          const acc = accounts.find((a) => a.id === accountId);
          toast.success(
            `Deployed ${res.replies.length} replies from '${fileName}' to @${
              acc?.username || acc?.label
            }!`
          );
          loadAccounts();
        }
      } else {
        toast.error('File contains no replies to deploy.');
      }
    } catch (err: any) {
      toast.error(`Failed to deploy: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Server Files Explorer */}
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-amber-400">
              <FolderOpen className="h-3.5 w-3.5" />
              SERVER REPOSITORIES &amp; VAULT
            </div>
            <CardTitle className="text-base">Saved Payload Files (.JSON)</CardTitle>
            <CardDescription className="text-xs">
              Directly managed files stored under{' '}
              <code className="rounded bg-obsidian-950 px-1 py-0.5 text-amber-300">
                data/comments/*.json
              </code>
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                placeholder="Search file name..."
                className="h-8 border-slate-800 bg-obsidian-950 pl-8 font-mono text-xs text-slate-200"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefreshFiles}
              disabled={isLoadingFiles}
              className="h-8 gap-1.5 border-slate-800 font-mono text-xs text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 bg-obsidian-950/60 py-10 text-center">
              <FileJson className="mx-auto h-8 w-8 text-slate-600" />
              <div className="mt-2 text-xs font-semibold text-slate-300">
                {savedFiles.length === 0
                  ? 'No .json files saved in comments directory yet.'
                  : 'No files match your search query.'}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Generate new reply sets in AI Generator or save templates to populate this directory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="group flex flex-col justify-between rounded-lg border border-slate-800 bg-obsidian-950 p-3.5 transition-all hover:border-slate-700 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="truncate font-mono text-xs font-bold text-amber-300 hover:underline cursor-pointer"
                        onClick={() => handleInspectFile(f.fileName)}
                        title={f.fileName}
                      >
                        {f.fileName}
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500/30 bg-amber-500/10 font-mono text-[9px] text-amber-300"
                      >
                        {f.count} replies
                      </Badge>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {Math.max(1, Math.round(f.sizeBytes / 1024))} KB · {f.filePath}
                    </div>

                    {/* Quick deploy dropdown */}
                    {accounts.length > 0 && (
                      <div className="pt-1">
                        <select
                          className="w-full rounded border border-slate-800 bg-obsidian-900 px-2 py-1 font-mono text-[10px] text-slate-300 focus:outline-none hover:border-slate-700"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleDeployFileToAccount(f.fileName, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            ⚡ Deploy to Fleet Node...
                          </option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              @{acc.username || acc.label || acc.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleInspectFile(f.fileName)}
                      className="flex items-center gap-1 font-mono text-[10px] text-slate-400 transition-colors hover:text-white"
                      title="Inspect content"
                    >
                      <Eye className="h-3 w-3 text-cyan-400" />
                      Inspect
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(f.filePath);
                          toast.success(`Copied path: ${f.filePath}`);
                        }}
                        className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Copy file path"
                      >
                        Copy Path
                      </button>

                      <button
                        type="button"
                        onClick={() => setFileToDelete(f.fileName)}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-red-950/40 hover:text-red-400"
                        title="Delete file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Curated Niche Presets Library */}
      <Card className="border-amber-500/30 bg-obsidian-900/90 shadow-xl shadow-amber-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-amber-400">
              <BookOpen className="h-3.5 w-3.5" />
              CURATED TEMPLATE VAULT
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 font-mono text-[9px] text-amber-300"
            >
              5 INDUSTRY NICHES READY
            </Badge>
          </div>
          <CardTitle className="text-base">Multi-Niche Spintax Library</CardTitle>
          <CardDescription className="text-xs">
            Deploy high-signal spintax templates engineered for Web3, AI Agents, Devs, and Indonesian Communities.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Niche Tabs */}
          <div className="flex flex-wrap gap-2">
            {PRESET_LIBRARY.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-md shadow-amber-500/10'
                      : 'border-slate-800 bg-obsidian-950/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{preset.name}</span>
                  <Badge
                    variant="outline"
                    className="border-current px-1 py-0 text-[9px] opacity-70"
                  >
                    {preset.templates.length}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Active Niche Content Display */}
          <div className="space-y-4 rounded-lg border border-border/80 bg-obsidian-950/90 p-4">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-border/80 pb-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 font-heading text-sm font-bold text-white">
                  {activePreset.name}
                  <Badge variant="outline" className="border-purple-500/50 bg-purple-500/10 font-mono text-[10px] text-purple-300">
                    {activePreset.badge}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{activePreset.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-44">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={presetSearchQuery}
                    onChange={(e) => setPresetSearchQuery(e.target.value)}
                    placeholder="Filter templates..."
                    className="h-7 border-slate-800 bg-obsidian-900 pl-7 font-mono text-[11px] text-slate-200"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApplyPresetToStack(activePreset.templates, activePreset.name)}
                  className="h-7 gap-1.5 border-amber-500/40 font-mono text-xs text-amber-300 hover:bg-amber-500/10"
                >
                  <ArrowRight className="h-3 w-3 text-amber-400" />
                  Apply All to Stack
                </Button>
              </div>
            </div>

            {/* List of Templates in this Niche */}
            <div className="space-y-2">
              {filteredPresetTemplates.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No templates match &quot;{presetSearchQuery}&quot; in this niche.
                </div>
              ) : (
                filteredPresetTemplates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="group flex items-start justify-between gap-3 rounded-md border border-slate-800 bg-obsidian-900/80 p-3 transition-colors hover:border-slate-700"
                  >
                    <div className="select-all font-mono text-xs leading-relaxed text-slate-200">
                      {tmpl}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onLoadTemplateToTester(tmpl)}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-300"
                        title="Load into Permutation Tester"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(tmpl);
                          toast.success('Template copied to clipboard!');
                        }}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-emerald-400"
                        title="Copy template"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. File Content Inspector Modal */}
      <Dialog open={inspectModalOpen} onOpenChange={(open) => !open && setInspectModalOpen(false)}>
        <DialogContent className="max-w-2xl border-border/80 bg-obsidian-950 text-slate-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
              <Eye className="h-3.5 w-3.5" />
              PAYLOAD FILE INSPECTOR
            </div>
            <DialogTitle className="flex items-center justify-between font-heading text-lg font-bold text-white">
              <span>{inspectFileName}</span>
              <Badge variant="outline" className="font-mono text-xs text-amber-300">
                {inspectReplies.length} replies
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Inspecting content stored in <code>data/comments/{inspectFileName}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  value={inspectSearchFilter}
                  onChange={(e) => setInspectSearchFilter(e.target.value)}
                  placeholder="Filter replies in this file..."
                  className="h-8 border-slate-800 bg-obsidian-900 pl-8 font-mono text-xs text-slate-200"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const jsonStr = JSON.stringify(inspectReplies, null, 2);
                  navigator.clipboard.writeText(jsonStr);
                  setInspectCopiedAll(true);
                  toast.success('All replies copied as JSON!');
                  setTimeout(() => setInspectCopiedAll(false), 2000);
                }}
                className="h-8 gap-1.5 border-slate-800 font-mono text-xs text-slate-300 hover:bg-slate-800"
              >
                {inspectCopiedAll ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-emerald-400" />
                )}
                Copy JSON
              </Button>
            </div>

            {isLoadingInspect ? (
              <div className="py-12 text-center">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
                <div className="mt-2 font-mono text-xs text-slate-400">Loading file content...</div>
              </div>
            ) : (
              <div className="max-h-[380px] space-y-1.5 overflow-y-auto rounded-lg border border-slate-800 bg-obsidian-900/60 p-2.5">
                {inspectReplies
                  .filter((r) => r.toLowerCase().includes(inspectSearchFilter.toLowerCase()))
                  .map((reply, idx) => (
                    <div
                      key={idx}
                      className="group flex items-start gap-2.5 rounded border border-slate-800/60 bg-obsidian-950/80 p-2 transition-colors hover:border-slate-700"
                    >
                      <span className="flex h-5 w-5 shrink-0 select-none items-center justify-center rounded bg-slate-800 font-mono text-[10px] font-bold text-amber-400">
                        {idx + 1}
                      </span>
                      <p className="flex-1 font-mono text-xs leading-relaxed text-slate-200 select-all">
                        {reply}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(reply);
                          toast.success('Reply copied!');
                        }}
                        className="shrink-0 p-1 text-slate-500 opacity-60 transition-opacity group-hover:opacity-100 hover:text-white"
                        title="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectModalOpen(false)}
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Delete File Confirmation Dialog */}
      <Dialog open={Boolean(fileToDelete)} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <DialogContent className="max-w-md border-border/80 bg-obsidian-950 text-slate-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              CONFIRM DELETION
            </div>
            <DialogTitle className="font-heading text-base font-bold text-white">
              Delete Payload File?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Are you sure you want to permanently delete{' '}
              <code className="text-red-300">{fileToDelete}</code> from the comments directory?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFileToDelete(null)}
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5 font-heading text-xs font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Delete File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
