/**
 * Spintax Tester Component
 * Manages global template stack and spintax permutation generation
 */

import { api } from '../api/apiClient.js';

export class SpintaxTester {
  constructor() {
    this.templateListContainer = document.getElementById('templateListContainer');
    this.btnAddNew = document.getElementById('btnAddNewTemplate');
    this.btnSave = document.getElementById('btnSaveTemplates');
    this.spintaxInput = document.getElementById('spintaxTesterInput');
    this.btnRunTest = document.getElementById('btnRunSpintaxTest');
    this.resultsContainer = document.getElementById('spintaxResultsContainer');
    this.variationList = document.getElementById('spintaxVariationList');

    this.init();
  }

  init() {
    if (this.btnAddNew) {
      this.btnAddNew.addEventListener('click', () => this.addTemplateRow(''));
    }
    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => this.saveTemplates());
    }
    if (this.btnRunTest) {
      this.btnRunTest.addEventListener('click', () => this.generatePermutations());
    }
    this.loadTemplates();
  }

  async loadTemplates() {
    try {
      const data = await api.getTemplates();
      if (data.success && data.templates) {
        this.renderTemplates(data.templates);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  }

  renderTemplates(templates) {
    if (!this.templateListContainer) return;
    this.templateListContainer.innerHTML = '';
    templates.forEach(tmpl => this.addTemplateRow(tmpl));
  }

  addTemplateRow(text = '') {
    if (!this.templateListContainer) return;
    const item = document.createElement('div');
    item.className = 'template-item';
    item.innerHTML = `
      <textarea rows="2" class="field-textarea template-text font-mono" placeholder="Enter template entry {Option A|Option B}...">${text}</textarea>
      <button class="btn-remove-template" title="Delete">✕</button>
    `;
    item.querySelector('.btn-remove-template').addEventListener('click', () => item.remove());
    this.templateListContainer.appendChild(item);
  }

  async saveTemplates() {
    const textareas = this.templateListContainer.querySelectorAll('.template-text');
    const templates = Array.from(textareas).map(t => t.value.trim()).filter(Boolean);

    try {
      const data = await api.saveTemplates(templates);
      if (data.success) {
        alert('Global fallback templates saved.');
      }
    } catch (err) {
      alert(`Error saving templates: ${err.message}`);
    }
  }

  async generatePermutations() {
    const text = this.spintaxInput.value.trim();
    if (!text) return;

    try {
      const data = await api.previewSpintax(text, 5);
      if (data.success && data.variations) {
        this.variationList.innerHTML = '';
        data.variations.forEach(v => {
          const li = document.createElement('li');
          li.innerText = v;
          this.variationList.appendChild(li);
        });
        this.resultsContainer.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
    }
  }
}
