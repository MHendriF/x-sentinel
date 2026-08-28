import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { NavDeck } from '@/components/cockpit/NavDeck';
import { TelemetryRibbon } from '@/components/cockpit/TelemetryRibbon';
import { NodesGrid } from '@/components/cockpit/NodesGrid';
import { PostStudio } from '@/components/cockpit/PostStudio';
import { TargetWorkbench } from '@/components/cockpit/TargetWorkbench';
import { FeedHunter } from '@/components/cockpit/FeedHunter';
import { AnalyticsDeck } from '@/components/cockpit/AnalyticsDeck';
import { PayloadBank } from '@/components/cockpit/PayloadBank';
import { DefenseProtocol } from '@/components/cockpit/DefenseProtocol';
import { AISettingsDeck } from '@/components/cockpit/AISettingsDeck';
import { AuditLedger } from '@/components/cockpit/AuditLedger';
import { AboutDeck } from '@/components/cockpit/AboutDeck';
import { NotFoundDeck } from '@/components/cockpit/NotFoundDeck';
import { AccountModal } from '@/components/cockpit/AccountModal';
import { CommentsModal } from '@/components/cockpit/CommentsModal';
import { DeleteNodeDialog } from '@/components/cockpit/DeleteNodeDialog';
import { BulkImportModal } from '@/components/cockpit/BulkImportModal';
import { Toaster } from '@/components/ui/sonner';

const VALID_TABS = [
  'tab-accounts',
  'tab-composer',
  'tab-batch',
  'tab-hunter',
  'tab-analytics',
  'tab-ai',
  'tab-spintax',
  'tab-safety',
  'tab-history',
  'tab-about',
];

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    loadAccounts,
    loadSettings,
    setStats,
    setIsRunning,
    addLog,
    isBulkImportOpen,
    closeBulkImportModal,
  } = useStore();

  // URL Hash Synchronizer for Browser Navigation (Back/Forward & 404 Routing)
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();

      if (!rawHash) {
        setActiveTab('tab-accounts');
        return;
      }

      const candidate = rawHash.startsWith('tab-') ? rawHash : `tab-${rawHash}`;

      if (VALID_TABS.includes(candidate)) {
        setActiveTab(candidate);
      } else if (
        rawHash === 'composer' ||
        rawHash === 'post' ||
        rawHash === 'create-post' ||
        rawHash === 'studio'
      ) {
        setActiveTab('tab-composer');
      } else if (rawHash === 'workbench' || rawHash === 'target') {
        setActiveTab('tab-batch');
      } else if (rawHash === 'payloads' || rawHash === 'payload' || rawHash === 'spintax') {
        setActiveTab('tab-spintax');
      } else if (rawHash === 'logs' || rawHash === 'audit' || rawHash === 'history') {
        setActiveTab('tab-history');
      } else if (rawHash === 'nodes' || rawHash === 'proxies' || rawHash === 'accounts') {
        setActiveTab('tab-accounts');
      } else if (rawHash === 'hunter' || rawHash === 'radar') {
        setActiveTab('tab-hunter');
      } else if (rawHash === 'analytics' || rawHash === 'growth') {
        setActiveTab('tab-analytics');
      } else if (rawHash === 'ai' || rawHash === 'models') {
        setActiveTab('tab-ai');
      } else if (rawHash === 'safety' || rawHash === 'defense' || rawHash === 'webhooks') {
        setActiveTab('tab-safety');
      } else if (rawHash === 'about' || rawHash === 'docs' || rawHash === 'specs') {
        setActiveTab('tab-about');
      } else {
        // Unknown sector/path -> 404 Not Found Page
        setActiveTab('tab-404');
      }
    };

    // Run on initial page load
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab]);

  // Initial Data Load & SSE Subscription
  useEffect(() => {
    loadAccounts();
    loadSettings();

    // SSE Log Stream
    const eventSource = apiClient.subscribeLogs((log) => {
      addLog(log);
    });

    // Periodic Telemetry Poller
    const syncStatus = async () => {
      try {
        const data = await apiClient.getStatus();
        if (data.success) {
          if (data.stats) setStats(data.stats);
          setIsRunning(Boolean(data.isRunning), data.currentTask || null);
        }
      } catch (err) {
        // ignore background poll error
      }
    };

    syncStatus();
    const interval = setInterval(syncStatus, 3500);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [loadAccounts, setStats, setIsRunning, addLog]);

  return (
    <div className="flex min-h-screen bg-obsidian-900 text-slate-100 selection:bg-amber-500/20 selection:text-amber-300">
      {/* Navigation Deck (Left Aside) */}
      <NavDeck />

      {/* Main Workspace (Right Content) */}
      <main className="flex w-full max-w-7xl flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Top Telemetry Ribbon */}
        <TelemetryRibbon />

        {/* Dynamic Tab Surfaces */}
        <div className="flex-1">
          {activeTab === 'tab-accounts' && <NodesGrid />}
          {activeTab === 'tab-composer' && <PostStudio />}
          {activeTab === 'tab-batch' && <TargetWorkbench />}
          {activeTab === 'tab-hunter' && <FeedHunter />}
          {activeTab === 'tab-analytics' && <AnalyticsDeck />}
          {activeTab === 'tab-ai' && <AISettingsDeck />}
          {activeTab === 'tab-spintax' && <PayloadBank />}
          {activeTab === 'tab-safety' && <DefenseProtocol />}
          {activeTab === 'tab-history' && <AuditLedger />}
          {activeTab === 'tab-about' && <AboutDeck />}
          {activeTab === 'tab-404' && <NotFoundDeck />}
          {![...VALID_TABS, 'tab-404'].includes(activeTab) && <NotFoundDeck />}
        </div>
      </main>

      {/* Global Modals & Notifications */}
      <AccountModal />
      <CommentsModal />
      <DeleteNodeDialog />
      <BulkImportModal isOpen={isBulkImportOpen} onClose={closeBulkImportModal} />
      <Toaster position="bottom-right" richColors />
    </div>
  );
};
