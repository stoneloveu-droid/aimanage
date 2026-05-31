<script>
// ====================== AI ACCOUNT HUB - app.js ======================

const App = {
    accounts: [],
    settings: {
        alwaysAsk: true,
        defaultOpenMode: 'chrome', // 'direct' or 'chrome'
        chromePath: 'google-chrome',
        chromePathWin: '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
        gistToken: '',
        gistId: ''
    },

    // ====================== DATA ======================
    loadData() {
        const savedAccounts = localStorage.getItem('aiAccounts');
        if (savedAccounts) this.accounts = JSON.parse(savedAccounts);

        const savedSettings = localStorage.getItem('aiSettings');
        if (savedSettings) this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    },

    saveData() {
        localStorage.setItem('aiAccounts', JSON.stringify(this.accounts));
        localStorage.setItem('aiSettings', JSON.stringify(this.settings));
    },

    // ====================== RENDER ======================
    render() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('filterStatus').value;
        const tagFilter = document.getElementById('filterTag').value;

        let filtered = this.accounts.filter(acc => {
            const matchSearch = 
                acc.name.toLowerCase().includes(searchTerm) ||
                (acc.email && acc.email.toLowerCase().includes(searchTerm)) ||
                (acc.note && acc.note.toLowerCase().includes(searchTerm));

            const matchStatus = !statusFilter || acc.status === statusFilter;
            const matchTag = !tagFilter || (acc.tags && acc.tags.includes(tagFilter));

            return matchSearch && matchStatus && matchTag;
        });

        // Render stats
        this.renderStats(filtered.length);

        // Render AI chips
        this.renderAIChips();

        // Render cards
        const container = document.getElementById('cardsList');
        container.innerHTML = '';

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty">
                    <i class="ti ti-robot"></i>
                    <p>Không tìm thấy tài khoản nào</p>
                </div>`;
            return;
        }

        filtered.forEach((acc, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-top">
                    <div class="ai-icon" style="background: ${this.getAIColor(acc.ai)}">
                        ${this.getAIIcon(acc.ai)}
                    </div>
                    <div class="card-info">
                        <div class="card-name">${acc.name}</div>
                        <div class="card-type">${acc.ai}</div>
                    </div>
                    <div class="card-btns">
                        <button class="btn btn-sm" onclick="App.editAccount(${index})">
                            <i class="ti ti-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="App.deleteAccount(${index})">
                            <i class="ti ti-trash"></i>
                        </button>
                    </div>
                </div>

                ${acc.email ? `<div class="card-email"><i class="ti ti-mail"></i> ${acc.email}</div>` : ''}

                <div class="card-meta">
                    <span class="sbadge s-${acc.status}">
                        <span class="sdot"></span> ${this.getStatusText(acc.status)}
                    </span>
                </div>

                ${acc.tags && acc.tags.length ? `
                    <div class="tags">
                        ${acc.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>` : ''}

                ${acc.note ? `<div class="card-note">${acc.note}</div>` : ''}

                <div class="card-foot">
                    <div class="card-time">
                        <i class="ti ti-clock"></i> ${acc.lastUsed ? this.timeAgo(acc.lastUsed) : 'Chưa dùng'}
                    </div>
                    <button class="btn btn-open" onclick="App.openChat(${index})">
                        <i class="ti ti-external-link"></i> Mở Chat
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        document.getElementById('resultLabel').textContent = 
            `Hiển thị ${filtered.length} / ${this.accounts.length} tài khoản`;
    },

    renderStats(total) {
        const active = this.accounts.filter(a => a.status === 'active').length;
        document.getElementById('statsRow').innerHTML = `
            <div class="stat-card">
                <div class="stat-n">${total}</div>
                <div class="stat-l">Tổng tài khoản</div>
            </div>
            <div class="stat-card">
                <div class="stat-n">${active}</div>
                <div class="stat-l">Đang Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-n">${this.accounts.length - active}</div>
                <div class="stat-l">Cần chú ý</div>
            </div>
            <div class="stat-card">
                <div class="stat-n">${this.getTotalTags()}</div>
                <div class="stat-l">Tags</div>
            </div>
        `;
    },

    renderAIChips() {
        const container = document.getElementById('aiChips');
        const ais = [...new Set(this.accounts.map(a => a.ai))];
        
        let html = `<div class="chip ${!document.getElementById('filterAI') ? 'active' : ''}" onclick="App.filterByAI('')">Tất cả</div>`;
        
        ais.forEach(ai => {
            html += `<div class="chip" onclick="App.filterByAI('${ai}')">${ai}</div>`;
        });
        container.innerHTML = html;
    },

    getAIColor(ai) {
        const colors = {
            'ChatGPT': '#10A37F',
            'Claude': '#D97757',
            'Gemini': '#8B5CF6',
            'Grok': '#000000',
            'Perplexity': '#10B981',
            'DeepSeek': '#3B82F6'
        };
        return colors[ai] || '#185FA5';
    },

    getAIIcon(ai) {
        const icons = {
            'ChatGPT': '🌟',
            'Claude': '🧠',
            'Gemini': '✨',
            'Grok': '🚀',
            'Perplexity': '🔍',
            'DeepSeek': '🐋'
        };
        return icons[ai] || '🤖';
    },

    getStatusText(status) {
        const texts = {
            active: 'Active',
            limited: 'Rate Limited',
            expired: 'Hết hạn',
            banned: 'Banned'
        };
        return texts[status] || status;
    },

    timeAgo(timestamp) {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        return `${Math.floor(minutes/60)} giờ trước`;
    },

    getTotalTags() {
        const allTags = this.accounts.flatMap(a => a.tags || []);
        return new Set(allTags).size;
    },

    // ====================== CRUD ======================
    openAdd() {
        document.getElementById('formTitle').textContent = 'Thêm tài khoản mới';
        document.getElementById('fName').value = '';
        document.getElementById('fAI').value = 'ChatGPT';
        document.getElementById('fEmail').value = '';
        document.getElementById('fStatus').value = 'active';
        document.getElementById('fTags').value = '';
        document.getElementById('fUrl').value = '';
        document.getElementById('fProfile').value = '';
        document.getElementById('fChromePath').value = '';
        document.getElementById('fNote').value = '';

        document.getElementById('formOverlay').classList.add('open');
        this.currentEditIndex = -1;
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

        document.getElementById('formOverlay').classList.add('open');
    },

    saveAccount() {
        const account = {
            name: document.getElementById('fName').value.trim(),
            ai: document.getElementById('fAI').value,
            email: document.getElementById('fEmail').value.trim(),
            status: document.getElementById('fStatus').value,
            tags: document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(t => t),
            url: document.getElementById('fUrl').value.trim(),
            profile: document.getElementById('fProfile').value.trim(),
            chromePath: document.getElementById('fChromePath').value.trim(),
            note: document.getElementById('fNote').value.trim(),
            lastUsed: this.accounts[this.currentEditIndex]?.lastUsed || null
        };

        if (!account.name) {
            this.showToast('Tên tài khoản không được để trống', 'err');
            return;
        }

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
        if (confirm('Bạn có chắc muốn xóa tài khoản này?')) {
            this.accounts.splice(index, 1);
            this.saveData();
            this.render();
            this.showToast('Đã xóa tài khoản');
        }
    },

    closeForm() {
        document.getElementById('formOverlay').classList.remove('open');
    },

    // ====================== OPEN CHAT ======================
    openChat(index) {
        const acc = this.accounts[index];
        acc.lastUsed = new Date().toISOString();
        this.saveData();
        this.render();

        const url = acc.url || this.getDefaultURL(acc.ai);

        if (this.settings.alwaysAsk) {
            this.showOpenOptions(acc, url, index);
        } else if (this.settings.defaultOpenMode === 'chrome') {
            this.openWithChrome(acc, url);
        } else {
            window.open(url, '_blank');
        }
    },

    getDefaultURL(ai) {
        const urls = {
            'ChatGPT': 'https://chatgpt.com',
            'Claude': 'https://claude.ai',
            'Gemini': 'https://gemini.google.com',
            'Grok': 'https://grok.x.ai',
            'Perplexity': 'https://www.perplexity.ai',
            'DeepSeek': 'https://chat.deepseek.com'
        };
        return urls[ai] || 'https://chatgpt.com';
    },

    showOpenOptions(acc, url, index) {
        // Logic mở sheet chọn cách mở sẽ được mở rộng sau nếu cần
        // Hiện tại ưu tiên mở Chrome nếu có profile
        if (acc.profile) {
            this.openWithChrome(acc, url);
        } else {
            window.open(url, '_blank');
        }
    },

    openWithChrome(acc, url) {
        const profile = acc.profile || 'Default';
        const chromePath = acc.chromePath || this.settings.chromePath;

        let command = '';
        if (navigator.userAgent.includes('Win')) {
            command = `${this.settings.chromePathWin} --profile-directory="${profile}" "${url}"`;
        } else {
            command = `${chromePath} --profile-directory="${profile}" "${url}"`;
        }

        this.showCommand(command, url);
    },

    showCommand(command, url) {
        document.getElementById('cmdLinuxText').textContent = command;
        document.getElementById('cmdWinText').textContent = command;
        document.getElementById('cmdInfo').innerHTML = `Đang mở: <strong>${url}</strong>`;
        document.getElementById('cmdOverlay').classList.add('open');
    },

    directOpenFromCmd() {
        const url = document.getElementById('cmdInfo').textContent.split(': ')[1];
        if (url) window.open(url, '_blank');
        this.closeOverlay('cmdOverlay');
    },

    copyCmd(id) {
        const text = document.getElementById(id).textContent;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Đã copy lệnh!', 'ok');
        });
    },

    closeOverlay(id) {
        document.getElementById(id).classList.remove('open');
    },

    closeOpen() {
        this.closeOverlay('openOverlay');
    },

    // ====================== SETTINGS ======================
    openSettings() {
        document.getElementById('sGistToken').value = this.settings.gistToken || '';
        document.getElementById('sGistId').value = this.settings.gistId || '';
        document.getElementById('sChromePath').value = this.settings.chromePath;
        document.getElementById('sChromePathWin').value = this.settings.chromePathWin;
        document.getElementById('defaultOpenMode').value = this.settings.defaultOpenMode;

        document.getElementById('settingsOverlay').classList.add('open');
    },

    saveSettings() {
        this.settings.gistToken = document.getElementById('sGistToken').value.trim();
        this.settings.gistId = document.getElementById('sGistId').value.trim();
        this.settings.chromePath = document.getElementById('sChromePath').value.trim();
        this.settings.chromePathWin = document.getElementById('sChromePathWin').value.trim();
        this.settings.defaultOpenMode = document.getElementById('defaultOpenMode').value;

        this.saveData();
        this.closeOverlay('settingsOverlay');
        this.showToast('Đã lưu cài đặt');
    },

    // ====================== UTILITIES ======================
    showToast(message, type = 'ok') {
        const toaster = document.getElementById('toaster');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="ti ti-${type === 'ok' ? 'check' : type === 'err' ? 'alert-triangle' : 'info-circle'}"></i>
            ${message}
        `;
        toaster.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    exportData() {
        const data = { accounts: this.accounts, settings: this.settings, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-accounts-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        this.showToast('Đã export dữ liệu');
    },

    importData() {
        document.getElementById('importFile').click();
    },

    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.accounts) {
                    this.accounts = data.accounts;
                    this.saveData();
                    this.render();
                    this.showToast('Import thành công!', 'ok');
                }
            } catch (err) {
                this.showToast('File không hợp lệ', 'err');
            }
        };
        reader.readAsText(file);
    },

    // Khởi tạo
    init() {
        this.loadData();
        this.render();

        // Close overlays when click outside (optional)
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('open');
            });
        });

        console.log('%cAI Account Hub đã sẵn sàng!', 'color: #185FA5; font-weight: bold');
    }
};

// Khởi chạy
window.onload = () => App.init();

</script>