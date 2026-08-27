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
  healthStatus?: 'HEALTHY' | 'EXPIRED' | 'PROXY_DEAD' | 'UNKNOWN_ERROR';
  healthMessage?: string;
  lastCheckedAt?: string;
  warmupMode?: boolean;
  warmupDay?: number;
  lastWarmupAt?: string;
  stats?: {
    likes: number;
    retweets: number;
    comments: number;
    posts?: number;
  };
}

export interface Stats {
  totalLikes: number;
  totalRetweets: number;
  totalComments: number;
  totalPosts?: number;
  todayLikes?: number;
  todayRetweets?: number;
  todayComments?: number;
  todayPosts?: number;
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
  aiModel?: string;
  aiBaseUrl?: string;
  aiPrompt?: string;
  telegramEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  discordEnabled?: boolean;
  discordWebhookUrl?: string;
}

export interface ScheduleItem {
  id: string;
  type: 'POST_QUEUE' | 'RECURRING_HUNTER';
  title?: string;
  enabled: boolean;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scheduledAt: string;
  intervalMinutes?: number;
  lastRunAt?: string | null;
  accountIds?: string[] | 'all';
  posts?: string[];
  mediaPaths?: string[];
  delaySeconds?: number;
  keywords?: string[];
  vectors?: string[];
  maxTweets?: number;
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  accountId?: string;
  accountName?: string;
  tweetUrl: string;
  tweetId?: string;
  action: 'LIKE' | 'RETWEET' | 'COMMENT' | 'POST';
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

export interface ProxyTestResult {
  success: boolean;
  isDirect?: boolean;
  latency?: number;
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  status?: 'ALIVE' | 'DEAD';
  message?: string;
}

export const apiClient = {
  // Proxy Testing
  async testProxy(proxy: string): Promise<ProxyTestResult> {
    const res = await fetch('/api/proxy/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proxy }),
    });
    return res.json();
  },

  async testAccountProxy(id: string): Promise<ProxyTestResult> {
    const res = await fetch(`/api/accounts/${id}/test-proxy`, {
      method: 'POST',
    });
    return res.json();
  },

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

  async startPostTask(payload: {
    accountIds: string | string[];
    posts: string | string[];
    delaySeconds?: number;
    mediaPaths?: string[];
  }) {
    const res = await fetch('/api/tasks/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async generateAIPost(payload: {
    keyword: string;
    style?: string;
    language?: string;
    count?: number;
    customPrompt?: string;
    customOverrides?: any;
  }): Promise<{
    success: boolean;
    isFallback?: boolean;
    provider?: string;
    posts?: string[];
    latency?: number;
    keyword?: string;
    style?: string;
    language?: string;
    message?: string;
  }> {
    const res = await fetch('/api/ai/generate-post', {
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

  async bulkImportAccounts(payload: { rawText?: string; accounts?: any[] }) {
    const res = await fetch('/api/accounts/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async testAISettings(settings: Partial<Settings>): Promise<{
    success: boolean;
    message: string;
    model?: string;
    sampleOutput?: string;
    status?: number;
  }> {
    const res = await fetch('/api/settings/test-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async generateAITest(payload: {
    tweetText: string;
    aiProvider: string;
    aiApiKey: string;
    aiModel?: string;
    aiBaseUrl?: string;
    aiPrompt?: string;
  }): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    model?: string;
    sampleOutput?: string;
  }> {
    const res = await fetch('/api/settings/generate-ai-test', {
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

  // Media / Image Upload
  async uploadMedia(imageBase64: string, filename?: string): Promise<{
    success: boolean;
    filename?: string;
    localPath?: string;
    sizeKb?: string;
    message?: string;
  }> {
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, filename }),
    });
    return res.json();
  },

  // Fleet Health & Session Checks
  async checkFleetHealth(): Promise<{
    success: boolean;
    total?: number;
    healthy?: number;
    results?: any[];
    message?: string;
  }> {
    const res = await fetch('/api/accounts/check-health', { method: 'POST' });
    return res.json();
  },

  async checkAccountHealth(id: string): Promise<{
    success: boolean;
    healthStatus?: 'HEALTHY' | 'EXPIRED' | 'PROXY_DEAD' | 'UNKNOWN_ERROR';
    account?: AccountNode;
    message: string;
  }> {
    const res = await fetch(`/api/accounts/${id}/check-health`, { method: 'POST' });
    return res.json();
  },

  // Account Warmup
  async startWarmup(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/accounts/${id}/warmup`, { method: 'POST' });
    return res.json();
  },

  // Schedules & Post Queue
  async getSchedules(): Promise<{ success: boolean; schedules: ScheduleItem[] }> {
    const res = await fetch('/api/schedules');
    return res.json();
  },

  async createSchedule(data: Partial<ScheduleItem>): Promise<{ success: boolean; schedule: ScheduleItem; message?: string }> {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSchedule(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async toggleSchedule(id: string, enabled?: boolean): Promise<{ success: boolean; schedule: ScheduleItem }> {
    const res = await fetch(`/api/schedules/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },

  // Webhook Test
  async testWebhook(payload: {
    type?: 'telegram' | 'discord';
    telegramBotToken?: string;
    telegramChatId?: string;
    discordWebhookUrl?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const res = await fetch('/api/settings/test-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // History Pruning & Clear
  async pruneHistory(payload: { olderThanDays?: number; status?: string }): Promise<{
    success: boolean;
    deletedCount: number;
    remainingCount: number;
  }> {
    const res = await fetch('/api/history/prune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async clearAllHistory(): Promise<{ success: boolean; deletedCount: number }> {
    const res = await fetch('/api/history/clear-all', { method: 'POST' });
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

/**
 * Format raw proxy string to clean "IP:Port" (hides username & password)
 */
export const extractProxyHostPort = (rawProxy?: string): string | null => {
  if (!rawProxy || !rawProxy.trim()) return null;
  const str = rawProxy.trim();

  // If contains '@', host:port is everything after the last '@'
  if (str.includes('@')) {
    const afterAt = str.substring(str.lastIndexOf('@') + 1);
    return afterAt.replace(/\/.*$/, '').trim();
  }

  // If protocol prefix without '@', e.g. http://31.56.70.92:1338
  const cleanProto = str.replace(/^(https?|socks5?):\/\//i, '');

  const parts = cleanProto.split(':');
  if (parts.length === 4) {
    // Check if parts[0] is IP/host (contains dot or localhost)
    if (parts[0].includes('.') || parts[0].includes('localhost')) {
      // format: ip:port:user:pass
      return `${parts[0]}:${parts[1]}`;
    } else {
      // format: user:pass:ip:port
      return `${parts[2]}:${parts[3]}`;
    }
  }

  if (parts.length === 2) {
    // ip:port
    return `${parts[0]}:${parts[1]}`;
  }

  return cleanProto;
};
