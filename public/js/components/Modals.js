/**
 * Modals Component
 * Manages Account Registration Modal and Node JSON Comments Editor & Uploader Modal
 */

import { api } from '../api/apiClient.js';
import { store } from '../store/state.js';

export class Modals {
  constructor() {
    // Account Modal
    this.accountModal = document.getElementById('accountModal');
    this.modalAccountTitle = document.getElementById('modalAccountTitle');
    this.btnCloseAccount = document.getElementById('btnCloseAccountModal');
    this.btnCancelAccount = document.getElementById('btnCancelAccountModal');
    this.btnSaveAccount = document.getElementById('btnSaveAccountModal');
    this.editAccountId = document.getElementById('editAccountId');
    this.accInputLabel = document.getElementById('accInputLabel');
    this.accInputAuthToken = document.getElementById('accInputAuthToken');
    this.accInputCt0 = document.getElementById('accInputCt0');
    this.accInputProxy = document.getElementById('accInputProxy');

    // Comments Modal
    this.commentsModal = document.getElementById('commentsModal');
    this.commentsModalTitle = document.getElementById('commentsModalTitle');
    this.commentsModalSubtitle = document.getElementById('commentsModalSubtitle');
    this.btnCloseComments = document.getElementById('btnCloseCommentsModal');
    this.btnCancelComments = document.getElementById('btnCancelCommentsModal');
    this.btnSaveComments = document.getElementById('btnSaveAccountCommentsModal');
    this.commentsModalAccountId = document.getElementById('commentsModalAccountId');
    this.accountCommentsList = document.getElementById('accountCommentsList');
    this.btnAddCommentRow = document.getElementById('btnAddAccountCommentRow');
    this.inputFileUpload = document.getElementById('inputFileUploadComments');

    this.init();
  }

  init() {
    // Password Peeker
    document.querySelectorAll('.btn-peek').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });

    // Account Modal Controls
    if (this.btnCloseAccount) this.btnCloseAccount.addEventListener('click', () => this.closeAccountModal());
    if (this.btnCancelAccount) this.btnCancelAccount.addEventListener('click', () => this.closeAccountModal());
    if (this.btnSaveAccount) this.btnSaveAccount.addEventListener('click', () => this.saveAccount());

    // Comments Modal Controls
    if (this.btnCloseComments) this.btnCloseComments.addEventListener('click', () => this.closeCommentsModal());
    if (this.btnCancelComments) this.btnCancelComments.addEventListener('click', () => this.closeCommentsModal());
    if (this.btnSaveComments) this.btnSaveComments.addEventListener('click', () => this.saveComments());
    if (this.btnAddCommentRow) this.btnAddCommentRow.addEventListener('click', () => this.addCommentRow(''));

    // File Upload .json
    if (this.inputFileUpload) {
      this.inputFileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
    }
  }

  // Account Modal Methods
  openAddAccountModal() {
    const accounts = store.get('accounts') || [];
    this.editAccountId.value = '';
    this.modalAccountTitle.innerText = 'Register New X Node';
    this.accInputLabel.value = `Node-${accounts.length + 1}`;
    this.accInputAuthToken.value = '';
    this.accInputCt0.value = '';
    this.accInputProxy.value = '';
    this.accountModal.style.display = 'flex';
  }

  openEditAccountModal(acc) {
    this.editAccountId.value = acc.id;
    this.modalAccountTitle.innerText = `Edit: ${acc.label}`;
    this.accInputLabel.value = acc.label || '';
    this.accInputAuthToken.value = acc.auth_token || '';
    this.accInputCt0.value = acc.ct0 || '';
    this.accInputProxy.value = acc.proxy || '';
    this.accountModal.style.display = 'flex';
  }

  closeAccountModal() {
    this.accountModal.style.display = 'none';
  }

  async saveAccount() {
    const id = this.editAccountId.value;
    const label = this.accInputLabel.value.trim();
    const auth_token = this.accInputAuthToken.value.trim();
    const ct0 = this.accInputCt0.value.trim();
    const proxy = this.accInputProxy.value.trim();

    if (!auth_token) {
      alert('auth_token cookie is required.');
      return;
    }

    try {
      const data = id
        ? await api.updateAccount(id, { label, auth_token, ct0, proxy })
        : await api.createAccount({ label, auth_token, ct0, proxy });

      if (data.success) {
        this.closeAccountModal();
        const updatedAccounts = await api.getAccounts();
        if (updatedAccounts.success) {
          store.set('accounts', updatedAccounts.accounts);
        }
      } else {
        alert(data.message || 'Failed to save account.');
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }

  // Comments Modal Methods
  async openCommentsModal(acc) {
    this.commentsModalAccountId.value = acc.id;
    this.commentsModalTitle.innerText = `Payload Bank: ${acc.label} (@${acc.username || 'user'})`;
    this.commentsModalSubtitle.innerText = `File: data/comments/${acc.commentsFile || `comments_${acc.id}.json`}`;
    
    try {
      const data = await api.getAccountComments(acc.id);
      this.renderCommentsList(data.comments || []);
    } catch (e) {
      this.renderCommentsList([]);
    }

    this.commentsModal.style.display = 'flex';
  }

  closeCommentsModal() {
    this.commentsModal.style.display = 'none';
  }

  renderCommentsList(comments) {
    this.accountCommentsList.innerHTML = '';
    comments.forEach(c => this.addCommentRow(c));
  }

  addCommentRow(text = '') {
    const div = document.createElement('div');
    div.className = 'template-item';
    div.innerHTML = `
      <textarea rows="2" class="field-textarea acc-comment-text font-mono" placeholder="Enter template entry (supports spintax {Option 1|Option 2})...">${text}</textarea>
      <button class="btn-remove-template" title="Delete">✕</button>
    `;
    div.querySelector('.btn-remove-template').addEventListener('click', () => div.remove());
    this.accountCommentsList.appendChild(div);
  }

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          this.renderCommentsList(parsed);
          alert(`Imported ${parsed.length} entries from ${file.name}`);
        } else {
          alert('JSON format must be an array of strings: ["comment 1", "comment 2"]');
        }
      } catch (err) {
        alert(`Error reading JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  async saveComments() {
    const id = this.commentsModalAccountId.value;
    const textareas = this.accountCommentsList.querySelectorAll('.acc-comment-text');
    const comments = Array.from(textareas).map(t => t.value.trim()).filter(Boolean);

    if (comments.length === 0) {
      alert('At least 1 comment template entry is required.');
      return;
    }

    try {
      const data = await api.saveAccountComments(id, comments);
      if (data.success) {
        this.closeCommentsModal();
        const updatedAccounts = await api.getAccounts();
        if (updatedAccounts.success) {
          store.set('accounts', updatedAccounts.accounts);
        }
      }
    } catch (e) {
      alert('Failed to save payload bank.');
    }
  }
}
