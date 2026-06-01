// ====================== AI ACCOUNT HUB - app.js v3 ======================

const App = {
    accounts: [],
    activeAIFilter: '',
    pendingDeleteIndex: -1,
    pendingOpenURL: '',
    countdownTimer: null,
    settings: {
        alwaysAsk: true,
        defaultOpenMode: 'direct',
        chromePath: 'google-chrome',
        chromePathWin: '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
        gistToken: '',
        gistId: ''
    },

    // ── Reset times (ms) mặc định theo AI ──
    RESET_TIMES: {
        'ChatGPT':    3  * 3600 * 1000,
        'Claude':     5  * 3600 * 1000,
        'Gemini':     24 * 3600 * 1000,
        'Perplexity': 4  * 3600 * 1000,
        'DeepSeek':   24 * 3600 * 1000,
        'Grok':       3  * 3600 * 1000,
        'Copilot':    3  * 3600 * 1000,
        'Mistral':    3  * 3600 * 1000,
        'Llama':      3  * 3600 * 1000,
    },

    // ====================== DATA ======================
    loadData() {
        try {
            const savedAccounts = localStorage.getItem('aiAccounts');
            if (savedAccounts) this.accounts = JSON.parse(savedAccounts);
        } catch(e) { this.accounts = []; }

        try {
            const savedSettings = localStorage.getItem('aiSettings');
            if (savedSettings) this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        } catch(e) {}
    },

    saveData() {
        localStorage.setItem('aiAccounts', JSON.stringify(this.accounts));
        localStorage.setItem('aiSettings', JSON.stringify(this.settings));
    },

    // ====================== RATE LIMIT ======================
    markLimited(index) {
        const acc = this.accounts[index];
        const resetMs = this.RESET_TIMES[acc.ai] || (3 * 3600 * 1000);
        acc.status = 'limited';
        acc.resetAt = new Date(Date.now() + resetMs).toISOString();
        this.saveData();
        this.render();
        const h = Math.round(resetMs / 3600000);
        this.showToast(`Đặt rate limit — reset sau ~${h}g`, 'info');
    },

    checkAutoReset() {
        let changed = false;
        const now = Date.now();
        this.accounts.forEach(acc => {
            if (acc.status === 'limited' && acc.resetAt) {
                if (new Date(acc.resetAt).getTime() <= now) {
                    acc.status = 'active';
                    acc.resetAt = null;
                    changed = true;
                }
            }
        });
        if (changed) {
            this.saveData();
            this.render();
            this.showToast('Một số tài khoản đã reset về Active ✓', 'ok');
        }
    },

    startCountdownTimer() {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        // Check every 30s, update countdown labels every 1s via requestAnimationFrame
        this.countdownTimer = setInterval(() => {
            this.checkAutoReset();
            this.updateCountdownLabels();
        }, 30000);
        // Also update labels immediately & every second for smooth display
        this.countdownFrameLoop();
    },

    countdownFrameLoop() {
        this.updateCountdownLabels();
        setTimeout(() => this.countdownFrameLoop(), 1000);
    },

    updateCountdownLabels() {
        const now = Date.now();
        document.querySelectorAll('.countdown-label').forEach(el => {
            const resetAt = el.dataset.resetat;
            if (!resetAt) return;
            const diff = new Date(resetAt).getTime() - now;
            if (diff <= 0) {
                el.textContent = 'Đang reset...';
                el.className = 'countdown-label resetting';
            } else {
                el.textContent = 'Reset sau ' + this.formatCountdown(diff);
                el.className = 'countdown-label ticking';
            }
        });
    },

    formatCountdown(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}g ${String(m).padStart(2,'0')}p`;
        if (m > 0) return `${m}p ${String(s).padStart(2,'0')}s`;
        return `${s}s`;
    },

    // ====================== RENDER ======================
    render() {
        const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
        const statusFilter = document.getElementById('filterStatus').value;
        const tagFilter = document.getElementById('filterTag').value;
        const aiFilter = this.activeAIFilter;

        let filtered = this.accounts.filter(acc => {
            const matchSearch =
                acc.name.toLowerCase().includes(searchTerm) ||
                (acc.email && acc.email.toLowerCase().includes(searchTerm)) ||
                (acc.note && acc.note.toLowerCase().includes(searchTerm)) ||
                (acc.ai && acc.ai.toLowerCase().includes(searchTerm));

            const matchStatus = !statusFilter || acc.status === statusFilter;
            const matchTag = !tagFilter || (acc.tags && acc.tags.includes(tagFilter));
            const matchAI = !aiFilter || acc.ai === aiFilter;

            return matchSearch && matchStatus && matchTag && matchAI;
        });

        filtered.sort((a, b) => {
            const statusOrder = { active: 0, limited: 1, expired: 2, banned: 3 };
            const sDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
            if (sDiff !== 0) return sDiff;
            return (b.lastUsed ? new Date(b.lastUsed) : 0) - (a.lastUsed ? new Date(a.lastUsed) : 0);
        });

        this.renderStats();
        this.renderAIChips();

        const container = document.getElementById('cardsList');
        container.innerHTML = '';

        if (this.accounts.length === 0) {
            container.innerHTML = `
                <div class="empty">
                    <i class="ti ti-robot"></i>
                    <p>Chưa có tài khoản nào</p>
                    <p class="empty-hint">Nhấn <strong>Thêm tài khoản</strong> để bắt đầu</p>
                </div>`;
            document.getElementById('resultLabel').textContent = '';
            return;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty">
                    <i class="ti ti-search"></i>
                    <p>Không tìm thấy kết quả</p>
                    <p class="empty-hint">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>`;
        } else {
            filtered.forEach(acc => {
                const realIndex = this.accounts.indexOf(acc);
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = this.buildCard(acc, realIndex);
                container.appendChild(card);
            });
        }

        document.getElementById('resultLabel').textContent =
            `Hiển thị ${filtered.length} / ${this.accounts.length} tài khoản`;
    },

    buildCard(acc, index) {
        const hasProfile = acc.profile ? `<span class="profile-badge"><i class="ti ti-brand-chrome"></i> ${acc.profile}</span>` : '';
        const emailRow = acc.email ? `<div class="card-email"><i class="ti ti-mail"></i> ${this.escapeHtml(acc.email)}</div>` : '';
        const tagsRow = acc.tags && acc.tags.length
            ? `<div class="tags">${acc.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}</div>` : '';
        const noteRow = acc.note ? `<div class="card-note">${this.escapeHtml(acc.note)}</div>` : '';
        const timeStr = acc.lastUsed ? this.timeAgo(acc.lastUsed) : 'Chưa dùng';

        // Rate limit section
        let limitRow = '';
        if (acc.status === 'limited' && acc.resetAt) {
            limitRow = `<div class="card-countdown">
                <i class="ti ti-clock-hour-4"></i>
                <span class="countdown-label ticking" data-resetat="${acc.resetAt}">Đang tính...</span>
            </div>`;
        }

        // Nút "Hết limit" chỉ hiện khi status = active
        const limitBtn = acc.status === 'active'
            ? `<button class="btn btn-sm btn-limit" onclick="App.markLimited(${index})" title="Đánh dấu hết limit">
                <i class="ti ti-clock-pause"></i> Hết limit
               </button>`
            : '';

        return `
            <div class="card-top">
                <div class="ai-icon" style="background:${this.getAIColor(acc.ai)}">
                    ${this.getAIEmoji(acc.ai)}
                </div>
                <div class="card-info">
                    <div class="card-name">${this.escapeHtml(acc.name)}</div>
                    <div class="card-type">${acc.ai}</div>
                </div>
                <div class="card-btns">
                    <button class="btn btn-sm" onclick="App.editAccount(${index})" title="Sửa">
                        <i class="ti ti-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteAccount(${index})" title="Xóa">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </div>

            ${emailRow}

            <div class="card-meta">
                <span class="sbadge s-${acc.status}">
                    <span class="sdot"></span>${this.getStatusText(acc.status)}
                </span>
                ${hasProfile}
            </div>

            ${limitRow}
            ${tagsRow}
            ${noteRow}

            <div class="card-foot">
                <div class="card-time">
                    <i class="ti ti-clock"></i> ${timeStr}
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                    ${limitBtn}
                    <button class="btn btn-open" onclick="App.openChat(${index})">
                        <i class="ti ti-external-link"></i> Mở Chat
                    </button>
                </div>
            </div>
        `;
    },

    renderStats() {
        const total = this.accounts.length;
        const active = this.accounts.filter(a => a.status === 'active').length;
        const limited = this.accounts.filter(a => a.status === 'limited').length;
        const tags = this.getTotalTags();

        const el = document.getElementById('statsRow');
        el.innerHTML = `
            <div class="stat-card">
                <div class="stat-n">${total}</div>
                <div class="stat-l">Tổng TK</div>
            </div>
            <div class="stat-card stat-green">
                <div class="stat-n">${active}</div>
                <div class="stat-l">Active</div>
            </div>
            <div class="stat-card stat-amber">
                <div class="stat-n">${limited}</div>
                <div class="stat-l">Rate Limited</div>
            </div>
            <div class="stat-card">
                <div class="stat-n">${tags}</div>
                <div class="stat-l">Tags</div>
            </div>
        `;
    },

    renderAIChips() {
        const container = document.getElementById('aiChips');
        const aiTypes = [...new Set(this.accounts.map(a => a.ai))].sort();

        let html = `<div class="chip ${!this.activeAIFilter ? 'active' : ''}" onclick="App.filterByAI('')">Tất cả</div>`;

        aiTypes.forEach(ai => {
            const count = this.accounts.filter(a => a.ai === ai).length;
            const isActive = this.activeAIFilter === ai;
            html += `<div class="chip ${isActive ? 'active' : ''}" onclick="App.filterByAI('${ai}')">
                ${ai} <span class="chip-count">${count}</span>
            </div>`;
        });

        container.innerHTML = html;
    },

    filterByAI(ai) {
        this.activeAIFilter = ai;
        this.render();
    },

    // ====================== AI META ======================
    getAIColor(ai) {
        const colors = {
            'ChatGPT':    '#10A37F',
            'Claude':     '#D97757',
            'Gemini':     '#8B5CF6',
            'Grok':       '#1A1A1A',
            'Perplexity': '#20B2AA',
            'DeepSeek':   '#2563EB',
            'Copilot':    '#0078D4',
            'Mistral':    '#FF6F00',
            'Llama':      '#7C3AED',
        };
        return colors[ai] || '#185FA5';
    },

    getAIEmoji(ai) {
        const emojis = {
            'ChatGPT':    '✦',
            'Claude':     '◈',
            'Gemini':     '✦',
            'Grok':       '𝕏',
            'Perplexity': '◎',
            'DeepSeek':   '🐋',
            'Copilot':    '◈',
            'Mistral':    '≋',
            'Llama':      '🦙',
        };
        return `<span style="font-size:18px;line-height:1;color:#fff;font-weight:700;">${emojis[ai] || '◉'}</span>`;
    },

    getDefaultURL(ai) {
        const urls = {
            'ChatGPT':    'https://chatgpt.com',
            'Claude':     'https://claude.ai',
            'Gemini':     'https://gemini.google.com',
            'Grok':       'https://grok.x.ai',
            'Perplexity': 'https://www.perplexity.ai',
            'DeepSeek':   'https://chat.deepseek.com',
            'Copilot':    'https://copilot.microsoft.com',
            'Mistral':    'https://chat.mistral.ai',
            'Llama':      'https://meta.ai',
        };
        return urls[ai] || 'https://chatgpt.com';
    },

    getStatusText(status) {
        const texts = { active: 'Active', limited: 'Rate Limited', expired: 'Hết hạn', banned: 'Banned' };
        return texts[status] || status;
    },

    getTotalTags() {
        return new Set(this.accounts.flatMap(a => a.tags || [])).size;
    },

    timeAgo(ts) {
        const diff = Date.now() - new Date(ts).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Vừa xong';
        if (m < 60) return `${m} phút trước`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} giờ trước`;
        const d = Math.floor(h / 24);
        if (d < 7) return `${d} ngày trước`;
        return new Date(ts).toLocaleDateString('vi-VN');
    },

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    // ====================== CRUD ======================
    openAdd() {
        document.getElementById('formTitle').textContent = 'Thêm tài khoản mới';
        ['fName','fEmail','fTags','fUrl','fProfile','fChromePath','fNote'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('fAI').value = 'ChatGPT';
        document.getElementById('fStatus').value = 'active';
        document.getElementById('fBrowser').value = 'chrome';
        document.getElementById('formOverlay').classList.add('open');
        this.currentEditIndex = -1;
        setTimeout(() => document.getElementById('fName').focus(), 300);
    },

    editAccount(index) {
        const acc = this.accounts[index];
        this.currentEditIndex = index;
        document.getElementById('formTitle').textContent = 'Sửa tài khoản';
        document.getElementById('fName').value = acc.name;
        document.getElementById('fAI').value = acc.ai;
        document.getElementById('fEmail').value = acc.email || '';
        document.getElementById('fStatus').value = acc.status;
        document.getElementById('fTags').value = acc.tags ? acc.tags.join(', ') : '';
        document.getElementById('fUrl').value = acc.url || '';
        document.getElementById('fProfile').value = acc.profile || '';
        document.getElementById('fChromePath').value = acc.chromePath || '';
        document.getElementById('fNote').value = acc.note || '';
        document.getElementById('fBrowser').value = acc.browser || 'chrome';
        document.getElementById('formOverlay').classList.add('open');
    },

    saveAccount() {
        const name = document.getElementById('fName').value.trim();
        if (!name) {
            this.showToast('Tên tài khoản không được để trống', 'err');
            document.getElementById('fName').focus();
            return;
        }

        const existing = this.currentEditIndex >= 0 ? this.accounts[this.currentEditIndex] : {};

        const account = {
            id: existing.id || Date.now().toString(),
            name,
            ai:          document.getElementById('fAI').value,
            email:       document.getElementById('fEmail').value.trim(),
            status:      document.getElementById('fStatus').value,
            tags:        document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean),
            url:         document.getElementById('fUrl').value.trim(),
            profile:     document.getElementById('fProfile').value.trim(),
            chromePath:  document.getElementById('fChromePath').value.trim(),
            note:        document.getElementById('fNote').value.trim(),
            browser:     document.getElementById('fBrowser').value,
            lastUsed:    existing.lastUsed || null,
            createdAt:   existing.createdAt || new Date().toISOString(),
            resetAt:     existing.resetAt || null,
        };

        if (this.currentEditIndex >= 0) {
            this.accounts[this.currentEditIndex] = account;
            this.showToast('Đã cập nhật tài khoản');
        } else {
            this.accounts.push(account);
            this.showToast('Đã thêm tài khoản mới');
        }

        this.saveData();
        this.closeForm();
        this.render();
    },

    deleteAccount(index) {
        this.pendingDeleteIndex = index;
        const acc = this.accounts[index];
        document.getElementById('deleteAccName').textContent = acc.name;
        document.getElementById('deleteOverlay').classList.add('open');
    },

    confirmDelete() {
        if (this.pendingDeleteIndex < 0) return;
        const name = this.accounts[this.pendingDeleteIndex].name;
        this.accounts.splice(this.pendingDeleteIndex, 1);
        this.pendingDeleteIndex = -1;
        this.saveData();
        this.render();
        this.closeOverlay('deleteOverlay');
        this.showToast(`Đã xóa "${name}"`);
    },

    closeForm() {
        document.getElementById('formOverlay').classList.remove('open');
    },

    // ====================== OPEN CHAT ======================
    openChat(index) {
        const acc = this.accounts[index];
        acc.lastUsed = new Date().toISOString();
        this.saveData();

        const url = acc.url || this.getDefaultURL(acc.ai);
        this.pendingOpenURL = url;
        this.pendingOpenAcc = acc;
        this.pendingOpenIndex = index;

        if (this.settings.alwaysAsk) {
            this.showOpenOptions(acc, url, index);
        } else if (this.settings.defaultOpenMode === 'chrome') {
            this.openWithBrowserCmd(acc, url);
        } else {
            window.open(url, '_blank');
            this.render();
        }
    },

    showOpenOptions(acc, url, index) {
        document.getElementById('openTitle').textContent = `Mở ${acc.name}`;
        document.getElementById('openSub').textContent = url;

        const list = document.getElementById('openOptionList');
        const hasProfile = !!acc.profile;
        const browser = acc.browser || 'chrome';
        const browserName = browser === 'edge' ? 'Edge' : browser === 'firefox' ? 'Firefox' : browser === 'brave' ? 'Brave' : 'Chrome';

        list.innerHTML = `
            <div class="open-opt" onclick="App.doOpenDirect('${url}')">
                <div class="open-opt-icon" style="background:var(--blue-light);">
                    <i class="ti ti-external-link" style="color:var(--blue);font-size:18px;"></i>
                </div>
                <div style="flex:1">
                    <div class="open-opt-title">Mở tab mới</div>
                    <div class="open-opt-sub">Dùng trình duyệt hiện tại</div>
                </div>
                <i class="ti ti-chevron-right open-opt-arrow"></i>
            </div>
            <div class="open-opt" onclick="App.doOpenBrowser()">
                <div class="open-opt-icon" style="background:#FFF3E0;">
                    <i class="ti ti-brand-${browser === 'edge' ? 'edge' : browser === 'firefox' ? 'firefox' : 'chrome'}" style="color:#FF6F00;font-size:18px;"></i>
                </div>
                <div style="flex:1">
                    <div class="open-opt-title">${browserName} + Profile</div>
                    <div class="open-opt-sub">${hasProfile ? `Profile: ${acc.profile}` : 'Chưa cấu hình profile'}</div>
                </div>
                <i class="ti ti-chevron-right open-opt-arrow"></i>
            </div>
        `;

        const toggle = document.getElementById('alwaysAskToggle');
        toggle.classList.toggle('on', this.settings.alwaysAsk);

        document.getElementById('openOverlay').classList.add('open');
        this.render();
    },

    doOpenDirect(url) {
        window.open(url, '_blank');
        this.closeOpen();
    },

    doOpenBrowser() {
        this.closeOpen();
        const acc = this.pendingOpenAcc;
        const url = this.pendingOpenURL;
        if (acc) this.openWithBrowserCmd(acc, url);
    },

    openWithBrowserCmd(acc, url) {
        const profile = acc.profile || 'Default';
        const browser = acc.browser || 'chrome';

        // Linux/macOS commands
        let linuxCmd, winCmd;

        if (browser === 'edge') {
            const edgePath = acc.chromePath || 'microsoft-edge';
            const edgeWin = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
            linuxCmd = `${edgePath} --profile-directory="${profile}" "${url}"`;
            winCmd   = `${acc.chromePath || edgeWin} --profile-directory="${profile}" "${url}"`;
        } else if (browser === 'firefox') {
            linuxCmd = `firefox -P "${profile}" "${url}"`;
            winCmd   = `"C:\\Program Files\\Mozilla Firefox\\firefox.exe" -P "${profile}" "${url}"`;
        } else if (browser === 'brave') {
            const bravePath = acc.chromePath || 'brave-browser';
            const braveWin = '"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"';
            linuxCmd = `${bravePath} --profile-directory="${profile}" "${url}"`;
            winCmd   = `${acc.chromePath || braveWin} --profile-directory="${profile}" "${url}"`;
        } else {
            // Chrome (default)
            const chromePath = acc.chromePath || this.settings.chromePath || 'google-chrome';
            const chromeWin  = acc.chromePath || this.settings.chromePathWin;
            linuxCmd = `${chromePath} --profile-directory="${profile}" "${url}"`;
            winCmd   = `${chromeWin} --profile-directory="${profile}" "${url}"`;
        }

        document.getElementById('cmdLinuxText').textContent = linuxCmd;
        document.getElementById('cmdWinText').textContent = winCmd;
        document.getElementById('cmdInfo').innerHTML =
            `<i class="ti ti-link"></i> <strong>${url}</strong>` +
            (acc.profile ? `<br><i class="ti ti-${browser}"></i> Profile: <strong>${acc.profile}</strong>` : '');
        document.getElementById('cmdOverlay').classList.add('open');
    },

    directOpenFromCmd() {
        const url = this.pendingOpenURL;
        if (url) window.open(url, '_blank');
        this.closeOverlay('cmdOverlay');
    },

    copyCmd(id) {
        const text = document.getElementById(id).textContent;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Đã copy lệnh!');
        }).catch(() => {
            const el = document.getElementById(id);
            const range = document.createRange();
            range.selectNode(el);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
            this.showToast('Đã copy lệnh!');
        });
    },

    closeOverlay(id) {
        document.getElementById(id).classList.remove('open');
    },

    closeOpen() {
        this.closeOverlay('openOverlay');
    },

    // ====================== TOGGLES ======================
    toggleAlwaysAsk() {
        this.settings.alwaysAsk = !this.settings.alwaysAsk;
        this.saveData();
        document.getElementById('alwaysAskToggle').classList.toggle('on', this.settings.alwaysAsk);
        document.getElementById('settingsAlwaysAsk').classList.toggle('on', this.settings.alwaysAsk);
    },

    toggleSettingsAlwaysAsk() {
        this.settings.alwaysAsk = !this.settings.alwaysAsk;
        this.saveData();
        document.getElementById('settingsAlwaysAsk').classList.toggle('on', this.settings.alwaysAsk);
        document.getElementById('alwaysAskToggle').classList.toggle('on', this.settings.alwaysAsk);
    },

    saveDefaultMode() {
        this.settings.defaultOpenMode = document.getElementById('defaultOpenMode').value;
        this.saveData();
    },

    toggleTokenVisibility() {
        const input = document.getElementById('sGistToken');
        const icon = document.getElementById('tokenEyeIcon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'ti ti-eye-off';
        } else {
            input.type = 'password';
            icon.className = 'ti ti-eye';
        }
    },

    // ====================== SETTINGS ======================
    openSettings() {
        document.getElementById('sGistToken').value = this.settings.gistToken || '';
        document.getElementById('sGistId').value = this.settings.gistId || '';
        document.getElementById('sChromePath').value = this.settings.chromePath || 'google-chrome';
        document.getElementById('sChromePathWin').value = this.settings.chromePathWin || '';
        document.getElementById('defaultOpenMode').value = this.settings.defaultOpenMode || 'direct';
        document.getElementById('settingsAlwaysAsk').classList.toggle('on', this.settings.alwaysAsk);
        document.getElementById('gistStatus').textContent = '';
        document.getElementById('gistStatus').className = 'gist-status';
        document.getElementById('sGistToken').type = 'password';
        document.getElementById('tokenEyeIcon').className = 'ti ti-eye';
        document.getElementById('settingsOverlay').classList.add('open');
    },

    saveSettings() {
        this.settings.gistToken = document.getElementById('sGistToken').value.trim();
        this.settings.gistId = document.getElementById('sGistId').value.trim();
        this.settings.chromePath = document.getElementById('sChromePath').value.trim() || 'google-chrome';
        this.settings.chromePathWin = document.getElementById('sChromePathWin').value.trim();
        this.settings.defaultOpenMode = document.getElementById('defaultOpenMode').value;
        this.saveData();
        this.closeOverlay('settingsOverlay');
        this.showToast('Đã lưu cài đặt');
    },

    // ====================== GITHUB GIST ======================
    setGistStatus(msg, type) {
        const el = document.getElementById('gistStatus');
        el.textContent = msg;
        el.className = `gist-status ${type}`;
    },

    async testGistConnection() {
        const token = document.getElementById('sGistToken').value.trim();
        const gistId = document.getElementById('sGistId').value.trim();

        if (!token || !gistId) {
            this.setGistStatus('⚠ Vui lòng nhập Token và Gist ID', 'err');
            return;
        }

        this.setGistStatus('Đang kiểm tra...', 'info');

        try {
            const res = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
            });

            if (res.ok) {
                const data = await res.json();
                this.setGistStatus(`✓ Kết nối thành công! Gist: "${data.description || gistId.slice(0,8)+'...'}"`, 'ok');
            } else if (res.status === 401) {
                this.setGistStatus('✗ Token không hợp lệ hoặc hết hạn', 'err');
            } else if (res.status === 404) {
                this.setGistStatus('✗ Không tìm thấy Gist ID này', 'err');
            } else {
                this.setGistStatus(`✗ Lỗi ${res.status}`, 'err');
            }
        } catch (e) {
            this.setGistStatus('✗ Lỗi kết nối mạng', 'err');
        }
    },

    async syncGist() {
        const { gistToken, gistId } = this.settings;
        if (!gistToken || !gistId) {
            this.showToast('Chưa cấu hình Gist — vào Cài đặt', 'info');
            return;
        }

        const btn = document.getElementById('syncBtn');
        btn.classList.add('syncing');

        try {
            const payload = {
                description: 'AI Account Hub Data',
                files: {
                    'ai-accounts.json': {
                        content: JSON.stringify({ accounts: this.accounts, updatedAt: new Date().toISOString() }, null, 2)
                    }
                }
            };

            const res = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `token ${gistToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                this.showToast('Đã đồng bộ lên Gist thành công');
            } else {
                this.showToast('Lỗi đồng bộ: ' + res.status, 'err');
            }
        } catch (e) {
            this.showToast('Lỗi kết nối', 'err');
        } finally {
            btn.classList.remove('syncing');
        }
    },

    async pullFromGist() {
        const token = document.getElementById('sGistToken').value.trim() || this.settings.gistToken;
        const gistId = document.getElementById('sGistId').value.trim() || this.settings.gistId;

        if (!token || !gistId) {
            this.setGistStatus('⚠ Vui lòng nhập Token và Gist ID', 'err');
            return;
        }

        this.setGistStatus('Đang kéo dữ liệu...', 'info');

        try {
            const res = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
            });

            if (!res.ok) { this.setGistStatus('✗ Không thể tải Gist: ' + res.status, 'err'); return; }

            const gist = await res.json();
            const file = gist.files['ai-accounts.json'];
            if (!file) { this.setGistStatus('✗ Không tìm thấy file ai-accounts.json trong Gist', 'err'); return; }

            const data = JSON.parse(file.content);
            if (data.accounts && Array.isArray(data.accounts)) {
                this.accounts = data.accounts;
                this.saveData();
                this.render();
                this.setGistStatus(`✓ Đã kéo ${data.accounts.length} tài khoản từ Gist`, 'ok');
            } else {
                this.setGistStatus('✗ Dữ liệu Gist không hợp lệ', 'err');
            }
        } catch (e) {
            this.setGistStatus('✗ Lỗi: ' + e.message, 'err');
        }
    },

    // ====================== IMPORT / EXPORT ======================
    exportData() {
        const data = {
            accounts: this.accounts,
            exportedAt: new Date().toISOString(),
            version: 3
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-accounts-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Đã export dữ liệu');
    },

    importData() {
        document.getElementById('importFile').click();
    },

    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.accounts && Array.isArray(data.accounts)) {
                    const count = data.accounts.length;
                    this.accounts = data.accounts;
                    this.saveData();
                    this.render();
                    this.showToast(`Import thành công ${count} tài khoản`);
                    this.closeOverlay('settingsOverlay');
                } else {
                    this.showToast('File không chứa dữ liệu tài khoản hợp lệ', 'err');
                }
            } catch {
                this.showToast('File JSON không hợp lệ', 'err');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    },

    clearAllData() {
        if (confirm('Xóa TOÀN BỘ dữ liệu? Hành động này không thể hoàn tác.')) {
            this.accounts = [];
            this.saveData();
            this.render();
            this.closeOverlay('settingsOverlay');
            this.showToast('Đã xóa toàn bộ dữ liệu');
        }
    },

    // ====================== TOAST ======================
    showToast(message, type = 'ok') {
        const toaster = document.getElementById('toaster');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'ok' ? 'check' : type === 'err' ? 'alert-triangle' : 'info-circle';
        toast.innerHTML = `<i class="ti ti-${icon}"></i> ${message}`;
        toaster.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ====================== SEED DATA ======================
    seedDemoData() {
        if (this.accounts.length > 0) return;
        const now = Date.now();
        this.accounts = [
            {
                id: '1', name: 'ChatGPT - Work', ai: 'ChatGPT', email: 'work@gmail.com',
                status: 'active', tags: ['Coding', 'Research'], profile: 'Profile 1',
                url: '', chromePath: '', browser: 'chrome',
                note: 'Tài khoản Plus, dùng cho công việc',
                lastUsed: new Date(now - 3600000).toISOString(),
                createdAt: new Date().toISOString(), resetAt: null
            },
            {
                id: '2', name: 'Claude - Personal', ai: 'Claude', email: 'personal@gmail.com',
                status: 'active', tags: ['Writing', 'Analysis'], profile: 'Profile 2',
                url: '', chromePath: '', browser: 'edge',
                note: 'Claude Pro subscription',
                lastUsed: new Date(now - 86400000).toISOString(),
                createdAt: new Date().toISOString(), resetAt: null
            },
            {
                id: '3', name: 'Gemini - Backup', ai: 'Gemini', email: 'backup@gmail.com',
                status: 'limited', tags: ['Research', 'Translation'], profile: '',
                url: '', chromePath: '', browser: 'chrome',
                note: 'Rate limited',
                lastUsed: new Date(now - 7200000).toISOString(),
                createdAt: new Date().toISOString(),
                resetAt: new Date(now + 2 * 3600000 + 15 * 60000).toISOString()
            },
            {
                id: '4', name: 'Perplexity Pro', ai: 'Perplexity', email: 'perp@gmail.com',
                status: 'active', tags: ['Research'], profile: 'Profile 3',
                url: '', chromePath: '', browser: 'chrome',
                note: 'Dùng cho tìm kiếm chuyên sâu',
                lastUsed: null, createdAt: new Date().toISOString(), resetAt: null
            },
            {
                id: '5', name: 'DeepSeek - Free', ai: 'DeepSeek', email: '',
                status: 'active', tags: ['Coding'], profile: '',
                url: '', chromePath: '', browser: 'chrome',
                note: 'Free tier, giới hạn 50 msg/ngày',
                lastUsed: new Date(now - 172800000).toISOString(),
                createdAt: new Date().toISOString(), resetAt: null
            },
        ];
        this.saveData();
    },

    // ====================== INIT ======================
    init() {
        this.loadData();
        this.seedDemoData();
        this.checkAutoReset();
        this.render();
        this.startCountdownTimer();

        // Re-check khi tab focus lại
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.checkAutoReset();
        });

        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('open');
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
                document.getElementById('searchInput').select();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openAdd();
            }
        });

        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }

        console.log('%c🤖 AI Account Hub v3 ready', 'color:#185FA5;font-weight:700;font-size:14px');
        console.log('%cShortcuts: Ctrl+K (search) · Ctrl+N (add) · Esc (close)', 'color:#888;font-size:11px');
    }
};

window.onload = () => App.init();
