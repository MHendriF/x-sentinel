/**
 * Terminal Console Component
 * Streams live SSE execution events into the dark matrix terminal deck
 */

import { api } from '../api/apiClient.js';

export class TerminalConsole {
  constructor() {
    this.screen = document.getElementById('liveTerminalOutput');
    this.btnClear = document.getElementById('btnClearTerminal');

    this.init();
  }

  init() {
    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => this.clear());
    }
    this.subscribe();
  }

  subscribe() {
    api.subscribeLogs(
      (log) => this.append(log),
      () => {
        // Handled automatically by browser EventSource reconnect
      }
    );
  }

  append(log) {
    if (!this.screen) return;
    const line = document.createElement('div');
    line.className = `term-line ${log.level || 'info'}`;
    line.innerText = `[${log.timestamp || 'LOG'}] ${log.message}`;
    this.screen.appendChild(line);
    this.screen.scrollTop = this.screen.scrollHeight;
  }

  clear() {
    if (this.screen) {
      this.screen.innerHTML = '';
    }
  }
}
