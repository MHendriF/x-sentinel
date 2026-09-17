import React, { useState, useEffect } from 'react';
import { apiClient, SystemHealthData } from '@/services/apiClient';
import { DeckHeader } from './DeckHeader';
import { AboutHeroBanner } from './about/AboutHeroBanner';
import { LiveTelemetryHUD } from './about/LiveTelemetryHUD';
import { SystemDiagnosticModal } from './about/SystemDiagnosticModal';
import { CoreCapabilitiesGrid } from './about/CoreCapabilitiesGrid';
import { ModularArchitectureCard } from './about/ModularArchitectureCard';
import { SystemSpecsCard } from './about/SystemSpecsCard';
import { DocsCatalogCard } from './about/DocsCatalogCard';
import { SecurityNotice } from './about/SecurityNotice';
import { Info, Activity, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AboutDeck: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'telemetry' | 'docs'>('overview');
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await apiClient.getSystemHealth();
      if (res.success) {
        setHealth(res);
      }
    } catch (err: any) {
      console.error('Failed to load system health:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  return (
    <div className="animate-in fade-in space-y-6 pb-8 duration-300">
      {/* Cockpit Deck Header with Segmented Navigation & Diagnostic Action */}
      <DeckHeader
        tag="SYSTEM INTELLIGENCE & SPECS"
        tagColor="flame"
        badge="CORE v1.3.4"
        icon={<Info className="h-5 w-5 text-flame" />}
        title="About &amp; System Intelligence Deck"
        description="Autonomous multi-node fleet architecture, live telemetry runtime metrics, and engineering documentation."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-obsidian-950/80 p-1">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                  activeSubTab === 'overview'
                    ? 'bg-flame text-obsidian-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Overview
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('telemetry');
                  loadHealth();
                }}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                  activeSubTab === 'telemetry'
                    ? 'bg-slate-800 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Live Telemetry
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('docs')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                  activeSubTab === 'docs'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Docs &amp; Specs
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="h-8 gap-1.5 border-flame/40 font-mono text-xs text-flame hover:bg-flame/10"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>🩺 System Audit</span>
            </Button>
          </div>
        }
      />

      {/* Tab 1: System Overview & Surface Launchers */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <AboutHeroBanner />
          <CoreCapabilitiesGrid />
        </div>
      )}

      {/* Tab 2: Realtime Telemetry & Memory Footprint */}
      {activeSubTab === 'telemetry' && (
        <div className="space-y-6">
          <LiveTelemetryHUD
            health={health}
            isLoading={isLoadingHealth}
            onRefresh={loadHealth}
            onRunDiagnostics={() => setIsDiagnosticModalOpen(true)}
          />
          <SystemSpecsCard />
        </div>
      )}

      {/* Tab 3: Codebase Architecture & Docs Suite */}
      {activeSubTab === 'docs' && (
        <div className="space-y-6">
          <ModularArchitectureCard />
          <DocsCatalogCard />
          <SecurityNotice />
        </div>
      )}

      {/* 6-Pillar System Diagnostic Modal */}
      <SystemDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
      />
    </div>
  );
};
