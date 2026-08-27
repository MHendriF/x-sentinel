/**
 * Defense Protocol Component
 * Manages anti-ban parameters, rate throttles, and browser emulation settings
 */

import { api } from '../api/apiClient.js';
import { store } from '../store/state.js';

export class DefenseProtocol {
  constructor() {
    this.minDelaySec = document.getElementById('minDelaySec');
    this.maxDelaySec = document.getElementById('maxDelaySec');
    this.accountSwitchDelaySec = document.getElementById('accountSwitchDelaySec');
    this.dailyLimit = document.getElementById('dailyLimit');
    this.checkHeadless = document.getElementById('checkHeadless');
    this.checkScrollAction = document.getElementById('checkScrollAction');
    this.btnSave = document.getElementById('btnSaveSafetySettings');

    this.init();
  }

  init() {
    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => this.saveSettings());
    }
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const data = await api.getSettings();
      if (data.success && data.settings) {
        store.set('settings', data.settings);
        this.minDelaySec.value = data.settings.minDelaySeconds || 15;
        this.maxDelaySec.value = data.settings.maxDelaySeconds || 35;
        this.accountSwitchDelaySec.value = data.settings.accountSwitchDelaySec || 10;
        this.dailyLimit.value = data.settings.dailyLimit || 150;
        this.checkHeadless.checked = Boolean(data.settings.headless);
        this.checkScrollAction.checked = Boolean(data.settings.scrollBeforeAction);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }

  async saveSettings() {
    const payload = {
      minDelaySeconds: parseInt(this.minDelaySec.value, 10) || 15,
      maxDelaySeconds: parseInt(this.maxDelaySec.value, 10) || 35,
      accountSwitchDelaySec: parseInt(this.accountSwitchDelaySec.value, 10) || 10,
      dailyLimit: parseInt(this.dailyLimit.value, 10) || 150,
      headless: this.checkHeadless.checked,
      scrollBeforeAction: this.checkScrollAction.checked,
    };

    try {
      const data = await api.saveSettings(payload);
      if (data.success) {
        store.set('settings', data.settings);
        alert('Defense protocol settings saved.');
      }
    } catch (err) {
      alert(`Error saving settings: ${err.message}`);
    }
  }
}
