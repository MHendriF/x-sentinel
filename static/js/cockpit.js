/* X-SENTINEL Cockpit Client Runtime — @alpinejs/csp + HTMX + SSE */
(function () {
  'use strict';

  const TAB_KEYS = {
    '1': 'accounts',
    '2': 'composer',
    '3': 'batch',
    '4': 'hunter',
    '5': 'analytics',
    '6': 'ai',
    '7': 'spintax',
    '8': 'safety',
    '9': 'history',
    '0': 'about',
  };

  function showToast(kind, message) {
    const region = document.getElementById('toast-region');
    if (!region || !message) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${kind || 'info'}`;
    toast.setAttribute('role', 'status');

    const text = document.createElement('span');
    text.textContent = message;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost btn--sm';
    btn.setAttribute('aria-label', 'Dismiss notification');
    btn.textContent = 'Close';
    btn.addEventListener('click', () => toast.remove());

    toast.appendChild(text);
    toast.appendChild(btn);
    region.appendChild(toast);

    window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 4500);
  }

  window.xsShowToast = showToast;

  function isEditableTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function navigateTab(tab) {
    const link = document.querySelector(`[data-nav-tab="${tab}"]`);
    if (link) {
      link.click();
    } else {
      window.location.href = `/ui/${tab}`;
    }
  }

  function syncActiveSidebarLink(tab) {
    document.querySelectorAll('[data-nav-tab]').forEach((el) => {
      if (el.dataset.navTab === tab) {
        el.classList.add('is-active');
        el.setAttribute('aria-current', 'page');
      } else {
        el.classList.remove('is-active');
        el.removeAttribute('aria-current');
      }
    });
  }

  document.addEventListener('htmx:afterSwap', (evt) => {
    const target = evt.detail && evt.detail.target;
    if (target && target.id === 'tab-stage') {
      const activeMarker = target.querySelector('[data-active-tab]');
      if (activeMarker && activeMarker.dataset.activeTab) {
        syncActiveSidebarLink(activeMarker.dataset.activeTab);
      }
    }
  });

  document.addEventListener('htmx:responseError', (evt) => {
    const xhr = evt.detail && evt.detail.xhr;
    if (!xhr) return;
    if (xhr.status === 401) {
      window.location.href = '/login';
      return;
    }
    let msg = `Request failed (HTTP ${xhr.status}).`;
    try {
      const parsed = JSON.parse(xhr.responseText);
      if (parsed && parsed.message) msg = parsed.message;
    } catch (_) {
      /* response was HTML or empty */
    }
    showToast('err', msg);
  });

  document.addEventListener('xs-toast', (evt) => {
    const detail = evt.detail || {};
    showToast(detail.kind || 'info', detail.message || '');
  });

  document.addEventListener('alpine:init', () => {
    const Alpine = window.Alpine;

    Alpine.data('cockpitShell', () => ({
      collapsed: false,
      drawerOpen: false,

      init() {
        this.collapsed = window.localStorage.getItem('xs_sidebar_collapsed') === 'true';

        // Support legacy /#tab deep links
        const rawHash = (window.location.hash || '').replace(/^#\/?/, '').trim();
        if (rawHash && Object.values(TAB_KEYS).includes(rawHash)) {
          window.location.replace(`/ui/${rawHash}`);
          return;
        }

        window.addEventListener('keydown', (e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (isEditableTarget(e.target)) return;

          if (e.key === '[') {
            e.preventDefault();
            this.toggleSidebar();
            return;
          }
          if (e.key === '/') {
            const search = document.getElementById('node-search');
            if (search) {
              e.preventDefault();
              search.focus();
            }
            return;
          }
          if (Object.prototype.hasOwnProperty.call(TAB_KEYS, e.key)) {
            e.preventDefault();
            navigateTab(TAB_KEYS[e.key]);
          }
        });
      },

      shellClass() {
        return this.collapsed ? 'cockpit-shell is-collapsed' : 'cockpit-shell';
      },

      drawerClass() {
        return this.drawerOpen ? 'sidebar is-open' : 'sidebar';
      },

      backdropClass() {
        return this.drawerOpen ? 'drawer-backdrop is-open' : 'drawer-backdrop';
      },

      collapseLabel() {
        return this.collapsed ? 'Expand sidebar' : 'Collapse sidebar';
      },

      toggleSidebar() {
        this.collapsed = !this.collapsed;
        window.localStorage.setItem('xs_sidebar_collapsed', String(this.collapsed));
      },

      openDrawer() {
        this.drawerOpen = true;
      },

      closeDrawer() {
        this.drawerOpen = false;
      },

      closeModal() {
        const portal = document.getElementById('modal-portal');
        if (portal) portal.innerHTML = '';
      },

      async logout() {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
          window.location.href = '/login';
        }
      },
    }));

    Alpine.data('loginGate', () => ({
      username: '',
      password: '',
      totpCode: '',
      showPassword: false,
      requireTotp: false,
      loading: false,
      errorMsg: '',

      passwordType() {
        return this.showPassword ? 'text' : 'password';
      },

      toggleLabel() {
        return this.showPassword ? 'Hide passcode' : 'Show passcode';
      },

      hasError() {
        return Boolean(this.errorMsg);
      },

      hasNoError() {
        return !this.errorMsg;
      },

      notLoading() {
        return !this.loading;
      },

      togglePassword() {
        this.showPassword = !this.showPassword;
      },

      async submitLogin(evt) {
        if (evt) evt.preventDefault();
        if (this.loading) return;
        this.errorMsg = '';
        this.loading = true;
        try {
          const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: this.username.trim(),
              password: this.password,
              totpCode: this.requireTotp ? this.totpCode.trim() : undefined,
            }),
          });
          const data = await resp.json().catch(() => ({}));
          if (data.requireTotp) {
            this.requireTotp = true;
            this.loading = false;
            return;
          }
          if (!resp.ok || !data.success) {
            this.errorMsg = data.message || `Sign in failed (HTTP ${resp.status}).`;
            this.loading = false;
            return;
          }
          window.location.href = '/';
        } catch (err) {
          this.errorMsg = err && err.message ? err.message : 'Network error connecting to local server.';
          this.loading = false;
        }
      },
    }));

    Alpine.data('nodesDeck', () => ({
      selectedIds: [],

      hasSelection() {
        return this.selectedIds.length > 0;
      },

      selectedCount() {
        return this.selectedIds.length;
      },

      selectedCsv() {
        return this.selectedIds.join(',');
      },

      toggleNodeId() {
        const id = this.$el && this.$el.dataset ? this.$el.dataset.nodeId : '';
        if (!id) return;
        const idx = this.selectedIds.indexOf(id);
        if (idx === -1) {
          this.selectedIds.push(id);
        } else {
          this.selectedIds.splice(idx, 1);
        }
      },

      clearSelection() {
        this.selectedIds = [];
        document.querySelectorAll('.node-select-checkbox').forEach((cb) => {
          cb.checked = false;
        });
      },

      toggleVisibleAll() {
        const boxes = Array.from(document.querySelectorAll('.node-select-checkbox'));
        if (this.selectedIds.length >= boxes.length && boxes.length > 0) {
          this.clearSelection();
          return;
        }
        this.selectedIds = boxes.map((cb) => {
          cb.checked = true;
          return cb.dataset.nodeId;
        }).filter(Boolean);
      },
    }));

    Alpine.data('accountModalForm', () => ({
      cookieRaw: '',
      authToken: '',
      ct0: '',
      proxy: '',
      proxyStatus: '',
      proxyOk: false,
      testingProxy: false,

      init() {
        const root = this.$el;
        if (root && root.dataset) {
          this.authToken = root.dataset.initToken || '';
          this.ct0 = root.dataset.initCt0 || '';
          this.proxy = root.dataset.initProxy || '';
        }
      },

      hasProxyStatus() {
        return Boolean(this.proxyStatus);
      },

      proxyAlertClass() {
        return this.proxyOk ? 'alert alert--ok' : 'alert alert--err';
      },

      extractCookies() {
        const raw = (this.cookieRaw || '').trim();
        if (!raw) {
          showToast('warn', 'Paste JSON cookies, Netscape text, or auth_token string first.');
          return;
        }
        let foundAuth = '';
        let foundCt0 = '';

        // 1. JSON array of cookies ([{ name: "auth_token", value: "..." }])
        if (raw.startsWith('[') || raw.startsWith('{')) {
          try {
            const parsed = JSON.parse(raw);
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of arr) {
              if (!item || typeof item !== 'object') continue;
              if (item.name === 'auth_token' && item.value) foundAuth = String(item.value);
              if (item.name === 'ct0' && item.value) foundCt0 = String(item.value);
              if (item.auth_token) foundAuth = String(item.auth_token);
              if (item.ct0) foundCt0 = String(item.ct0);
            }
          } catch (_) {
            /* fall through to key-value matchers */
          }
        }

        // 2. HTTP Cookie header or colon/pipe/tab Netscape rows
        if (!foundAuth) {
          const authMatch = raw.match(/(?:^|[;\s,])auth_token[=:\t ]+([A-Za-z0-9_-]{20,})/i);
          if (authMatch) foundAuth = authMatch[1];
        }
        if (!foundCt0) {
          const ct0Match = raw.match(/(?:^|[;\s,])ct0[=:\t ]+([A-Za-z0-9_-]{12,})/i);
          if (ct0Match) foundCt0 = ct0Match[1];
        }

        if (!foundAuth && !foundCt0 && /^[a-z0-9]{30,}$/i.test(raw)) {
          foundAuth = raw;
        }

        if (foundAuth) this.authToken = foundAuth.trim();
        if (foundCt0) this.ct0 = foundCt0.trim();

        if (foundAuth || foundCt0) {
          showToast('ok', 'Extracted X session tokens into form fields.');
        } else {
          showToast('warn', 'Could not detect auth_token or ct0 in pasted text.');
        }
      },

      async runProxyTest() {
        const val = (this.proxy || '').trim();
        if (!val || val.includes('••••')) {
          this.proxyOk = false;
          this.proxyStatus = 'Enter a raw proxy (user:pass@ip:port or ip:port) to test connectivity.';
          return;
        }
        this.testingProxy = true;
        this.proxyStatus = '';
        try {
          const resp = await fetch('/api/proxy/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proxy: val }),
          });
          const data = await resp.json().catch(() => ({}));
          this.proxyOk = Boolean(data.success);
          if (data.success) {
            this.proxyStatus = `Connected in ${data.latency || 0}ms | IP ${data.ip || '-'} (${data.country || '-'}, ${data.isp || '-'})`;
          } else {
            this.proxyStatus = data.message || 'Proxy check failed.';
          }
        } catch (err) {
          this.proxyOk = false;
          this.proxyStatus = err.message || 'Proxy check failed.';
        } finally {
          this.testingProxy = false;
        }
      },
    }));

    Alpine.data('composerStudio', () => ({
      subTab: 'studio',
      draftText: '',
      authorLabel: 'Fleet Node',
      mediaPaths: [],
      draftsStash: [],

      init() {
        try {
          const saved = window.localStorage.getItem('xs_composer_drafts');
          if (saved) this.draftsStash = JSON.parse(saved) || [];
        } catch (_) {
          this.draftsStash = [];
        }
      },

      isStudio() { return this.subTab === 'studio'; },
      isStash() { return this.subTab === 'stash'; },
      isQueue() { return this.subTab === 'queue'; },

      studioTabClass() { return this.subTab === 'studio' ? 'seg-tab is-active' : 'seg-tab'; },
      stashTabClass() { return this.subTab === 'stash' ? 'seg-tab is-active' : 'seg-tab'; },
      queueTabClass() { return this.subTab === 'queue' ? 'seg-tab is-active' : 'seg-tab'; },

      setSubTab() {
        const next = this.$el && this.$el.dataset ? this.$el.dataset.tab : 'studio';
        this.subTab = next || 'studio';
      },

      charCount() {
        return (this.draftText || '').length;
      },

      charStatusText() {
        const n = (this.draftText || '').length;
        return `${n}/280 chars`;
      },

      previewBody() {
        const t = (this.draftText || '').trim();
        return t || 'Draft preview appears here as you type.';
      },

      meterClass() {
        return (this.draftText || '').length > 280 ? 'meter is-over' : 'meter';
      },

      mediaCount() {
        return this.mediaPaths.length;
      },

      hasMedia() {
        return this.mediaPaths.length > 0;
      },

      mediaPathsCsv() {
        return this.mediaPaths.join('\n');
      },

      adoptDraftFromEl() {
        const txt = this.$el && this.$el.dataset ? this.$el.dataset.draftText : '';
        if (txt) {
          this.draftText = txt;
          this.subTab = 'studio';
          showToast('ok', 'Draft loaded into composer.');
        }
      },

      cleanWhitespace() {
        this.draftText = (this.draftText || '')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ \t]{2,}/g, ' ')
          .trim();
      },

      saveToStash() {
        const txt = (this.draftText || '').trim();
        if (!txt) {
          showToast('warn', 'Enter draft text before saving to stash.');
          return;
        }
        this.draftsStash.unshift({
          id: String(Date.now()),
          text: txt,
          createdAt: new Date().toLocaleTimeString(),
        });
        this.draftsStash = this.draftsStash.slice(0, 30);
        window.localStorage.setItem('xs_composer_drafts', JSON.stringify(this.draftsStash));
        showToast('ok', 'Draft saved to local stash.');
      },

      loadStashItem() {
        const idx = Number(this.$el && this.$el.dataset ? this.$el.dataset.idx : -1);
        const item = this.draftsStash[idx];
        if (item) {
          this.draftText = item.text;
          this.subTab = 'studio';
        }
      },

      removeStashItem() {
        const idx = Number(this.$el && this.$el.dataset ? this.$el.dataset.idx : -1);
        if (idx >= 0) {
          this.draftsStash.splice(idx, 1);
          window.localStorage.setItem('xs_composer_drafts', JSON.stringify(this.draftsStash));
        }
      },

      hasStash() {
        return this.draftsStash.length > 0;
      },

      emptyStash() {
        return this.draftsStash.length === 0;
      },

      async handleMediaUpload(evt) {
        const file = evt && evt.target && evt.target.files ? evt.target.files[0] : null;
        if (!file) return;
        if (this.mediaPaths.length >= 4) {
          showToast('warn', 'Maximum 4 images supported per post.');
          evt.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const resp = await fetch('/api/media/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: reader.result,
                filename: file.name.replace(/\.[^.]+$/, ''),
              }),
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
              showToast('err', data.message || 'Image upload failed.');
              return;
            }
            this.mediaPaths.push(data.localPath);
            showToast('ok', `Uploaded ${data.filename} (${data.sizeKb} KB).`);
          } catch (err) {
            showToast('err', err.message || 'Image upload failed.');
          } finally {
            evt.target.value = '';
          }
        };
        reader.readAsDataURL(file);
      },

      clearMedia() {
        this.mediaPaths = [];
      },
    }));

    Alpine.data('sseConsole', () => ({
      lines: [],
      connected: false,
      paused: false,
      autoScroll: true,
      es: null,

      init() {
        this.connect();
      },

      destroy() {
        if (this.es) {
          this.es.close();
          this.es = null;
        }
      },

      statusText() {
        if (this.paused) return 'Paused';
        return this.connected ? 'Streaming' : 'Connecting';
      },

      statusDotClass() {
        if (this.paused) return 'dot dot--warn';
        return this.connected ? 'dot dot--ok' : 'dot';
      },

      hasLines() {
        return this.lines.length > 0;
      },

      noLines() {
        return this.lines.length === 0;
      },

      pauseBtnLabel() {
        return this.paused ? 'Resume stream' : 'Pause stream';
      },

      connect() {
        if (this.es) this.es.close();
        const es = new EventSource('/api/logs/stream');
        this.es = es;
        es.onopen = () => {
          this.connected = true;
        };
        es.onerror = () => {
          this.connected = false;
        };
        es.onmessage = (msg) => {
          if (this.paused || !msg.data) return;
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed.type === 'CONNECTED') {
              this.connected = true;
              return;
            }
            const lvl = (parsed.level || 'info').toLowerCase();
            this.lines.push({
              id: `${Date.now()}-${Math.random()}`,
              time: parsed.timestamp || new Date().toLocaleTimeString(),
              level: lvl,
              cls: `log-lvl-${lvl}`,
              message: parsed.message || '',
            });
            if (this.lines.length > 300) {
              this.lines = this.lines.slice(-300);
            }
            if (this.autoScroll) {
              this.$nextTick(() => {
                const box = document.getElementById('sse-terminal-box');
                if (box) box.scrollTop = box.scrollHeight;
              });
            }
          } catch (_) {
            /* ignore heartbeat text frames */
          }
        };
      },

      togglePause() {
        this.paused = !this.paused;
      },

      clearLines() {
        this.lines = [];
      },

      async copyLines() {
        const text = this.lines.map((l) => `[${l.time}] [${l.level}] ${l.message}`).join('\n');
        if (!text) {
          showToast('warn', 'No log events in buffer to copy.');
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          showToast('ok', `Copied ${this.lines.length} log lines.`);
        } catch (_) {
          showToast('err', 'Clipboard access denied.');
        }
      },
    }));

    Alpine.data('targetWorkbench', () => ({
      urlsText: '',
      replyMode: 'node',
      rightTab: 'stream',
      spintaxSample: '{Great point|Agreed|Solid breakdown} — thanks for sharing.',
      spintaxPreviews: [],

      isStreamTab() { return this.rightTab === 'stream'; },
      isMonitorTab() { return this.rightTab === 'monitor'; },
      streamTabClass() { return this.rightTab === 'stream' ? 'seg-tab is-active' : 'seg-tab'; },
      monitorTabClass() { return this.rightTab === 'monitor' ? 'seg-tab is-active' : 'seg-tab'; },
      setRightTab() {
        this.rightTab = (this.$el && this.$el.dataset && this.$el.dataset.tab) || 'stream';
      },

      showCustomReply() { return this.replyMode === 'custom'; },
      showSpintaxPanel() { return this.replyMode === 'spintax'; },

      urlSummary() {
        const lines = (this.urlsText || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const valid = lines.filter((l) => /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[a-zA-Z0-9_]+\/status\/\d+/i.test(l));
        const unique = new Set(valid);
        return `${unique.size} unique valid / ${lines.length} lines`;
      },

      dedupeUrls() {
        const lines = (this.urlsText || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[a-zA-Z0-9_]+\/status\/\d+/i.test(l));
        this.urlsText = Array.from(new Set(lines)).join('\n');
      },

      async runSpintaxPreview() {
        const txt = (this.spintaxSample || '').trim();
        if (!txt) return;
        const resp = await fetch('/api/spintax/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: txt, count: 3 }),
        });
        const data = await resp.json().catch(() => ({}));
        if (data.success && Array.isArray(data.previews)) {
          this.spintaxPreviews = data.previews;
        }
      },

      hasPreviews() {
        return this.spintaxPreviews.length > 0;
      },
    }));

    Alpine.data('feedHunter', () => ({
      keyword: '',
      sortMode: 'Latest',
      excludeRetweets: true,
      minLikes: 5,
      lang: 'en',
      rightTab: 'stream',

      isStreamTab() { return this.rightTab === 'stream'; },
      isStationsTab() { return this.rightTab === 'stations'; },
      isLeadsTab() { return this.rightTab === 'leads'; },

      streamTabClass() { return this.rightTab === 'stream' ? 'seg-tab is-active' : 'seg-tab'; },
      stationsTabClass() { return this.rightTab === 'stations' ? 'seg-tab is-active' : 'seg-tab'; },
      leadsTabClass() { return this.rightTab === 'leads' ? 'seg-tab is-active' : 'seg-tab'; },

      setRightTab() {
        this.rightTab = (this.$el && this.$el.dataset && this.$el.dataset.tab) || 'stream';
      },

      applyNichePreset() {
        const q = this.$el && this.$el.dataset ? this.$el.dataset.query : '';
        if (q) this.keyword = q;
      },

      effectiveQuery() {
        const base = (this.keyword || '').trim();
        if (!base) return 'Enter keyword to preview X search query';
        const parts = [base];
        if (this.excludeRetweets) parts.push('-is:retweet');
        if (Number(this.minLikes) > 0) parts.push(`min_faves:${Number(this.minLikes)}`);
        if (this.lang && this.lang !== 'any') parts.push(`lang:${this.lang}`);
        return parts.join(' ');
      },
    }));

    Alpine.data('svgChartTooltip', () => ({
      visible: false,
      title: '',
      detail: '',
      tipStyleX: '0px',
      tipStyleY: '0px',

      showTip(evt) {
        const target = evt && evt.currentTarget;
        if (!target || !target.dataset) return;
        this.title = target.dataset.tipTitle || '';
        this.detail = target.dataset.tipDetail || '';
        const tip = document.getElementById('chart-hover-tooltip');
        if (tip && evt) {
          tip.style.left = `${Math.min(evt.clientX + 14, window.innerWidth - 220)}px`;
          tip.style.top = `${Math.max(evt.clientY - 42, 12)}px`;
        }
        this.visible = Boolean(this.title || this.detail);
      },

      hideTip() {
        this.visible = false;
      },
    }));

    Alpine.data('aiSettings', () => ({
      subTab: 'engine',
      showKey: false,

      isEngine() { return this.subTab === 'engine'; },
      isPersona() { return this.subTab === 'persona'; },
      isSandbox() { return this.subTab === 'sandbox'; },

      engineTabClass() { return this.subTab === 'engine' ? 'seg-tab is-active' : 'seg-tab'; },
      personaTabClass() { return this.subTab === 'persona' ? 'seg-tab is-active' : 'seg-tab'; },
      sandboxTabClass() { return this.subTab === 'sandbox' ? 'seg-tab is-active' : 'seg-tab'; },

      setSubTab() {
        this.subTab = (this.$el && this.$el.dataset && this.$el.dataset.tab) || 'engine';
      },

      keyInputType() {
        return this.showKey ? 'text' : 'password';
      },

      toggleKeyVisibility() {
        this.showKey = !this.showKey;
      },

      applyPersonaPreset() {
        const promptText = this.$el && this.$el.dataset ? this.$el.dataset.prompt : '';
        const area = document.getElementById('ai-system-prompt');
        if (area && promptText) {
          area.value = promptText;
          showToast('info', 'Persona prompt loaded into editor.');
        }
      },
    }));

    Alpine.data('spintaxVault', () => ({
      subTab: 'generator',

      isGenerator() { return this.subTab === 'generator'; },
      isWorkbench() { return this.subTab === 'workbench'; },
      isVault() { return this.subTab === 'vault'; },

      generatorTabClass() { return this.subTab === 'generator' ? 'seg-tab is-active' : 'seg-tab'; },
      workbenchTabClass() { return this.subTab === 'workbench' ? 'seg-tab is-active' : 'seg-tab'; },
      vaultTabClass() { return this.subTab === 'vault' ? 'seg-tab is-active' : 'seg-tab'; },

      setSubTab() {
        this.subTab = (this.$el && this.$el.dataset && this.$el.dataset.tab) || 'generator';
      },
    }));

    Alpine.data('safetyDeck', () => ({
      activePreset: 'custom',
      totpSetupOpen: false,
      totpSecret: '',
      totpQrSvg: '',
      totpCode: '',
      disablePw: '',

      applyPreset() {
        const preset = this.$el && this.$el.dataset ? this.$el.dataset.preset : '';
        const map = {
          turbo: { min: 5, max: 12, sw: 3, hr: 40, dy: 200, typ: 30, scr: false, wup: false, lock: true },
          balanced: { min: 15, max: 40, sw: 10, hr: 25, dy: 150, typ: 65, scr: true, wup: false, lock: true },
          ghost: { min: 35, max: 90, sw: 20, hr: 12, dy: 60, typ: 110, scr: true, wup: true, lock: true },
          warmup: { min: 25, max: 60, sw: 15, hr: 10, dy: 30, typ: 95, scr: true, wup: true, lock: true },
        };
        const p = map[preset];
        if (!p) return;
        this.activePreset = preset;

        const setVal = (name, val) => {
          const el = document.querySelector(`[name="${name}"]`);
          if (!el) return;
          if (el.type === 'checkbox') {
            el.checked = Boolean(val);
          } else {
            el.value = String(val);
          }
        };
        setVal('min_delay_seconds', p.min);
        setVal('max_delay_seconds', p.max);
        setVal('account_switch_delay_sec', p.sw);
        setVal('hourly_limit', p.hr);
        setVal('daily_limit', p.dy);
        setVal('human_typing_delay_ms', p.typ);
        setVal('scroll_before_action', p.scr);
        setVal('enforce_warmup_gate', p.wup);
        setVal('cross_node_target_lock', p.lock);

        showToast('info', `Loaded ${preset} rate profile. Save settings to apply.`);
      },

      async start2faSetup() {
        const resp = await fetch('/api/auth/2fa/setup', { method: 'POST' });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.success) {
          showToast('err', data.message || 'Failed to initialize 2FA setup.');
          return;
        }
        this.totpSecret = data.secret || '';
        this.totpQrSvg = data.qrSvg || '';
        this.totpSetupOpen = true;
      },

      hasTotpSetup() {
        return this.totpSetupOpen;
      },

      async confirm2faEnable() {
        const resp = await fetch('/api/auth/2fa/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: this.totpSecret, code: this.totpCode.trim() }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.success) {
          showToast('err', data.message || 'Invalid 2FA verification code.');
          return;
        }
        showToast('ok', 'Two-factor authentication enabled.');
        window.location.reload();
      },

      async disable2fa() {
        const resp = await fetch('/api/auth/2fa/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: this.disablePw }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.success) {
          showToast('err', data.message || 'Failed to disable 2FA.');
          return;
        }
        showToast('ok', 'Two-factor authentication disabled.');
        window.location.reload();
      },

      async revokeSessions() {
        const resp = await fetch('/api/auth/revoke-all', { method: 'POST' });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data.success) {
          showToast('ok', data.message || 'All other sessions revoked.');
        } else {
          showToast('err', data.message || 'Failed to revoke sessions.');
        }
      },
    }));

    Alpine.data('aboutDeck', () => ({
      subTab: 'overview',

      isOverview() { return this.subTab === 'overview'; },
      isTelemetry() { return this.subTab === 'telemetry'; },
      isDocs() { return this.subTab === 'docs'; },

      overviewTabClass() { return this.subTab === 'overview' ? 'seg-tab is-active' : 'seg-tab'; },
      telemetryTabClass() { return this.subTab === 'telemetry' ? 'seg-tab is-active' : 'seg-tab'; },
      docsTabClass() { return this.subTab === 'docs' ? 'seg-tab is-active' : 'seg-tab'; },

      setSubTab() {
        this.subTab = (this.$el && this.$el.dataset && this.$el.dataset.tab) || 'overview';
      },
    }));
  });
})();
