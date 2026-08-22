/**
 * Accounts Grid Component
 * Manages rendering of registered X nodes, action handlers (verify, toggle, edit, delete, open payload modal)
 */

import { api } from '../api/apiClient.js';
import { store } from '../store/state.js';

export class AccountsGrid {
  constructor(modals) {
    this.container = document.getElementById('accountsGridContainer');
    this.btnAddAccount = document.getElementById('btnOpenAddAccountModal');
    this.modals = modals;

    this.init();
  }

  init() {
    if (this.btnAddAccount) {
      this.btnAddAccount.addEventListener('click', () => this.modals.openAddAccountModal());
    }
    store.on('accounts', accounts => this.render(accounts));
    this.loadAccounts();
  }

  async loadAccounts() {
    try {
      const data = await api.getAccounts();
      if (data.success && data.accounts) {
        store.set('accounts', data.accounts);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  }

  render(accounts) {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (!Array.isArray(accounts) || accounts.length === 0) {
      this.container.innerHTML = `
        <div class="node-item-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--text-pure);">No Registered Nodes Found</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 8px 0 16px;">Register your primary X account cookie and proxy tunnel to initialize node cluster.</p>
          <button class="btn btn-hallmark-primary" id="btnEmptyAdd">+ Register First Node</button>
        </div>
      `;
      const btnEmpty = document.getElementById('btnEmptyAdd');
      if (btnEmpty) btnEmpty.addEventListener('click', () => this.modals.openAddAccountModal());
      return;
    }

    accounts.forEach(acc => {
      const card = document.createElement('div');
      card.className = `node-item-card ${acc.enabled === false ? 'disabled' : ''}`;
      
      const avatarSrc = acc.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
      const proxyBadge = acc.proxy
        ? `<span class="node-badge badge-proxy-tag" title="${acc.proxy}">TUNNEL: ${acc.proxy.replace(/http:\/\/[^@]*@/, '')}</span>`
        : `<span class="node-badge" style="background: rgba(255,255,255,0.03); color: var(--text-dim);">DIRECT IP</span>`;
      
      const statusBadge = acc.isValid
        ? `<span class="node-badge badge-valid-tag">● VALID SESSION</span>`
        : `<span class="node-badge badge-unverified-tag">○ UNVERIFIED</span>`;

      const commentsCount = acc.commentsCount !== undefined ? acc.commentsCount : 3;

      card.innerHTML = `
        <div class="card-node-head">
          <div class="node-identity">
            <img src="${avatarSrc}" alt="Avatar" class="node-avatar">
            <div class="node-title-group">
              <h4>${acc.label || 'Node'}</h4>
              <div class="node-handle">@${acc.username || 'unauthenticated'}</div>
            </div>
          </div>
          <button class="btn btn-sm ${acc.enabled !== false ? 'btn-hallmark-secondary' : 'btn-outline'}" data-action="toggle" data-id="${acc.id}">
            ${acc.enabled !== false ? 'ONLINE' : 'PAUSED'}
          </button>
        </div>

        <div class="node-tags-row">
          ${statusBadge}
          ${proxyBadge}
          <span class="node-badge badge-payload-tag" data-action="comments" data-id="${acc.id}">
            💬 ${commentsCount} PAYLOAD ENTRIES
          </span>
        </div>

        <div class="card-node-actions">
          <button class="btn btn-hallmark-secondary btn-sm" data-action="verify" data-id="${acc.id}">
            ⚡ Test Probe
          </button>
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${acc.id}">
            Config
          </button>
          <button class="btn btn-outline btn-sm" data-action="delete" data-id="${acc.id}" title="Remove Node" style="color: var(--accent-crimson);">
            ✕
          </button>
        </div>
      `;

      card.querySelector('[data-action="toggle"]').addEventListener('click', () => this.toggleAccount(acc.id));
      card.querySelector('[data-action="verify"]').addEventListener('click', () => this.verifyAccount(acc.id));
      card.querySelector('[data-action="edit"]').addEventListener('click', () => this.modals.openEditAccountModal(acc));
      card.querySelector('[data-action="comments"]').addEventListener('click', () => this.modals.openCommentsModal(acc));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => this.deleteAccount(acc.id));

      this.container.appendChild(card);
    });
  }

  async toggleAccount(id) {
    try {
      await api.toggleAccount(id);
      this.loadAccounts();
    } catch (e) {
      console.error(e);
    }
  }

  async deleteAccount(id) {
    if (!confirm('Are you sure you want to remove this node?')) return;
    try {
      await api.deleteAccount(id);
      this.loadAccounts();
    } catch (e) {
      console.error(e);
    }
  }

  async verifyAccount(id) {
    const btn = document.querySelector(`[data-action="verify"][data-id="${id}"]`);
    if (btn) btn.innerText = 'PROBING...';
    try {
      const data = await api.verifyAccount(id);
      if (data.success) {
        alert(`Node verified: @${data.account.username} (${data.account.name})`);
      } else {
        alert(`Verification failed: ${data.message}`);
      }
      this.loadAccounts();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }
}
