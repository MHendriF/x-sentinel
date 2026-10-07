import { create } from 'zustand';
import {
  AccountNode,
  Stats,
  Settings,
  HistoryItem,
  LogEntry,
  ScheduleItem,
  apiClient,
  onUnauthorized,
} from '../services/apiClient';

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;

  accounts: AccountNode[];
  setAccounts: (accounts: AccountNode[]) => void;
  loadAccounts: () => Promise<void>;

  // Authentication State
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  authError: string | null;
  authUsername: string;
  totpEnabled: boolean;
  checkAuthSession: () => Promise<boolean>;
  login: (
    password: string,
    username?: string,
    totpCode?: string
  ) => Promise<{ success: boolean; requireTotp?: boolean; error?: string }>;
  logout: () => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;

  stats: Stats;
  setStats: (stats: Stats) => void;

  isRunning: boolean;
  currentTask: any | null;
  lastMission: any | null;
  setIsRunning: (running: boolean, task?: any) => void;
  setLastMission: (lastMission: any) => void;

  workbenchUrls: string;
  setWorkbenchUrls: (urls: string | ((prev: string) => string)) => void;

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
  loadHistory: (limit?: number) => Promise<void>;

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

  isResetCamoufoxModalOpen: boolean;
  resetCamoufoxAccount: AccountNode | null;
  openResetCamoufoxModal: (account: AccountNode) => void;
  closeResetCamoufoxModal: () => void;

  isBulkImportOpen: boolean;
  openBulkImportModal: () => void;
  closeBulkImportModal: () => void;

  // Mobile Drawer & Sidebar Collapse
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebarCollapsed: () => void;
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

  // Authentication State & Actions
  isAuthenticated: false,
  isAuthChecking: true,
  authError: null,
  authUsername: 'admin',
  totpEnabled: false,
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  checkAuthSession: async () => {
    try {
      set({ isAuthChecking: true, authError: null });
      const res = await apiClient.getSessionStatus();
      const authed = Boolean(res.success && res.authenticated);
      set({
        isAuthenticated: authed,
        isAuthChecking: false,
        authUsername: res.username || 'admin',
        totpEnabled: Boolean(res.totpEnabled),
      });
      return authed;
    } catch {
      set({ isAuthenticated: false, isAuthChecking: false });
      return false;
    }
  },
  login: async (password: string, username?: string, totpCode?: string) => {
    try {
      set({ authError: null });
      const res = await apiClient.login(password, username, totpCode);
      if (res.success) {
        set({
          isAuthenticated: true,
          authError: null,
          authUsername: res.username || username || 'admin',
        });
        return { success: true };
      }
      if (res.requireTotp) {
        return { success: false, requireTotp: true, error: res.message };
      }
      const errMsg = res.message || res.error || 'Authentication failed';
      set({ authError: errMsg });
      return { success: false, error: errMsg };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error during login';
      set({ authError: errMsg });
      return { success: false, error: errMsg };
    }
  },
  logout: async () => {
    try {
      await apiClient.logout();
    } catch {
      // ignore
    } finally {
      set({ isAuthenticated: false });
    }
  },

  autoLockMinutes: (() => {
    try {
      const stored = localStorage.getItem('x_sentinel_auto_lock_minutes');
      return stored !== null ? Number(stored) : 15;
    } catch {
      return 15;
    }
  })(),
  setAutoLockMinutes: (autoLockMinutes: number) => {
    try {
      localStorage.setItem('x_sentinel_auto_lock_minutes', String(autoLockMinutes));
    } catch {
      // ignore
    }
    set({ autoLockMinutes });
  },

  stats: { totalLikes: 0, totalRetweets: 0, totalComments: 0 },
  setStats: (stats) => set({ stats }),

  isRunning: false,
  currentTask: null,
  lastMission: null,
  setIsRunning: (isRunning, currentTask = null) => set({ isRunning, currentTask }),
  setLastMission: (lastMission) => set({ lastMission }),

  workbenchUrls: (() => {
    try {
      return localStorage.getItem('x_sentinel_target_urls') || '';
    } catch {
      return '';
    }
  })(),
  setWorkbenchUrls: (updater: string | ((prev: string) => string)) => {
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.workbenchUrls) : updater;
      try {
        localStorage.setItem('x_sentinel_target_urls', next);
      } catch {}
      return { workbenchUrls: next };
    });
  },

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
  loadHistory: async (limit: number = 100) => {
    try {
      const data = await apiClient.getHistory(limit);
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

  isResetCamoufoxModalOpen: false,
  resetCamoufoxAccount: null,
  openResetCamoufoxModal: (resetCamoufoxAccount) =>
    set({ isResetCamoufoxModalOpen: true, resetCamoufoxAccount }),
  closeResetCamoufoxModal: () =>
    set({ isResetCamoufoxModalOpen: false, resetCamoufoxAccount: null }),

  isBulkImportOpen: false,
  openBulkImportModal: () => set({ isBulkImportOpen: true }),
  closeBulkImportModal: () => set({ isBulkImportOpen: false }),

  // Mobile Drawer & Sidebar Collapse
  isMobileDrawerOpen: false,
  setIsMobileDrawerOpen: (isMobileDrawerOpen) => set({ isMobileDrawerOpen }),
  isSidebarCollapsed: (() => {
    try {
      return localStorage.getItem('x_sentinel_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  })(),
  setIsSidebarCollapsed: (updater: boolean | ((prev: boolean) => boolean)) => {
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.isSidebarCollapsed) : updater;
      try {
        localStorage.setItem('x_sentinel_sidebar_collapsed', String(next));
      } catch {}
      return { isSidebarCollapsed: next };
    });
  },
  toggleSidebarCollapsed: () => {
    set((state) => {
      const next = !state.isSidebarCollapsed;
      try {
        localStorage.setItem('x_sentinel_sidebar_collapsed', String(next));
      } catch {}
      return { isSidebarCollapsed: next };
    });
  },
}));

// Automatically revoke authentication if any API call returns 401 Unauthorized
onUnauthorized(() => {
  useStore.getState().setAuthenticated(false);
});

// Configurable Inactivity Auto-Lock Protocol
if (typeof window !== 'undefined') {
  let lastActivityTime = Date.now();

  const registerUserActivity = () => {
    lastActivityTime = Date.now();
  };

  window.addEventListener('mousemove', registerUserActivity, { passive: true });
  window.addEventListener('keydown', registerUserActivity, { passive: true });
  window.addEventListener('click', registerUserActivity, { passive: true });
  window.addEventListener('scroll', registerUserActivity, { passive: true });

  setInterval(() => {
    const state = useStore.getState();
    const minutes = Number(state.autoLockMinutes ?? 15);
    // 0 or negative means auto-lock is disabled
    if (minutes <= 0) return;

    const timeoutMs = minutes * 60 * 1000;
    if (state.isAuthenticated && Date.now() - lastActivityTime > timeoutMs) {
      console.warn(`X-SENTINEL: Inactivity timeout reached (${minutes}m). Auto-locking cockpit.`);
      state.setAuthenticated(false);
      state.addLog({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warn',
        message: `🔒 Cockpit security auto-lock engaged after ${minutes} minutes of inactivity.`,
      });
    }
  }, 10000);
}


