/**
 * Main Application Bootstrap
 * Initializes all modular components and coordinates event flow
 */

import { api } from './api/apiClient.js';
import { store } from './store/state.js';
import { Navigation } from './components/Navigation.js';
import { TelemetryRibbon } from './components/TelemetryRibbon.js';
import { AccountsGrid } from './components/AccountsGrid.js';
import { TargetWorkbench } from './components/TargetWorkbench.js';
import { FeedHunter } from './components/FeedHunter.js';
import { SpintaxTester } from './components/SpintaxTester.js';
import { DefenseProtocol } from './components/DefenseProtocol.js';
import { AuditLedger } from './components/AuditLedger.js';
import { TerminalConsole } from './components/TerminalConsole.js';
import { Modals } from './components/Modals.js';

class App {
  constructor() {
    this.init();
  }

  async init() {
    console.log('[SYS] Initializing X-AutoEngage Cockpit Component Engine...');

    // 1. Initialize Modals
    this.modals = new Modals();

    // 2. Initialize Navigation & Telemetry
    this.navigation = new Navigation();
    this.telemetry = new TelemetryRibbon();

    // 3. Initialize Domain Components
    this.accountsGrid = new AccountsGrid(this.modals);
    this.targetWorkbench = new TargetWorkbench();
    this.feedHunter = new FeedHunter(this.navigation);
    this.spintaxTester = new SpintaxTester();
    this.defenseProtocol = new DefenseProtocol();
    this.auditLedger = new AuditLedger();
    this.terminalConsole = new TerminalConsole();

    // 4. Initial Status Sync & Poller
    await this.syncStatus();
    setInterval(() => this.syncStatus(), 4000);

    console.log('[SYS] X-AutoEngage Cockpit Components Ready.');
  }

  async syncStatus() {
    try {
      const data = await api.getStatus();
      if (data.success) {
        store.update({
          stats: data.stats || {},
          isRunning: data.isRunning || false,
          currentTask: data.currentTask || null,
        });
      }
    } catch (err) {
      // ignore
    }
  }
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.xAutoEngageApp = new App();
});
