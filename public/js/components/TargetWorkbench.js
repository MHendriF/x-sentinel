/**
 * Target Workbench Component
 * Handles batch URL inputs, vector checkboxes, execution triggers, and progress tracking
 */

import { api } from '../api/apiClient.js';
import { store } from '../store/state.js';

export class TargetWorkbench {
  constructor() {
    this.targetUrls = document.getElementById('targetUrls');
    this.urlCounter = document.getElementById('urlCounter');
    this.accountSelector = document.getElementById('batchAccountSelector');
    this.checkLike = document.getElementById('checkLike');
    this.checkRetweet = document.getElementById('checkRetweet');
    this.checkComment = document.getElementById('checkComment');
    this.customCommentInput = document.getElementById('customCommentInput');
    this.btnStart = document.getElementById('btnStartBatch');
    this.btnStop = document.getElementById('btnStopTask');
    this.btnBatchText = document.getElementById('btnBatchText');
    this.taskStatusBadge = document.getElementById('taskStatusBadge');
    this.progressLabel = document.getElementById('progressLabel');
    this.progressPercent = document.getElementById('progressPercent');
    this.progressBarFill = document.getElementById('progressBarFill');

    this.init();
  }

  init() {
    if (this.targetUrls) {
      this.targetUrls.addEventListener('input', () => this.updateCounter());
    }
    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => this.startMission());
    }
    if (this.btnStop) {
      this.btnStop.addEventListener('click', () => this.stopMission());
    }

    store.on('accounts', accounts => this.updateAccountDropdown(accounts));
    store.on('change', () => this.syncRunningState());
  }

  updateCounter() {
    const urls = this.targetUrls.value.split('\n').map(u => u.trim()).filter(Boolean);
    if (this.urlCounter) {
      this.urlCounter.innerText = `${urls.length} TARGETS`;
    }
  }

  updateAccountDropdown(accounts) {
    if (!this.accountSelector || !Array.isArray(accounts)) return;
    const activeAccounts = accounts.filter(a => a.enabled !== false);

    let html = `<option value="all">⚡ All Active Nodes (${activeAccounts.length} Nodes - Sequential Rotation)</option>`;
    accounts.forEach(acc => {
      const statusEmoji = acc.enabled === false ? '⏸' : (acc.isValid ? '●' : '○');
      html += `<option value="${acc.id}">${statusEmoji} ${acc.label} (@${acc.username || 'user'})</option>`;
    });
    this.accountSelector.innerHTML = html;
  }

  async startMission() {
    const urls = this.targetUrls.value.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      alert('Please specify at least one target tweet URL.');
      return;
    }

    const accountIds = this.accountSelector.value;
    const like = this.checkLike.checked;
    const retweet = this.checkRetweet.checked;
    const comment = this.checkComment.checked;
    const commentText = this.customCommentInput.value.trim();

    if (!like && !retweet && !comment) {
      alert('Select at least one interaction vector.');
      return;
    }

    try {
      const data = await api.startBatchTask({ accountIds, urls, like, retweet, comment, commentText });
      if (data.success) {
        store.update({
          isRunning: true,
          currentTask: { total: urls.length, completed: 0 }
        });
      } else {
        alert(data.message || 'Failed to start mission.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async stopMission() {
    try {
      await api.stopTask();
      store.update({ isRunning: false });
    } catch (err) {
      console.error(err);
    }
  }

  syncRunningState() {
    const isRunning = store.get('isRunning');
    const task = store.get('currentTask');

    if (isRunning) {
      if (this.taskStatusBadge) {
        this.taskStatusBadge.className = 'status-indicator-badge status-running';
        this.taskStatusBadge.innerText = 'EXECUTING';
      }
      if (this.btnStart) this.btnStart.style.display = 'none';
      if (this.btnStop) this.btnStop.style.display = 'block';

      if (task) {
        const total = task.total || task.targetCount || 1;
        const current = task.completed || 0;
        const pct = Math.min(100, Math.round((current / total) * 100));
        if (this.progressLabel) this.progressLabel.innerText = `PIPELINE: ${current}/${total} ACTIONS (${task.accountsCount || 1} NODES)`;
        if (this.progressPercent) this.progressPercent.innerText = `${pct}%`;
        if (this.progressBarFill) this.progressBarFill.style.width = `${pct}%`;
      }
    } else {
      if (this.taskStatusBadge) {
        this.taskStatusBadge.className = 'status-indicator-badge status-idle';
        this.taskStatusBadge.innerText = 'STANDBY';
      }
      if (this.btnStart) this.btnStart.style.display = 'block';
      if (this.btnStop) this.btnStop.style.display = 'none';
    }
  }
}
