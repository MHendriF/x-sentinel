import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { DeckHeader } from './DeckHeader';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sliders, Sparkles, BookOpen, Layers } from 'lucide-react';
import { AIPayloadGenerator } from './payloadBank/AIPayloadGenerator';
import { SpintaxStackWorkbench } from './payloadBank/SpintaxStackWorkbench';
import { PayloadVaultDeck, SavedPayloadFile } from './payloadBank/PayloadVaultDeck';

export const PayloadBank: React.FC = () => {
  const { accounts, loadAccounts } = useStore();

  const [activeTab, setActiveTab] = useState<'generator' | 'spintax' | 'vault'>('generator');

  // Shared Spintax & Template states
  const [templates, setTemplates] = useState<string[]>([]);
  const [testInput, setTestInput] = useState<string>(
    '{Great|Superb|Impressive} {insights|analysis|take}! 🔥 {Bookmarked|Looking forward to part 2}.'
  );

  // Shared Vault states
  const [savedFiles, setSavedFiles] = useState<SavedPayloadFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadSavedFiles();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await apiClient.getTemplates();
      if (res.success && res.templates) {
        setTemplates(res.templates);
      }
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadSavedFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await apiClient.getPayloadFiles();
      if (res.success && res.files) {
        setSavedFiles(res.files);
      }
    } catch (err: any) {
      console.error('Failed to load saved payload files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Cross-tab workflows
  const handleApplyPresetToStack = (templatesToApply: string[], presetName: string) => {
    setTemplates((prev) => [...templatesToApply, ...prev]);
    toast.success(`Injected ${templatesToApply.length} templates from "${presetName}" to stack!`);
  };

  const handleLoadTemplateToTester = (template: string) => {
    setTestInput(template);
    setActiveTab('spintax');
    toast.info('Preset template loaded into Permutation Tester!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Segmented Tab Navigation */}
      <DeckHeader
        tag="PAYLOAD STUDIO & ENGINE"
        tagColor="flame"
        icon={<Sliders className="h-5 w-5 text-flame" />}
        title="Payload Bank & AI Reply Generator"
        description="Generate contextual replies from target posts without double quotes and free from AI slop, then save to JSON."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-obsidian-950/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === 'generator'
                  ? 'bg-flame text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Generator
              <span className="rounded bg-black/30 px-1 py-0.5 text-[9px]">from Post</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('spintax')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === 'spintax'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Spintax Stack
              <span className="rounded bg-black/30 px-1 py-0.5 text-[9px] text-muted-foreground">
                {templates.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('vault');
                loadSavedFiles();
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === 'vault'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Vault &amp; JSON Files
              <span className="rounded bg-black/30 px-1 py-0.5 text-[9px] text-muted-foreground">
                {savedFiles.length}
              </span>
            </button>
          </div>
        }
      />

      {/* Tab 1: AI Reply Payload Generator */}
      {activeTab === 'generator' && (
        <AIPayloadGenerator
          accounts={accounts}
          loadAccounts={loadAccounts}
          onSavedSuccess={loadSavedFiles}
        />
      )}

      {/* Tab 2: Spintax Stack & Entropy Linter */}
      {activeTab === 'spintax' && (
        <SpintaxStackWorkbench
          templates={templates}
          setTemplates={setTemplates}
          testInput={testInput}
          setTestInput={setTestInput}
        />
      )}

      {/* Tab 3: Vault, Server JSON Explorer & Niche Presets */}
      {activeTab === 'vault' && (
        <PayloadVaultDeck
          savedFiles={savedFiles}
          isLoadingFiles={isLoadingFiles}
          onRefreshFiles={loadSavedFiles}
          accounts={accounts}
          loadAccounts={loadAccounts}
          onApplyPresetToStack={handleApplyPresetToStack}
          onLoadTemplateToTester={handleLoadTemplateToTester}
        />
      )}
    </div>
  );
};
