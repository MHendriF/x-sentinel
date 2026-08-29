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

  /** False when the /api/status poller cannot reach the engine */
  apiOnline: boolean;
  setApiOnline: (online: boolean) => void;

  /** True once the first data fetch has completed (drives skeletons) */
  accountsHydrated: boolean;
  historyHydrated: boolean;

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

// Helper to match sector aliases
export const matchSectorName = (name: string): string | null => {
  const clean = name.replace(/^tab-/, '').trim().toLowerCase();
  const SECTOR_MAP: Record<string, string> = {
    accounts: 'tab-accounts',
    nodes: 'tab-accounts',
    proxies: 'tab-accounts',
    composer: 'tab-composer',
    post: 'tab-composer',
    'create-post': 'tab-composer',
    studio: 'tab-composer',
    batch: 'tab-batch',
    workbench: 'tab-batch',
    target: 'tab-batch',
    hunter: 'tab-hunter',
    radar: 'tab-hunter',
    feed: 'tab-hunter',
    analytics: 'tab-analytics',
    growth: 'tab-analytics',
    ai: 'tab-ai',
    models: 'tab-ai',
    llm: 'tab-ai',
    spintax: 'tab-spintax',
    payloads: 'tab-spintax',
    payload: 'tab-spintax',
    vault: 'tab-spintax',
    safety: 'tab-safety',
    defense: 'tab-safety',
    webhooks: 'tab-safety',
    history: 'tab-history',
    logs: 'tab-history',
    audit: 'tab-history',
    ledger: 'tab-history',
    about: 'tab-about',
    docs: 'tab-about',
    specs: 'tab-about',
  };

  return SECTOR_MAP[clean] || null;
};

// Helper to get initial active tab from URL path or hash
export const resolveTabFromUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'tab-accounts';
  }

  const pathname = window.location.pathname
    .replace(/^\/+|\/+$/g, '')
    .trim()
    .toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();

  // If path is a non-root path (e.g. /xyz or /composer)
  if (pathname && pathname !== 'index.html') {
    const matchedFromPath = matchSectorName(pathname);
    if (matchedFromPath) return matchedFromPath;
    return 'tab-404';
  }

  // If path is root, check hash
  if (hash) {
    const matchedFromHash = matchSectorName(hash);
    if (matchedFromHash) return matchedFromHash;
    return 'tab-404';
  }

  return 'tab-accounts';
};

export const useStore = create<AppState>((set, get) => ({
  activeTab: resolveTabFromUrl(),
  setActiveTab: (activeTab) => {
    if (typeof window !== 'undefined') {
      if (activeTab === 'tab-404') {
        // Keep current URL path as is so user sees what failed
      } else {
        const slug = activeTab.replace(/^tab-/, '');
        const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
        if (!pathname || pathname === 'index.html') {
          if (window.location.hash !== `#${slug}`) {
            window.history.replaceState(null, '', `#${slug}`);
          }
        } else {
          window.history.pushState(null, '', `/#${slug}`);
        }
        try {
          localStorage.setItem('x_sentinel_active_tab', activeTab);
        } catch {
          // ignore
        }
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
        set({ accounts: data.accounts, accountsHydrated: true });
      }
    } catch (err) {
      console.error('Error loading accounts in store:', err);
      set({ accountsHydrated: true });
    }
  },

  stats: { totalLikes: 0, totalRetweets: 0, totalComments: 0 },
  setStats: (stats) => set({ stats }),

  isRunning: false,
  currentTask: null,
  setIsRunning: (isRunning, currentTask = null) => set({ isRunning, currentTask }),

  apiOnline: true,
  setApiOnline: (apiOnline) => set({ apiOnline }),

  accountsHydrated: false,
  historyHydrated: false,

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
    } finally {
      set({ historyHydrated: true });
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
