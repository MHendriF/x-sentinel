// X-AutoEngage — Hallmark Precision Cockpit Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const deckTabs = document.querySelectorAll('.deck-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  // Telemetry Elements
  const statLikes = document.getElementById('statLikes');
  const statRetweets = document.getElementById('statRetweets');
  const statComments = document.getElementById('statComments');
  const sidebarTotalAccounts = document.getElementById('sidebarTotalAccounts');
  const sidebarActiveAccounts = document.getElementById('sidebarActiveAccounts');
  const sidebarRateMetric = document.getElementById('sidebarRateMetric');

  // Accounts Management Elements
  const accountsGridContainer = document.getElementById('accountsGridContainer');
  const btnOpenAddAccountModal = document.getElementById('btnOpenAddAccountModal');
  const accountModal = document.getElementById('accountModal');
  const modalAccountTitle = document.getElementById('modalAccountTitle');
  const btnCloseAccountModal = document.getElementById('btnCloseAccountModal');
  const btnCancelAccountModal = document.getElementById('btnCancelAccountModal');
  const btnSaveAccountModal = document.getElementById('btnSaveAccountModal');
  const editAccountId = document.getElementById('editAccountId');
  const accInputLabel = document.getElementById('accInputLabel');
  const accInputAuthToken = document.getElementById('accInputAuthToken');
  const accInputCt0 = document.getElementById('accInputCt0');
  const accInputProxy = document.getElementById('accInputProxy');

  // Comments JSON Modal Elements
  const commentsModal = document.getElementById('commentsModal');
  const commentsModalTitle = document.getElementById('commentsModalTitle');
  const commentsModalSubtitle = document.getElementById('commentsModalSubtitle');
  const btnCloseCommentsModal = document.getElementById('btnCloseCommentsModal');
  const btnCancelCommentsModal = document.getElementById('btnCancelCommentsModal');
  const btnSaveAccountCommentsModal = document.getElementById('btnSaveAccountCommentsModal');
  const commentsModalAccountId = document.getElementById('commentsModalAccountId');
  const accountCommentsList = document.getElementById('accountCommentsList');
  const btnAddAccountCommentRow = document.getElementById('btnAddAccountCommentRow');
  const inputFileUploadComments = document.getElementById('inputFileUploadComments');

  // Selectors in Batch & Hunter
  const batchAccountSelector = document.getElementById('batchAccountSelector');
  const hunterAccountSelector = document.getElementById('hunterAccountSelector');

  // Batch Task Elements
  const targetUrls = document.getElementById('targetUrls');
  const urlCounter = document.getElementById('urlCounter');
  const checkLike = document.getElementById('checkLike');
  const checkRetweet = document.getElementById('checkRetweet');
  const checkComment = document.getElementById('checkComment');
  const customCommentInput = document.getElementById('customCommentInput');
  const btnStartBatch = document.getElementById('btnStartBatch');
  const btnStopTask = document.getElementById('btnStopTask');
  const btnBatchText = document.getElementById('btnBatchText');

  // Status & Progress Elements
  const taskStatusBadge = document.getElementById('taskStatusBadge');
  const progressLabel = document.getElementById('progressLabel');
  const progressPercent = document.getElementById('progressPercent');
  const progressBarFill = document.getElementById('progressBarFill');
  const liveTerminalOutput = document.getElementById('liveTerminalOutput');
  const btnClearTerminal = document.getElementById('btnClearTerminal');

  // Hunter Elements
  const hunterKeyword = document.getElementById('hunterKeyword');
  const hunterCount = document.getElementById('hunterCount');
  const hunterCheckLike = document.getElementById('hunterCheckLike');
  const hunterCheckRetweet = document.getElementById('hunterCheckRetweet');
  const hunterCheckComment = document.getElementById('hunterCheckComment');
  const btnStartHunter = document.getElementById('btnStartHunter');

  // Global Templates & Spintax Elements
  const templateListContainer = document.getElementById('templateListContainer');
  const btnAddNewTemplate = document.getElementById('btnAddNewTemplate');
  const btnSaveTemplates = document.getElementById('btnSaveTemplates');
  const spintaxTesterInput = document.getElementById('spintaxTesterInput');
  const btnRunSpintaxTest = document.getElementById('btnRunSpintaxTest');
  const spintaxResultsContainer = document.getElementById('spintaxResultsContainer');
  const spintaxVariationList = document.getElementById('spintaxVariationList');

  // Safety & Settings Elements
  const minDelaySec = document.getElementById('minDelaySec');
  const maxDelaySec = document.getElementById('maxDelaySec');
  const accountSwitchDelaySec = document.getElementById('accountSwitchDelaySec');
  const dailyLimit = document.getElementById('dailyLimit');
  const checkHeadless = document.getElementById('checkHeadless');
  const checkScrollAction = document.getElementById('checkScrollAction');
  const btnSaveSafetySettings = document.getElementById('btnSaveSafetySettings');

  // History Elements
  const historyTableBody = document.getElementById('historyTableBody');
  const btnRefreshHistory = document.getElementById('btnRefreshHistory');

  // App State
  let accountsList = [];

  // Tab Titles Map
  const tabTitles = {
    'tab-accounts': { title: 'Multi-Node & Proxy Management', subtitle: 'Configure authenticated X accounts, dedicated proxy tunnels, and JSON payload pools.' },
    'tab-batch': { title: 'Target Engagement Workbench', subtitle: 'Execute multi-node sequential engagement for Like, Repost, and Custom Reply vectors.' },
    'tab-hunter': { title: 'Feed Hunter Intelligence', subtitle: 'Autonomous keyword scanning and multi-node engagement sequence.' },
    'tab-spintax': { title: 'Payload Bank & Spintax Generator', subtitle: 'Configure global fallback payloads and test spintax permutations.' },
    'tab-safety': { title: 'Anti-Detection & Defense Protocol', subtitle: 'Configure rate limits, natural delay intervals, and browser emulation flags.' },
    'tab-history': { title: 'Interaction Audit Ledger', subtitle: 'Full immutable record of all processed interactions per node.' }
  };

  // 1. Tab Navigation
  deckTabs.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      deckTabs.forEach(n => n.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      const activeTab = document.getElementById(tabId);
      if (activeTab) activeTab.classList.add('active');

      if (tabTitles[tabId]) {
        pageTitle.innerText = tabTitles[tabId].title;
        pageSubtitle.innerText = tabTitles[tabId].subtitle;
      }

      if (tabId === 'tab-accounts') loadAccounts();
      if (tabId === 'tab-history') loadHistory();
    });
  });

  // Password Peek
  document.querySelectorAll('.btn-peek').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // URL Target Counter
  targetUrls.addEventListener('input', () => {
    const urls = targetUrls.value.split('\n').map(u => u.trim()).filter(Boolean);
    urlCounter.innerText = `${urls.length} TARGETS`;
  });

  // 2. Terminal Live Logging (SSE)
  function initLogStream() {
    const eventSource = new EventSource('/api/logs/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CONNECTED') return;
        appendLogEntry(data);
      } catch (e) {}
    };
  }

  function appendLogEntry(log) {
    const line = document.createElement('div');
    line.className = `term-line ${log.level || 'info'}`;
    line.innerText = `[${log.timestamp || 'LOG'}] ${log.message}`;
    liveTerminalOutput.appendChild(line);
    liveTerminalOutput.scrollTop = liveTerminalOutput.scrollHeight;
  }

  btnClearTerminal.addEventListener('click', () => {
    liveTerminalOutput.innerHTML = '';
  });

  // 3. Accounts Management
  async function loadAccounts() {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success && data.accounts) {
        accountsList = data.accounts;
        renderAccountsGrid(data.accounts);
        updateAccountDropdowns(data.accounts);
        updateAccountSummary(data.accounts);
      }
    } catch (e) {
      console.error('Error loading accounts:', e);
    }
  }

  function updateAccountSummary(accounts) {
    const total = accounts.length;
    const active = accounts.filter(a => a.enabled !== false).length;
    sidebarTotalAccounts.innerText = total;
    sidebarActiveAccounts.innerText = active;
    if (sidebarRateMetric) {
      sidebarRateMetric.innerText = active > 0 ? `${active}x TUNNEL` : 'IDLE';
    }
  }

  function updateAccountDropdowns(accounts) {
    const activeAccounts = accounts.filter(a => a.enabled !== false);

    const generateOptions = () => {
      let html = `<option value="all">⚡ All Active Nodes (${activeAccounts.length} Nodes - Sequential Rotation)</option>`;
      accounts.forEach(acc => {
        const statusEmoji = acc.enabled === false ? '⏸' : (acc.isValid ? '●' : '○');
        html += `<option value="${acc.id}">${statusEmoji} ${acc.label} (@${acc.username || 'user'})</option>`;
      });
      return html;
    };

    batchAccountSelector.innerHTML = generateOptions();
    hunterAccountSelector.innerHTML = generateOptions();
  }

  function renderAccountsGrid(accounts) {
    accountsGridContainer.innerHTML = '';

    if (accounts.length === 0) {
      accountsGridContainer.innerHTML = `
        <div class="node-item-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--text-pure);">No Registered Nodes Found</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 8px 0 16px;">Register your primary X account cookie and proxy tunnel to initialize node cluster.</p>
          <button class="btn btn-hallmark-primary" onclick="document.getElementById('btnOpenAddAccountModal').click()">+ Register First Node</button>
        </div>
      `;
      return;
    }

    accounts.forEach(acc => {
      const card = document.createElement('div');
      card.className = `node-item-card ${acc.enabled === false ? 'disabled' : ''}`;
      
      const avatarSrc = acc.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
      const proxyBadge = acc.proxy
        ? `<span class="node-badge badge-proxy-tag" title="${acc.proxy}">TUNNEL: ${acc.proxy.replace(/http:\/\/[^@]*@/, '')}</span>`
        : `<span class="node-badge" style="background: rgba(255,255,255,0.03); color: var(--text-dim);">DIRECT IP</span>`;
      
      const statusBadge = acc.isValid
        ? `<span class="node-badge badge-valid-tag">● VALID SESSION</span>`
        : `<span class="node-badge badge-unverified-tag">○ UNVERIFIED</span>`;

      const commentsCount = acc.commentsCount !== undefined ? acc.commentsCount : 3;

      card.innerHTML = `
        <div class="card-node-head">
          <div class="node-identity">
            <img src="${avatarSrc}" alt="Avatar" class="node-avatar">
            <div class="node-title-group">
              <h4>${acc.label || 'Node'}</h4>
              <div class="node-handle">@${acc.username || 'unauthenticated'}</div>
            </div>
          </div>
          <button class="btn btn-sm ${acc.enabled !== false ? 'btn-hallmark-secondary' : 'btn-outline'}" data-action="toggle" data-id="${acc.id}">
            ${acc.enabled !== false ? 'ONLINE' : 'PAUSED'}
          </button>
        </div>

        <div class="node-tags-row">
          ${statusBadge}
          ${proxyBadge}
          <span class="node-badge badge-payload-tag" data-action="comments" data-id="${acc.id}">
            💬 ${commentsCount} PAYLOAD ENTRIES
          </span>
        </div>

        <div class="card-node-actions">
          <button class="btn btn-hallmark-secondary btn-sm" data-action="verify" data-id="${acc.id}">
            ⚡ Test Probe
          </button>
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${acc.id}">
            Config
          </button>
          <button class="btn btn-outline btn-sm" data-action="delete" data-id="${acc.id}" title="Remove Node" style="color: var(--accent-crimson);">
            ✕
          </button>
        </div>
      `;

      card.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleAccount(acc.id));
      card.querySelector('[data-action="verify"]').addEventListener('click', () => verifyAccount(acc.id));
      card.querySelector('[data-action="edit"]').addEventListener('click', () => openEditAccountModal(acc));
      card.querySelector('[data-action="comments"]').addEventListener('click', () => openCommentsModal(acc));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteAccount(acc.id));

      accountsGridContainer.appendChild(card);
    });
  }

  // Account Modal
  btnOpenAddAccountModal.addEventListener('click', () => {
    editAccountId.value = '';
    modalAccountTitle.innerText = 'Register New X Node';
    accInputLabel.value = `Node-${accountsList.length + 1}`;
    accInputAuthToken.value = '';
    accInputCt0.value = '';
    accInputProxy.value = '';
    accountModal.style.display = 'flex';
  });

  function openEditAccountModal(acc) {
    editAccountId.value = acc.id;
    modalAccountTitle.innerText = `Edit: ${acc.label}`;
    accInputLabel.value = acc.label || '';
    accInputAuthToken.value = acc.auth_token || '';
    accInputCt0.value = acc.ct0 || '';
    accInputProxy.value = acc.proxy || '';
    accountModal.style.display = 'flex';
  }

  function closeAccountModal() {
    accountModal.style.display = 'none';
  }

  btnCloseAccountModal.addEventListener('click', closeAccountModal);
  btnCancelAccountModal.addEventListener('click', closeAccountModal);

  btnSaveAccountModal.addEventListener('click', async () => {
    const id = editAccountId.value;
    const label = accInputLabel.value.trim();
    const auth_token = accInputAuthToken.value.trim();
    const ct0 = accInputCt0.value.trim();
    const proxy = accInputProxy.value.trim();

    if (!auth_token) {
      alert('auth_token cookie is required.');
      return;
    }

    try {
      const url = id ? `/api/accounts/${id}` : '/api/accounts';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, auth_token, ct0, proxy })
      });

      const data = await res.json();
      if (data.success) {
        closeAccountModal();
        loadAccounts();
      } else {
        alert(data.message || 'Failed to save account.');
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  });

  async function toggleAccount(id) {
    try {
      await fetch(`/api/accounts/${id}/toggle`, { method: 'POST' });
      loadAccounts();
    } catch (e) {}
  }

  async function deleteAccount(id) {
    if (!confirm('Are you sure you want to remove this node?')) return;
    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      loadAccounts();
    } catch (e) {}
  }

  async function verifyAccount(id) {
    const btn = document.querySelector(`[data-action="verify"][data-id="${id}"]`);
    if (btn) btn.innerText = 'PROBING...';
    try {
      const res = await fetch(`/api/accounts/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Node verified: @${data.account.username} (${data.account.name})`);
      } else {
        alert(`Verification failed: ${data.message}`);
      }
      loadAccounts();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }

  // 4. Comments JSON Modal & Uploader
  async function openCommentsModal(acc) {
    commentsModalAccountId.value = acc.id;
    commentsModalTitle.innerText = `Payload Bank: ${acc.label} (@${acc.username || 'user'})`;
    commentsModalSubtitle.innerText = `File: data/comments/${acc.commentsFile || `comments_${acc.id}.json`}`;
    
    try {
      const res = await fetch(`/api/accounts/${acc.id}/comments`);
      const data = await res.json();
      renderAccountCommentsList(data.comments || []);
    } catch (e) {
      renderAccountCommentsList([]);
    }

    commentsModal.style.display = 'flex';
  }

  function renderAccountCommentsList(comments) {
    accountCommentsList.innerHTML = '';
    comments.forEach(c => {
      addCommentRow(c);
    });
  }

  function addCommentRow(text = '') {
    const div = document.createElement('div');
    div.className = 'template-item';
    div.innerHTML = `
      <textarea rows="2" class="field-textarea acc-comment-text font-mono" placeholder="Enter template entry (supports spintax {Option 1|Option 2})...">${text}</textarea>
      <button class="btn-remove-template" title="Delete">✕</button>
    `;
    div.querySelector('.btn-remove-template').addEventListener('click', () => div.remove());
    accountCommentsList.appendChild(div);
  }

  btnAddAccountCommentRow.addEventListener('click', () => addCommentRow(''));

  function closeCommentsModal() {
    commentsModal.style.display = 'none';
  }

  btnCloseCommentsModal.addEventListener('click', closeCommentsModal);
  btnCancelCommentsModal.addEventListener('click', closeCommentsModal);

  inputFileUploadComments.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          renderAccountCommentsList(parsed);
          alert(`Imported ${parsed.length} entries from ${file.name}`);
        } else {
          alert('JSON format must be an array of strings: ["comment 1", "comment 2"]');
        }
      } catch (err) {
        alert(`Error reading JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  });

  btnSaveAccountCommentsModal.addEventListener('click', async () => {
    const id = commentsModalAccountId.value;
    const textareas = accountCommentsList.querySelectorAll('.acc-comment-text');
    const comments = Array.from(textareas).map(t => t.value.trim()).filter(Boolean);

    if (comments.length === 0) {
      alert('At least 1 comment template entry is required.');
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments })
      });
      const data = await res.json();
      if (data.success) {
        closeCommentsModal();
        loadAccounts();
      }
    } catch (e) {
      alert('Failed to save payload bank.');
    }
  });

  // 5. Batch Automation Runner
  btnStartBatch.addEventListener('click', async () => {
    const urls = targetUrls.value.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      alert('Please specify at least one target tweet URL.');
      return;
    }

    const accountIds = batchAccountSelector.value;
    const like = checkLike.checked;
    const retweet = checkRetweet.checked;
    const comment = checkComment.checked;
    const commentText = customCommentInput.value.trim();

    if (!like && !retweet && !comment) {
      alert('Select at least one interaction vector.');
      return;
    }

    try {
      const res = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds, urls, like, retweet, comment, commentText })
      });
      const data = await res.json();
      if (data.success) {
        updateRunningTaskUI(true, { total: urls.length, completed: 0 });
      } else {
        alert(data.message || 'Failed to start mission.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });

  btnStopTask.addEventListener('click', async () => {
    try {
      await fetch('/api/tasks/stop', { method: 'POST' });
      updateRunningTaskUI(false);
    } catch (e) {}
  });

  // 6. Hunter Runner
  btnStartHunter.addEventListener('click', async () => {
    const keyword = hunterKeyword.value.trim();
    const count = parseInt(hunterCount.value, 10) || 10;
    const accountIds = hunterAccountSelector.value;
    const like = hunterCheckLike.checked;
    const retweet = hunterCheckRetweet.checked;
    const comment = hunterCheckComment.checked;

    if (!keyword) {
      alert('Search query / hashtag is required.');
      return;
    }

    try {
      const res = await fetch('/api/tasks/hunter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds, keyword, count, like, retweet, comment })
      });
      const data = await res.json();
      if (data.success) {
        const batchNav = document.querySelector('[data-tab="tab-batch"]');
        if (batchNav) batchNav.click();
        updateRunningTaskUI(true, { targetCount: count, completed: 0 });
      } else {
        alert(data.message || 'Failed to start Feed Hunter.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });

  // 7. Global Templates & Spintax
  async function loadGlobalTemplates() {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.templates) {
        templateListContainer.innerHTML = '';
        data.templates.forEach(tmpl => {
          const item = document.createElement('div');
          item.className = 'template-item';
          item.innerHTML = `
            <textarea rows="2" class="field-textarea template-text font-mono">${tmpl}</textarea>
            <button class="btn-remove-template" title="Delete">✕</button>
          `;
          item.querySelector('.btn-remove-template').addEventListener('click', () => item.remove());
          templateListContainer.appendChild(item);
        });
      }
    } catch (e) {}
  }

  btnAddNewTemplate.addEventListener('click', () => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.innerHTML = `
      <textarea rows="2" class="field-textarea template-text font-mono" placeholder="Enter template entry {Option A|Option B}..."></textarea>
      <button class="btn-remove-template" title="Delete">✕</button>
    `;
    item.querySelector('.btn-remove-template').addEventListener('click', () => item.remove());
    templateListContainer.prepend(item);
  });

  btnSaveTemplates.addEventListener('click', async () => {
    const textareas = templateListContainer.querySelectorAll('.template-text');
    const templates = Array.from(textareas).map(t => t.value.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })
      });
      const data = await res.json();
      if (data.success) {
        alert('Global fallback templates saved.');
      }
    } catch (e) {}
  });

  btnRunSpintaxTest.addEventListener('click', async () => {
    const text = spintaxTesterInput.value.trim();
    if (!text) return;

    try {
      const res = await fetch('/api/spintax/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, count: 5 })
      });
      const data = await res.json();
      if (data.success && data.variations) {
        spintaxVariationList.innerHTML = '';
        data.variations.forEach(v => {
          const li = document.createElement('li');
          li.innerText = v;
          spintaxVariationList.appendChild(li);
        });
        spintaxResultsContainer.style.display = 'block';
      }
    } catch (e) {}
  });

  // 8. Safety Settings
  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        minDelaySec.value = data.settings.minDelaySeconds || 15;
        maxDelaySec.value = data.settings.maxDelaySeconds || 35;
        accountSwitchDelaySec.value = data.settings.accountSwitchDelaySec || 10;
        dailyLimit.value = data.settings.dailyLimit || 150;
        checkHeadless.checked = Boolean(data.settings.headless);
        checkScrollAction.checked = Boolean(data.settings.scrollBeforeAction);
      }
    } catch (e) {}
  }

  btnSaveSafetySettings.addEventListener('click', async () => {
    const payload = {
      minDelaySeconds: parseInt(minDelaySec.value, 10) || 15,
      maxDelaySeconds: parseInt(maxDelaySec.value, 10) || 35,
      accountSwitchDelaySec: parseInt(accountSwitchDelaySec.value, 10) || 10,
      dailyLimit: parseInt(dailyLimit.value, 10) || 150,
      headless: checkHeadless.checked,
      scrollBeforeAction: checkScrollAction.checked
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Defense protocol settings saved.');
      }
    } catch (e) {}
  });

  // 9. History Table
  async function loadHistory() {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.history) {
        renderHistoryTable(data.history);
      }
      if (data.stats) {
        statLikes.innerText = data.stats.totalLikes || 0;
        statRetweets.innerText = data.stats.totalRetweets || 0;
        statComments.innerText = data.stats.totalComments || 0;
      }
    } catch (e) {}
  }

  function renderHistoryTable(items) {
    historyTableBody.innerHTML = '';
    if (items.length === 0) {
      historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No audit events recorded yet.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      const actionClass = {
        LIKE: 'action-like',
        RETWEET: 'action-retweet',
        COMMENT: 'action-comment'
      }[item.action] || '';

      const statusClass = {
        SUCCESS: 'status-success',
        ALREADY_DONE: 'status-already',
        FAILED: 'status-failed'
      }[item.status] || '';

      const shortUrl = item.tweetUrl ? item.tweetUrl.replace('https://x.com/', '').replace('https://twitter.com/', '') : '-';

      tr.innerHTML = `
        <td>${item.timeFormatted || item.timestamp?.slice(11, 19) || '-'}</td>
        <td><strong>${item.accountName ? `@${item.accountName}` : 'NODE'}</strong></td>
        <td><span class="action-badge ${actionClass}">${item.action}</span></td>
        <td><a href="${item.tweetUrl}" target="_blank" style="color: var(--accent-amber); text-decoration: none;">${shortUrl}</a></td>
        <td><span class="status-badge ${statusClass}">${item.status}</span></td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.details || item.message || '-'}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  btnRefreshHistory.addEventListener('click', loadHistory);

  function updateRunningTaskUI(isRunning, task) {
    if (isRunning) {
      taskStatusBadge.className = 'status-indicator-badge status-running';
      taskStatusBadge.innerText = 'EXECUTING';
      btnStartBatch.style.display = 'none';
      btnStopTask.style.display = 'block';
      btnStartHunter.disabled = true;

      if (task) {
        const total = task.total || task.targetCount || 1;
        const current = task.completed || 0;
        const pct = Math.min(100, Math.round((current / total) * 100));
        progressLabel.innerText = `PIPELINE: ${current}/${total} ACTIONS (${task.accountsCount || 1} NODES)`;
        progressPercent.innerText = `${pct}%`;
        progressBarFill.style.width = `${pct}%`;
      }
    } else {
      taskStatusBadge.className = 'status-indicator-badge status-idle';
      taskStatusBadge.innerText = 'STANDBY';
      btnStartBatch.style.display = 'block';
      btnStopTask.style.display = 'none';
      btnStartHunter.disabled = false;
    }
  }

  // Periodic Telemetry Poll
  setInterval(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.stats) {
        statLikes.innerText = data.stats.totalLikes || 0;
        statRetweets.innerText = data.stats.totalRetweets || 0;
        statComments.innerText = data.stats.totalComments || 0;
      }
      updateRunningTaskUI(data.isRunning, data.currentTask);
    } catch (e) {}
  }, 4000);

  // Initialize
  initLogStream();
  loadAccounts();
  loadGlobalTemplates();
  loadSettings();
  loadHistory();
});
