/**
 * Audit Ledger Component
 * Renders the interaction history table and provides manual refresh
 */

import { api } from '../api/apiClient.js';
import { store } from '../store/state.js';

export class AuditLedger {
  constructor() {
    this.tableBody = document.getElementById('historyTableBody');
    this.btnRefresh = document.getElementById('btnRefreshHistory');

    this.init();
  }

  init() {
    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', () => this.loadHistory());
    }
    store.on('activeTab', tab => {
      if (tab === 'tab-history') this.loadHistory();
    });
    this.loadHistory();
  }

  async loadHistory() {
    try {
      const data = await api.getHistory(100);
      if (data.success) {
        if (data.history) this.render(data.history);
        if (data.stats) store.set('stats', data.stats);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }

  render(items) {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
      this.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No audit events recorded yet.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      const actionClass = {
        LIKE: 'action-like',
        RETWEET: 'action-retweet',
        COMMENT: 'action-comment'
      }[item.action] || '';

      const statusClass = {
        SUCCESS: 'status-success',
        ALREADY_DONE: 'status-already',
        FAILED: 'status-failed'
      }[item.status] || '';

      const shortUrl = item.tweetUrl ? item.tweetUrl.replace('https://x.com/', '').replace('https://twitter.com/', '') : '-';

      tr.innerHTML = `
        <td>${item.timeFormatted || item.timestamp?.slice(11, 19) || '-'}</td>
        <td><strong>${item.accountName ? `@${item.accountName}` : 'NODE'}</strong></td>
        <td><span class="action-badge ${actionClass}">${item.action}</span></td>
        <td><a href="${item.tweetUrl}" target="_blank" style="color: var(--accent-amber); text-decoration: none;">${shortUrl}</a></td>
        <td><span class="status-badge ${statusClass}">${item.status}</span></td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.details || item.message || '-'}</td>
      `;
      this.tableBody.appendChild(tr);
    });
  }
}
