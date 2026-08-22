/**
 * API Client Service
 * Centralized HTTP client for all backend REST & SSE endpoints
 */

export const api = {
  // Status & Telemetry
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  },

  // Accounts Management
  async getAccounts() {
    const res = await fetch('/api/accounts');
    return res.json();
  },

  async createAccount(payload) {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async updateAccount(id, payload) {
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async deleteAccount(id) {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async toggleAccount(id) {
    const res = await fetch(`/api/accounts/${id}/toggle`, { method: 'POST' });
    return res.json();
  },

  async verifyAccount(id) {
    const res = await fetch(`/api/accounts/${id}/verify`, { method: 'POST' });
    return res.json();
  },

  // Comments JSON per Account
  async getAccountComments(id) {
    const res = await fetch(`/api/accounts/${id}/comments`);
    return res.json();
  },

  async saveAccountComments(id, comments) {
    const res = await fetch(`/api/accounts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments })
    });
    return res.json();
  },

  // Tasks & Missions
  async startBatchTask(payload) {
    const res = await fetch('/api/tasks/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async startHunterTask(payload) {
    const res = await fetch('/api/tasks/hunter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async stopTask() {
    const res = await fetch('/api/tasks/stop', { method: 'POST' });
    return res.json();
  },

  // Global Templates & Spintax
  async getTemplates() {
    const res = await fetch('/api/templates');
    return res.json();
  },

  async saveTemplates(templates) {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })
    });
    return res.json();
  },

  async previewSpintax(text, count = 5) {
    const res = await fetch('/api/spintax/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, count })
    });
    return res.json();
  },

  // Settings
  async getSettings() {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async saveSettings(payload) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Audit History
  async getHistory(limit = 100) {
    const res = await fetch(`/api/history?limit=${limit}`);
    return res.json();
  },

  // SSE Log Stream Subscription
  subscribeLogs(onMessage, onError) {
    const eventSource = new EventSource('/api/logs/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CONNECTED') return;
        onMessage(data);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };
    if (onError) eventSource.onerror = onError;
    return eventSource;
  }
};
