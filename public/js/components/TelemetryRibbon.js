/**
 * Telemetry Ribbon Component
 * Displays real-time metrics (Likes, Reposts, Replies, Active Node cluster counts)
 */

import { store } from '../store/state.js';

export class TelemetryRibbon {
  constructor() {
    this.statLikes = document.getElementById('statLikes');
    this.statRetweets = document.getElementById('statRetweets');
    this.statComments = document.getElementById('statComments');
    this.sidebarTotalAccounts = document.getElementById('sidebarTotalAccounts');
    this.sidebarActiveAccounts = document.getElementById('sidebarActiveAccounts');
    this.sidebarRateMetric = document.getElementById('sidebarRateMetric');

    this.init();
  }

  init() {
    store.on('stats', stats => this.renderStats(stats));
    store.on('accounts', accounts => this.renderAccountsSummary(accounts));
  }

  renderStats(stats) {
    if (!stats) return;
    if (this.statLikes) this.statLikes.innerText = stats.totalLikes || 0;
    if (this.statRetweets) this.statRetweets.innerText = stats.totalRetweets || 0;
    if (this.statComments) this.statComments.innerText = stats.totalComments || 0;
  }

  renderAccountsSummary(accounts) {
    if (!Array.isArray(accounts)) return;
    const total = accounts.length;
    const active = accounts.filter(a => a.enabled !== false).length;

    if (this.sidebarTotalAccounts) this.sidebarTotalAccounts.innerText = total;
    if (this.sidebarActiveAccounts) this.sidebarActiveAccounts.innerText = active;
    if (this.sidebarRateMetric) {
      this.sidebarRateMetric.innerText = active > 0 ? `${active}x TUNNEL` : 'IDLE';
    }
  }
}
