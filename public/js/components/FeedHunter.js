/**
 * Feed Hunter Intelligence Component
 * Handles keyword feed surveillance and automated sequence triggering
 */

import { api } from '../api/apiClient.js';
import { store } from '../store/state.js';

export class FeedHunter {
  constructor(navigation) {
    this.accountSelector = document.getElementById('hunterAccountSelector');
    this.keywordInput = document.getElementById('hunterKeyword');
    this.countSelect = document.getElementById('hunterCount');
    this.checkLike = document.getElementById('hunterCheckLike');
    this.checkRetweet = document.getElementById('hunterCheckRetweet');
    this.checkComment = document.getElementById('hunterCheckComment');
    this.btnStart = document.getElementById('btnStartHunter');
    this.navigation = navigation;

    this.init();
  }

  init() {
    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => this.startHunter());
    }
    store.on('accounts', (accounts) => this.updateAccountDropdown(accounts));
  }

  updateAccountDropdown(accounts) {
    if (!this.accountSelector || !Array.isArray(accounts)) return;
    const activeAccounts = accounts.filter((a) => a.enabled !== false);

    let html = `<option value="all">⚡ All Active Nodes (${activeAccounts.length} Nodes - Sequential Rotation)</option>`;
    accounts.forEach((acc) => {
      const statusEmoji = acc.enabled === false ? '⏸' : acc.isValid ? '●' : '○';
      html += `<option value="${acc.id}">${statusEmoji} ${acc.label} (@${acc.username || 'user'})</option>`;
    });
    this.accountSelector.innerHTML = html;
  }

  async startHunter() {
    const keyword = this.keywordInput.value.trim();
    const count = parseInt(this.countSelect.value, 10) || 10;
    const accountIds = this.accountSelector.value;
    const like = this.checkLike.checked;
    const retweet = this.checkRetweet.checked;
    const comment = this.checkComment.checked;

    if (!keyword) {
      alert('Search query / hashtag is required.');
      return;
    }

    try {
      const data = await api.startHunterTask({
        accountIds,
        keyword,
        count,
        like,
        retweet,
        comment,
      });
      if (data.success) {
        if (this.navigation) {
          this.navigation.switchTab('tab-batch');
        }
        store.update({
          isRunning: true,
          currentTask: { targetCount: count, completed: 0 },
        });
      } else {
        alert(data.message || 'Failed to start Feed Hunter.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }
}
