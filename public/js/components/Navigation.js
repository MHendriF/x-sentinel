/**
 * Navigation Component
 * Handles sidebar tabs, mobile drawer slide-out, and active view switching
 */

import { store } from '../store/state.js';

export class Navigation {
  constructor() {
    this.deckTabs = document.querySelectorAll('.deck-tab');
    this.tabContents = document.querySelectorAll('.tab-content');
    this.pageTitle = document.getElementById('pageTitle');
    this.pageSubtitle = document.getElementById('pageSubtitle');

    // Mobile Elements
    this.btnDeckToggle = document.getElementById('btnDeckToggle');
    this.btnDeckClose = document.getElementById('btnDeckClose');
    this.navDeck = document.getElementById('navDeck');
    this.deckBackdrop = document.getElementById('deckBackdrop');

    this.tabTitles = {
      'tab-accounts': {
        title: 'Multi-Node & Proxy Management',
        subtitle:
          'Configure authenticated X accounts, dedicated proxy tunnels, and JSON payload pools.',
      },
      'tab-batch': {
        title: 'Target Engagement Workbench',
        subtitle:
          'Execute multi-node sequential engagement for Like, Repost, and Custom Reply vectors.',
      },
      'tab-hunter': {
        title: 'Feed Hunter Intelligence',
        subtitle: 'Autonomous keyword scanning and multi-node engagement sequence.',
      },
      'tab-spintax': {
        title: 'Payload Bank & Spintax Generator',
        subtitle: 'Configure global fallback payloads and test spintax permutations.',
      },
      'tab-safety': {
        title: 'Anti-Detection & Defense Protocol',
        subtitle: 'Configure rate limits, natural delay intervals, and browser emulation flags.',
      },
      'tab-history': {
        title: 'Interaction Audit Ledger',
        subtitle: 'Full immutable record of all processed interactions per node.',
      },
    };

    this.init();
  }

  init() {
    // Tab Click Listeners
    this.deckTabs.forEach((item) => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Mobile Drawer Controls
    if (this.btnDeckToggle) {
      this.btnDeckToggle.addEventListener('click', () => this.openMobileDeck());
    }
    if (this.btnDeckClose) {
      this.btnDeckClose.addEventListener('click', () => this.closeMobileDeck());
    }
    if (this.deckBackdrop) {
      this.deckBackdrop.addEventListener('click', () => this.closeMobileDeck());
    }
  }

  switchTab(tabId) {
    this.deckTabs.forEach((n) => n.classList.remove('active'));
    this.tabContents.forEach((t) => t.classList.remove('active'));

    const tabBtn = document.querySelector(`.deck-tab[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');

    if (this.tabTitles[tabId]) {
      if (this.pageTitle) this.pageTitle.innerText = this.tabTitles[tabId].title;
      if (this.pageSubtitle) this.pageSubtitle.innerText = this.tabTitles[tabId].subtitle;
    }

    this.closeMobileDeck();
    store.set('activeTab', tabId);
  }

  openMobileDeck() {
    if (this.navDeck) this.navDeck.classList.add('open');
    if (this.deckBackdrop) this.deckBackdrop.classList.add('open');
  }

  closeMobileDeck() {
    if (this.navDeck) this.navDeck.classList.remove('open');
    if (this.deckBackdrop) this.deckBackdrop.classList.remove('open');
  }
}
