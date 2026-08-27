import { create } from 'zustand';
import {
  AccountNode,
  Stats,
  Settings,
  HistoryItem,
  LogEntry,
  ScheduleItem,
  apiClient,
} from '../services/apiClient';

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;

  accounts: AccountNode[];
  setAccounts: (accounts: AccountNode[]) => void;
  loadAccounts: () => Promise<void>;

  stats: Stats;
  setStats: (stats: Stats) => void;

  isRunning: boolean;
  currentTask: any | null;
  setIsRunning: (running: boolean, task?: any) => void;

  isCheckingHealth: boolean;
  setIsCheckingHealth: (checking: boolean) => void;

  settings: Settings | null;
  setSettings: (settings: Settings) => void;
  loadSettings: () => Promise<void>;

  schedules: ScheduleItem[];
  setSchedules: (schedules: ScheduleItem[]) => void;
  loadSchedules: () => Promise<void>;

  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
  loadHistory: () => Promise<void>;

  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  // Modals state
  isAccountModalOpen: boolean;
  editingAccount: AccountNode | null;
  openAccountModal: (account?: AccountNode | null) => void;
  closeAccountModal: () => void;

  isCommentsModalOpen: boolean;
  commentsAccount: AccountNode | null;
  openCommentsModal: (account: AccountNode) => void;
  closeCommentsModal: () => void;

  isDeleteModalOpen: boolean;
  deletingAccount: AccountNode | null;
  openDeleteModal: (account: AccountNode) => void;
  closeDeleteModal: () => void;

  isBulkImportOpen: boolean;
  openBulkImportModal: () => void;
  closeBulkImportModal: () => void;

  // Mobile Drawer
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
}

// Helper to get initial active tab from URL hash or localStorage
const getInitialTab = (): string => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const VALID_TABS = [
      'tab-accounts',
      'tab-composer',
      'tab-batch',
      'tab-hunter',
      'tab-analytics',
      'tab-ai',
      'tab-spintax',
      'tab-safety',
      'tab-history',
      'tab-about',
    ];

    if (hash) {
      const candidate = hash.startsWith('tab-') ? hash : `tab-${hash}`;
      if (VALID_TABS.includes(candidate)) return candidate;
      if (hash === 'composer' || hash === 'post' || hash === 'create-post' || hash === 'studio')
        return 'tab-composer';
      if (hash === 'workbench') return 'tab-batch';
      if (hash === 'payloads' || hash === 'payload') return 'tab-spintax';
      if (hash === 'logs' || hash === 'audit') return 'tab-history';
      if (hash === 'nodes' || hash === 'proxies') return 'tab-accounts';
    }

    try {
      const saved = localStorage.getItem('x_sentinel_active_tab');
      if (saved && VALID_TABS.includes(saved)) return saved;
    } catch {
      // ignore localStorage errors
    }
  }
  return 'tab-accounts';
};

export const useStore = create<AppState>((set, get) => ({
  activeTab: getInitialTab(),
  setActiveTab: (activeTab) => {
    if (typeof window !== 'undefined') {
      const slug = activeTab.replace(/^tab-/, '');
      if (window.location.hash !== `#${slug}`) {
        window.history.replaceState(null, '', `#${slug}`);
      }
      try {
        localStorage.setItem('x_sentinel_active_tab', activeTab);
      } catch {
        // ignore localStorage errors
      }
    }
    set({ activeTab, isMobileDrawerOpen: false });
  },

  accounts: [],
  setAccounts: (accounts) => set({ accounts }),
  loadAccounts: async () => {
    try {
      const data = await apiClient.getAccounts();
      if (data.success && data.accounts) {
        set({ accounts: data.accounts });
      }
    } catch (err) {
      console.error('Error loading accounts in store:', err);
    }
  },

  stats: { totalLikes: 0, totalRetweets: 0, totalComments: 0 },
  setStats: (stats) => set({ stats }),

  isRunning: false,
  currentTask: null,
  setIsRunning: (isRunning, currentTask = null) => set({ isRunning, currentTask }),

  isCheckingHealth: false,
  setIsCheckingHealth: (isCheckingHealth) => set({ isCheckingHealth }),

  settings: null,
  setSettings: (settings) => set({ settings }),
  loadSettings: async () => {
    try {
      const data = await apiClient.getSettings();
      if (data.success && data.settings) {
        set({ settings: data.settings });
      }
    } catch (err) {
      console.error('Error loading settings in store:', err);
    }
  },

  schedules: [],
  setSchedules: (schedules) => set({ schedules }),
  loadSchedules: async () => {
    try {
      const data = await apiClient.getSchedules();
      if (data.success && data.schedules) {
        set({ schedules: data.schedules });
      }
    } catch (err) {
      console.error('Error loading schedules in store:', err);
    }
  },

  history: [],
  setHistory: (history) => set({ history }),
  loadHistory: async () => {
    try {
      const data = await apiClient.getHistory(100);
      if (data.success) {
        if (data.history) set({ history: data.history });
        if (data.stats) set({ stats: data.stats });
      }
    } catch (err) {
      console.error('Error loading history in store:', err);
    }
  },

  logs: [],
  addLog: (log) => set((state) => ({ logs: [...state.logs.slice(-400), log] })),
  clearLogs: () => set({ logs: [] }),

  // Modals
  isAccountModalOpen: false,
  editingAccount: null,
  openAccountModal: (editingAccount = null) => set({ isAccountModalOpen: true, editingAccount }),
  closeAccountModal: () => set({ isAccountModalOpen: false, editingAccount: null }),

  isCommentsModalOpen: false,
  commentsAccount: null,
  openCommentsModal: (commentsAccount) => set({ isCommentsModalOpen: true, commentsAccount }),
  closeCommentsModal: () => set({ isCommentsModalOpen: false, commentsAccount: null }),

  isDeleteModalOpen: false,
  deletingAccount: null,
  openDeleteModal: (deletingAccount) => set({ isDeleteModalOpen: true, deletingAccount }),
  closeDeleteModal: () => set({ isDeleteModalOpen: false, deletingAccount: null }),

  isBulkImportOpen: false,
  openBulkImportModal: () => set({ isBulkImportOpen: true }),
  closeBulkImportModal: () => set({ isBulkImportOpen: false }),

  // Mobile Drawer
  isMobileDrawerOpen: false,
  setIsMobileDrawerOpen: (isMobileDrawerOpen) => set({ isMobileDrawerOpen }),
}));
