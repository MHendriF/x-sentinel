/**
 * State Management & Event Bus
 * Holds active accounts, telemetry stats, active task state, and broadcasts updates
 */

class StateStore {
  constructor() {
    this.state = {
      accounts: [],
      stats: { totalLikes: 0, totalRetweets: 0, totalComments: 0 },
      isRunning: false,
      currentTask: null,
      settings: {},
      activeTab: 'tab-accounts'
    };
    this.listeners = new Map();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
    this.emit(key, value);
    this.emit('change', { key, value, state: this.state });
  }

  update(partial) {
    Object.keys(partial).forEach(k => {
      this.state[k] = partial[k];
      this.emit(k, partial[k]);
    });
    this.emit('change', { partial, state: this.state });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in event listener for ${event}:`, e); }
      });
    }
  }
}

export const store = new StateStore();
