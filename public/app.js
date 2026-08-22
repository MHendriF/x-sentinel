// X-AutoEngage PRO - Multi-Account & Proxy Automation Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  // Stats Elements
  const statLikes = document.getElementById('statLikes');
  const statRetweets = document.getElementById('statRetweets');
  const statComments = document.getElementById('statComments');
  const sidebarTotalAccounts = document.getElementById('sidebarTotalAccounts');
  const sidebarActiveAccounts = document.getElementById('sidebarActiveAccounts');

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
    'tab-accounts': { title: 'Manajemen Multi-Akun & Proxy', subtitle: 'Kelola akun X dengan proxy individual dan bank komentar JSON kustom' },
    'tab-batch': { title: 'Target Postingan Tunggal & Batch', subtitle: 'Jalankan rotasi multi-akun untuk Like, Retweet, dan Komentar' },
    'tab-hunter': { title: 'Auto Hunter (Keyword / Hashtag)', subtitle: 'Cari topik & hashtag di X lalu auto-engage secara cerdas' },
    'tab-spintax': { title: 'Template Komentar Global', subtitle: 'Kelola variasi teks komentar default dan pengujian Spintax' },
    'tab-safety': { title: 'Pengaturan Anti-Ban & Keamanan', subtitle: 'Atur jeda waktu alami dan batas kuota aksi akun' },
    'tab-history': { title: 'Riwayat & Log Aktivitas', subtitle: 'Pantau histori tweet yang telah berhasil diinteraksikan per akun' }
  };

  // 1. Tab Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      navItems.forEach(n => n.classList.remove('active'));
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

  // Password visibility toggle
  document.querySelectorAll('.btn-toggle-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // Target URLs counter
  targetUrls.addEventListener('input', () => {
    const urls = targetUrls.value.split('\n').map(u => u.trim()).filter(Boolean);
    urlCounter.innerText = `${urls.length} Postingan`;
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

  // 3. Accounts Management & Rendering
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
  }

  function updateAccountDropdowns(accounts) {
    const activeAccounts = accounts.filter(a => a.enabled !== false);

    const generateOptions = () => {
      let html = `<option value="all">✨ Semua Akun Aktif (${activeAccounts.length} Akun - Rotasi Otomatis)</option>`;
      accounts.forEach(acc => {
        const statusEmoji = acc.enabled === false ? '⏸️' : (acc.isValid ? '✅' : '⚠️');
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
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <h4>Belum ada akun X yang ditambahkan</h4>
          <p style="color: var(--text-muted); margin: 8px 0 16px;">Tambahkan akun X pertama Anda beserta cookie auth_token, ct0, dan proxy.</p>
          <button class="btn btn-primary" onclick="document.getElementById('btnOpenAddAccountModal').click()">✨ Tambah Akun Sekarang</button>
        </div>
      `;
      return;
    }

    accounts.forEach(acc => {
      const card = document.createElement('div');
      card.className = `account-item-card ${acc.enabled === false ? 'disabled' : ''}`;
      
      const avatarSrc = acc.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
      const proxyBadge = acc.proxy
        ? `<span class="badge-tag badge-proxy" title="${acc.proxy}">🌐 Proxy: ${acc.proxy.replace(/http:\/\/[^@]*@/, '')}</span>`
        : `<span class="badge-tag" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">🌐 Tanpa Proxy</span>`;
      
      const statusBadge = acc.isValid
        ? `<span class="badge-tag badge-status-valid">✅ Aktif & Valid</span>`
        : `<span class="badge-tag badge-status-unverified">⚠️ Belum Terverifikasi</span>`;

      const commentsCount = acc.commentsCount !== undefined ? acc.commentsCount : 3;

      card.innerHTML = `
        <div class="acc-card-top">
          <div class="acc-user-meta">
            <img src="${avatarSrc}" alt="Avatar" class="acc-avatar">
            <div class="acc-title-group">
              <h4>${acc.label || 'Akun X'}</h4>
              <div class="acc-handle">@${acc.username || 'unknown'}</div>
            </div>
          </div>
          <button class="btn btn-sm ${acc.enabled !== false ? 'btn-secondary' : 'btn-outline'}" data-action="toggle" data-id="${acc.id}" title="Toggle Aktif/Nonaktif">
            ${acc.enabled !== false ? '🟢 Aktif' : '⏸️ Nonaktif'}
          </button>
        </div>

        <div class="acc-badges">
          ${statusBadge}
          ${proxyBadge}
          <span class="badge-tag badge-comments-count" data-action="comments" data-id="${acc.id}" title="Klik untuk edit/upload JSON komentar">
            💬 ${commentsCount} Komentar JSON ✏️
          </span>
        </div>

        <div class="acc-card-actions">
          <button class="btn btn-secondary btn-sm" data-action="verify" data-id="${acc.id}" title="Cek status login & proxy">
            ⚡ Verifikasi
          </button>
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${acc.id}">
            ✏️ Edit
          </button>
          <button class="btn btn-danger-outline btn-sm" data-action="delete" data-id="${acc.id}" title="Hapus Akun">
            🗑️
          </button>
        </div>
      `;

      // Attach Card Actions
      card.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleAccount(acc.id));
      card.querySelector('[data-action="verify"]').addEventListener('click', () => verifyAccount(acc.id));
      card.querySelector('[data-action="edit"]').addEventListener('click', () => openEditAccountModal(acc));
      card.querySelector('[data-action="comments"]').addEventListener('click', () => openCommentsModal(acc));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteAccount(acc.id));

      accountsGridContainer.appendChild(card);
    });
  }

  // Account Modal Actions
  btnOpenAddAccountModal.addEventListener('click', () => {
    editAccountId.value = '';
    modalAccountTitle.innerText = 'Tambah Akun X Baru';
    accInputLabel.value = `Akun ${accountsList.length + 1}`;
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
      alert('Cookie auth_token wajib diisi.');
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
        alert(data.message || 'Gagal menyimpan akun.');
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
    if (!confirm('Apakah Anda yakin ingin menghapus akun ini?')) return;
    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      loadAccounts();
    } catch (e) {}
  }

  async function verifyAccount(id) {
    const btn = document.querySelector(`[data-action="verify"][data-id="${id}"]`);
    if (btn) btn.innerText = '⏳ Memeriksa...';
    try {
      const res = await fetch(`/api/accounts/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 Akun @${data.account.username} (${data.account.name}) berhasil diverifikasi!`);
      } else {
        alert(`❌ Verifikasi gagal: ${data.message}`);
      }
      loadAccounts();
    } catch (e) {
      alert(`Error verifikasi: ${e.message}`);
    }
  }

  // 4. Comments JSON Modal & Uploader
  async function openCommentsModal(acc) {
    commentsModalAccountId.value = acc.id;
    commentsModalTitle.innerText = `Bank Komentar JSON: ${acc.label} (@${acc.username || 'user'})`;
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
      <textarea rows="2" class="acc-comment-text" placeholder="Masukkan komentar (mendukung spintax {Keren|Mantap})...">${text}</textarea>
      <button class="btn-remove-template" title="Hapus">🗑️</button>
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

  // Upload .json File
  inputFileUploadComments.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          renderAccountCommentsList(parsed);
          alert(`✅ Berhasil memuat ${parsed.length} komentar dari file ${file.name}`);
        } else {
          alert('Format JSON harus berupa array string: ["komentar 1", "komentar 2"]');
        }
      } catch (err) {
        alert(`Gagal membaca file JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  });

  btnSaveAccountCommentsModal.addEventListener('click', async () => {
    const id = commentsModalAccountId.value;
    const textareas = accountCommentsList.querySelectorAll('.acc-comment-text');
    const comments = Array.from(textareas).map(t => t.value.trim()).filter(Boolean);

    if (comments.length === 0) {
      alert('Minimal harus ada 1 komentar.');
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
        alert('💾 File JSON komentar akun berhasil disimpan!');
        closeCommentsModal();
        loadAccounts();
      }
    } catch (e) {
      alert('Gagal menyimpan file komentar.');
    }
  });

  // 5. Batch Automation Runner (Multi-Account)
  btnStartBatch.addEventListener('click', async () => {
    const urls = targetUrls.value.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      alert('Silakan masukkan minimal satu URL postingan tweet.');
      return;
    }

    const accountIds = batchAccountSelector.value;
    const like = checkLike.checked;
    const retweet = checkRetweet.checked;
    const comment = checkComment.checked;
    const commentText = customCommentInput.value.trim();

    if (!like && !retweet && !comment) {
      alert('Pilih minimal satu aksi (Like, Retweet, atau Comment).');
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
        alert(data.message || 'Gagal memulai tugas.');
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

  // 6. Hunter Runner (Multi-Account)
  btnStartHunter.addEventListener('click', async () => {
    const keyword = hunterKeyword.value.trim();
    const count = parseInt(hunterCount.value, 10) || 10;
    const accountIds = hunterAccountSelector.value;
    const like = hunterCheckLike.checked;
    const retweet = hunterCheckRetweet.checked;
    const comment = hunterCheckComment.checked;

    if (!keyword) {
      alert('Silakan masukkan kata kunci atau hashtag pencarian.');
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
        alert(data.message || 'Gagal memulai Auto Hunter.');
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
            <textarea rows="2" class="template-text">${tmpl}</textarea>
            <button class="btn-remove-template" title="Hapus">🗑️</button>
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
      <textarea rows="2" class="template-text" placeholder="Masukkan template spintax {pilihan 1|pilihan 2}..."></textarea>
      <button class="btn-remove-template" title="Hapus">🗑️</button>
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
        alert('✅ Template global berhasil disimpan.');
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
        alert('✅ Pengaturan keamanan berhasil disimpan!');
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
      historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada riwayat aktivitas.</td></tr>';
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
        <td><strong>${item.accountName ? `@${item.accountName}` : 'Akun'}</strong></td>
        <td><span class="action-badge ${actionClass}">${item.action}</span></td>
        <td><a href="${item.tweetUrl}" target="_blank" style="color: var(--accent-cyan); text-decoration: none;">${shortUrl}</a></td>
        <td><span class="status-badge ${statusClass}">${item.status}</span></td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.details || item.message || '-'}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  btnRefreshHistory.addEventListener('click', loadHistory);

  function updateRunningTaskUI(isRunning, task) {
    if (isRunning) {
      taskStatusBadge.className = 'status-pill status-running';
      taskStatusBadge.innerText = 'Berjalan';
      btnStartBatch.style.display = 'none';
      btnStopTask.style.display = 'block';
      btnStartHunter.disabled = true;

      if (task) {
        const total = task.total || task.targetCount || 1;
        const current = task.completed || 0;
        const pct = Math.min(100, Math.round((current / total) * 100));
        progressLabel.innerText = `Memproses: ${current}/${total} aksi (${task.accountsCount || 1} akun)`;
        progressPercent.innerText = `${pct}%`;
        progressBarFill.style.width = `${pct}%`;
      }
    } else {
      taskStatusBadge.className = 'status-pill status-idle';
      taskStatusBadge.innerText = 'Siap';
      btnStartBatch.style.display = 'block';
      btnStopTask.style.display = 'none';
      btnStartHunter.disabled = false;
    }
  }

  // Periodic Status Poll
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
