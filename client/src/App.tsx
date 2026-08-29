import React, { useEffect } from 'react';
import { useStore, resolveTabFromUrl } from '@/store/useStore';
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

  // URL Path & Hash Synchronizer for Browser Navigation (Back/Forward & 404 Routing)
  useEffect(() => {
    const handleUrlChange = () => {
      const resolved = resolveTabFromUrl();
      setActiveTab(resolved);
    };

    handleUrlChange();

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [setActiveTab]);

  // Move keyboard/screen-reader focus to the page heading on tab change
  useEffect(() => {
    const heading = document.getElementById('page-heading');
    if (heading) {
      heading.focus({ preventScroll: true });
    }
  }, [activeTab]);

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
