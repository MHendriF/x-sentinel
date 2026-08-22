export interface AccountNode {
  id: string;
  label: string;
  auth_token: string;
  ct0?: string;
  username?: string;
  name?: string;
  avatar?: string;
  proxy?: string;
  commentsFile?: string;
  commentsCount?: number;
  enabled?: boolean;
  isValid?: boolean;
  lastChecked?: string | null;
  stats?: {
    likes: number;
    retweets: number;
    comments: number;
  };
}

export interface Stats {
  totalLikes: number;
  totalRetweets: number;
  totalComments: number;
  todayLikes?: number;
  todayRetweets?: number;
  todayComments?: number;
}

export interface Settings {
  minDelaySeconds: number;
  maxDelaySeconds: number;
  accountSwitchDelaySec: number;
  hourlyLimit: number;
  dailyLimit: number;
  headless: boolean;
  scrollBeforeAction: boolean;
  aiProvider?: string;
  aiApiKey?: string;
  aiPrompt?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  accountId?: string;
  accountName?: string;
  tweetUrl: string;
  tweetId?: string;
  action: 'LIKE' | 'RETWEET' | 'COMMENT';
  status: 'SUCCESS' | 'ALREADY_DONE' | 'FAILED';
  details?: string;
  message?: string;
}

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'action';
  message: string;
  meta?: any;
}

export const apiClient = {
  // Status
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  },

  // Accounts
  async getAccounts(): Promise<{ success: boolean; accounts: AccountNode[] }> {
    const res = await fetch('/api/accounts');
    return res.json();
  },

  async createAccount(payload: Partial<AccountNode>) {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async updateAccount(id: string, payload: Partial<AccountNode>) {
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async deleteAccount(id: string) {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async toggleAccount(id: string) {
    const res = await fetch(`/api/accounts/${id}/toggle`, { method: 'POST' });
    return res.json();
  },

  async verifyAccount(id: string) {
    const res = await fetch(`/api/accounts/${id}/verify`, { method: 'POST' });
    return res.json();
  },

  // Comments JSON per Account
  async getAccountComments(id: string): Promise<{ success: boolean; comments: string[]; file: string }> {
    const res = await fetch(`/api/accounts/${id}/comments`);
    return res.json();
  },

  async saveAccountComments(id: string, comments: string[]) {
    const res = await fetch(`/api/accounts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments })
    });
    return res.json();
  },

  // Batch & Hunter Missions
  async startBatchTask(payload: {
    accountIds: string | string[];
    urls: string[];
    like: boolean;
    retweet: boolean;
    comment: boolean;
    commentText?: string;
  }) {
    const res = await fetch('/api/tasks/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async startHunterTask(payload: {
    accountIds: string | string[];
    keyword: string;
    count: number;
    like: boolean;
    retweet: boolean;
    comment: boolean;
  }) {
    const res = await fetch('/api/tasks/hunter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async stopTask() {
    const res = await fetch('/api/tasks/stop', { method: 'POST' });
    return res.json();
  },

  // Global Templates & Spintax
  async getTemplates(): Promise<{ success: boolean; templates: string[] }> {
    const res = await fetch('/api/templates');
    return res.json();
  },

  async saveTemplates(templates: string[]) {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })
    });
    return res.json();
  },

  async previewSpintax(text: string, count = 5): Promise<{ success: boolean; variations: string[] }> {
    const res = await fetch('/api/spintax/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, count })
    });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ success: boolean; settings: Settings }> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async saveSettings(payload: Partial<Settings>) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Audit History
  async getHistory(limit = 100): Promise<{ success: boolean; history: HistoryItem[]; stats: Stats }> {
    const res = await fetch(`/api/history?limit=${limit}`);
    return res.json();
  },

  // SSE Stream
  subscribeLogs(onLog: (log: LogEntry) => void) {
    const eventSource = new EventSource('/api/logs/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CONNECTED') return;
        onLog(data);
      } catch (err) {
        console.error('Error parsing log entry:', err);
      }
    };
    return eventSource;
  }
};
