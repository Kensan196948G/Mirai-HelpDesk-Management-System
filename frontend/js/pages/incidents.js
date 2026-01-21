/**
 * Mirai HelpDesk - Incidents Page
 *
 * Incident management with three views:
 * 1. List view - All incidents
 * 2. Priority view - P1-P4 tabs
 * 3. SLA view - SLA monitoring and overdue alerts
 */

const IncidentsPage = {
    currentPage: 1,
    pageSize: 20,
    filters: { type: 'incident' },
    currentView: 'list', // 'list', 'priority', 'sla'

    priorityLabels: {
        'p1': 'P1 - 緊急',
        'p2': 'P2 - 高',
        'p3': 'P3 - 中',
        'p4': 'P4 - 低',
    },

    priorityColors: {
        'p1': 'error',
        'p2': 'warning',
        'p3': 'info',
        'p4': 'success',
    },

    statusLabels: {
        'new': '新規',
        'triage': 'トリアージ',
        'assigned': 'アサイン済',
        'in_progress': '対応中',
        'pending_customer': '利用者回答待ち',
        'resolved': '解決済',
        'closed': 'クローズ',
    },

    statusColors: {
        'new': 'error',
        'triage': 'warning',
        'assigned': 'info',
        'in_progress': 'primary',
        'pending_customer': 'warning',
        'resolved': 'success',
        'closed': 'secondary',
    },

    async render(options = {}) {
        this.currentView = options.view || 'list';

        if (this.currentView === 'priority') {
            await this.renderPriorityView();
        } else if (this.currentView === 'sla') {
            await this.renderSLAView();
        } else {
            await this.renderListView();
        }
    },

    /**
     * View 1: インシデント一覧
     */
    async renderListView() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'インシデント管理';

        content.innerHTML = `
            <div class="page-header">
                <p class="page-description">障害・不具合の対応を管理します。すべてのインシデントで監査証跡を適切に記録します。</p>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="incident-search" placeholder="インシデントを検索...">
                    </div>
                    <select id="filter-status" class="filter-select">
                        <option value="">すべてのステータス</option>
                        <option value="new">新規</option>
                        <option value="triage">トリアージ</option>
                        <option value="assigned">アサイン済</option>
                        <option value="in_progress">対応中</option>
                        <option value="pending_customer">利用者回答待ち</option>
                        <option value="resolved">解決済</option>
                        <option value="closed">クローズ</option>
                    </select>
                    <select id="filter-priority" class="filter-select">
                        <option value="">すべての優先度</option>
                        <option value="p1">P1 - 緊急</option>
                        <option value="p2">P2 - 高</option>
                        <option value="p3">P3 - 中</option>
                        <option value="p4">P4 - 低</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                    <button id="create-incident-btn" class="btn btn-primary">
                        <i class="lucide-plus"></i><span>新規インシデント</span>
                    </button>
                </div>
            </div>

            <!-- Stats -->
            <div class="stats-grid" style="margin-bottom: var(--spacing-lg);">
                <div class="stat-card">
                    <div class="stat-icon error">
                        <i class="lucide-alert-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="p1-count">-</div>
                        <div class="stat-label">P1 緊急</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="lucide-alert-triangle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="p2-count">-</div>
                        <div class="stat-label">P2 高</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="lucide-list"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="active-count">-</div>
                        <div class="stat-label">対応中</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="lucide-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="resolved-today">-</div>
                        <div class="stat-label">本日解決</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div id="incidents-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        // Event listeners
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value || undefined;
            this.loadIncidents();
        });
        document.getElementById('filter-priority').addEventListener('change', (e) => {
            this.filters.priority = e.target.value || undefined;
            this.loadIncidents();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadIncidents());
        document.getElementById('create-incident-btn').addEventListener('click', () => this.showCreateModal());

        // Load data
        await this.loadIncidents();
        await this.loadStats();
    },

    /**
     * View 2: 優先度別表示（タブ）
     */
    async renderPriorityView() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'インシデント - 優先度別';

        content.innerHTML = `
            <div class="page-header">
                <p class="page-description">優先度ごとにインシデントを分類表示します。P1/P2は即時対応が必要です。</p>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="tab-group">
                        <button class="tab-btn active" data-priority="p1">
                            <i class="lucide-alert-circle"></i> P1 緊急
                        </button>
                        <button class="tab-btn" data-priority="p2">
                            <i class="lucide-alert-triangle"></i> P2 高
                        </button>
                        <button class="tab-btn" data-priority="p3">
                            <i class="lucide-info"></i> P3 中
                        </button>
                        <button class="tab-btn" data-priority="p4">
                            <i class="lucide-check"></i> P4 低
                        </button>
                    </div>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>

            <div class="card">
                <div id="priority-content"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filters.priority = btn.dataset.priority;
                this.loadIncidents();
            });
        });

        document.getElementById('refresh-btn').addEventListener('click', () => this.loadIncidents());

        // Load P1 by default
        this.filters.priority = 'p1';
        await this.loadIncidents();
    },

    /**
     * View 3: SLA状況監視
     */
    async renderSLAView() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'インシデント - SLA状況';

        content.innerHTML = `
            <div class="page-header">
                <p class="page-description">SLA期限の監視とアラート表示。期限超過のチケットには即時対応が必要です。</p>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="filter-sla" class="filter-select">
                        <option value="overdue">期限超過</option>
                        <option value="warning">期限間近（24h以内）</option>
                        <option value="all">すべて</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>

            <!-- SLA Stats -->
            <div class="stats-grid" style="margin-bottom: var(--spacing-lg);">
                <div class="stat-card">
                    <div class="stat-icon error">
                        <i class="lucide-x-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="overdue-count">-</div>
                        <div class="stat-label">期限超過</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="lucide-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="warning-count">-</div>
                        <div class="stat-label">期限間近</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="lucide-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="ontime-count">-</div>
                        <div class="stat-label">期限内</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info">
                        <i class="lucide-trending-up"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="sla-rate">-</div>
                        <div class="stat-label">SLA達成率</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div id="sla-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        // Event listeners
        document.getElementById('filter-sla').addEventListener('change', (e) => {
            this.filters.slaFilter = e.target.value;
            this.loadSLAData();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadSLAData());

        // Load data
        this.filters.slaFilter = 'overdue';
        await this.loadSLAData();
    },

    /**
     * Load incidents list
     */
    async loadIncidents() {
        const container = document.getElementById('incidents-list') || document.getElementById('priority-content');
        if (!container) return;

        try {
            const data = await API.getTickets({
                page: this.currentPage,
                page_size: this.pageSize,
                ...this.filters
            });
            this.renderIncidents(data, container);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>エラー: ${error.message}</p></div>`;
        }
    },

    /**
     * Render incidents table
     */
    renderIncidents(data, container) {
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-inbox"></i>
                    <h3>インシデントがありません</h3>
                    <p>該当するインシデントが見つかりませんでした</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 60px;">優先度</th>
                        <th>チケット番号</th>
                        <th>件名</th>
                        <th>ステータス</th>
                        <th>担当者</th>
                        <th>作成日時</th>
                        <th>SLA期限</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(incident => `
                        <tr>
                            <td>
                                <span class="badge badge-${this.priorityColors[incident.priority]}">
                                    ${incident.priority.toUpperCase()}
                                </span>
                            </td>
                            <td>
                                <a href="#/tickets/${incident.id}" class="link">${incident.ticket_number}</a>
                            </td>
                            <td>
                                <div class="cell-content">
                                    ${this.truncate(incident.subject, 60)}
                                </div>
                            </td>
                            <td>
                                <span class="badge badge-${this.statusColors[incident.status]}">
                                    ${this.statusLabels[incident.status] || incident.status}
                                </span>
                            </td>
                            <td>${incident.assignee_name || '-'}</td>
                            <td>${this.formatDate(incident.created_at)}</td>
                            <td>${this.formatSLADue(incident.due_at)}</td>
                            <td>
                                <button class="btn btn-ghost btn-sm view-btn" data-id="${incident.id}">
                                    <i class="lucide-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // View buttons
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showIncidentDetail(btn.dataset.id));
        });
    },

    /**
     * Load SLA monitoring data
     */
    async loadSLAData() {
        const container = document.getElementById('sla-list');
        if (!container) return;

        try {
            // Get all incidents with SLA data
            const data = await API.getTickets({
                type: 'incident',
                status: 'new,triage,assigned,in_progress,pending_customer',
                page_size: 100
            });

            const now = new Date();
            const warningThreshold = 24 * 60 * 60 * 1000; // 24 hours

            // Categorize by SLA status
            const categorized = {
                overdue: [],
                warning: [],
                ontime: []
            };

            data.items.forEach(incident => {
                if (!incident.due_at) {
                    categorized.ontime.push(incident);
                    return;
                }

                const dueDate = new Date(incident.due_at);
                const timeRemaining = dueDate - now;

                if (timeRemaining < 0) {
                    categorized.overdue.push(incident);
                } else if (timeRemaining < warningThreshold) {
                    categorized.warning.push(incident);
                } else {
                    categorized.ontime.push(incident);
                }
            });

            // Update stats
            document.getElementById('overdue-count').textContent = categorized.overdue.length;
            document.getElementById('warning-count').textContent = categorized.warning.length;
            document.getElementById('ontime-count').textContent = categorized.ontime.length;

            const total = data.items.length;
            const ontimeRate = total > 0 ? Math.round((categorized.ontime.length / total) * 100) : 0;
            document.getElementById('sla-rate').textContent = `${ontimeRate}%`;

            // Filter and render
            const filterType = this.filters.slaFilter || 'overdue';
            let filtered = [];
            if (filterType === 'all') {
                filtered = [...categorized.overdue, ...categorized.warning, ...categorized.ontime];
            } else {
                filtered = categorized[filterType];
            }

            this.renderSLAList(filtered, container);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>エラー: ${error.message}</p></div>`;
        }
    },

    /**
     * Render SLA list with progress bars
     */
    renderSLAList(incidents, container) {
        if (incidents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-check-circle"></i>
                    <h3>該当するインシデントはありません</h3>
                </div>
            `;
            return;
        }

        const now = new Date();

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>チケット番号</th>
                        <th>件名</th>
                        <th>優先度</th>
                        <th>SLA進捗</th>
                        <th>残り時間</th>
                        <th>期限</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${incidents.map(incident => {
                        const slaInfo = this.calculateSLAProgress(incident.created_at, incident.due_at);
                        return `
                            <tr>
                                <td>
                                    <a href="#/tickets/${incident.id}" class="link">${incident.ticket_number}</a>
                                </td>
                                <td>${this.truncate(incident.subject, 50)}</td>
                                <td>
                                    <span class="badge badge-${this.priorityColors[incident.priority]}">
                                        ${incident.priority.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-fill ${slaInfo.status}" style="width: ${slaInfo.percentage}%"></div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-${slaInfo.badgeColor}">
                                        ${slaInfo.remaining}
                                    </span>
                                </td>
                                <td>${this.formatDate(incident.due_at)}</td>
                                <td>
                                    <button class="btn btn-ghost btn-sm view-btn" data-id="${incident.id}">
                                        <i class="lucide-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        // View buttons
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showIncidentDetail(btn.dataset.id));
        });
    },

    /**
     * Calculate SLA progress
     */
    calculateSLAProgress(createdAt, dueAt) {
        if (!dueAt) {
            return {
                percentage: 0,
                status: 'success',
                remaining: 'N/A',
                badgeColor: 'secondary'
            };
        }

        const now = new Date();
        const created = new Date(createdAt);
        const due = new Date(dueAt);

        const total = due - created;
        const elapsed = now - created;
        const remaining = due - now;

        const percentage = Math.min(Math.max((elapsed / total) * 100, 0), 100);

        let status = 'success';
        let badgeColor = 'success';
        let remainingText = '';

        if (remaining < 0) {
            status = 'error';
            badgeColor = 'error';
            const hours = Math.abs(Math.floor(remaining / (1000 * 60 * 60)));
            remainingText = `${hours}時間超過`;
        } else if (remaining < 24 * 60 * 60 * 1000) {
            status = 'warning';
            badgeColor = 'warning';
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            remainingText = `${hours}時間`;
        } else {
            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            remainingText = `${days}日`;
        }

        return { percentage, status, remaining: remainingText, badgeColor };
    },

    /**
     * Load stats for dashboard
     */
    async loadStats() {
        try {
            // P1 count
            const p1Data = await API.getTickets({
                type: 'incident',
                priority: 'p1',
                status: 'new,triage,assigned,in_progress',
                page_size: 1
            });
            document.getElementById('p1-count').textContent = p1Data.total || 0;

            // P2 count
            const p2Data = await API.getTickets({
                type: 'incident',
                priority: 'p2',
                status: 'new,triage,assigned,in_progress',
                page_size: 1
            });
            document.getElementById('p2-count').textContent = p2Data.total || 0;

            // Active count
            const activeData = await API.getTickets({
                type: 'incident',
                status: 'in_progress',
                page_size: 1
            });
            document.getElementById('active-count').textContent = activeData.total || 0;

            // Resolved today
            const today = new Date().toISOString().split('T')[0];
            const resolvedData = await API.getTickets({
                type: 'incident',
                status: 'resolved',
                resolved_after: today,
                page_size: 1
            });
            document.getElementById('resolved-today').textContent = resolvedData.total || 0;
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },

    /**
     * Show create incident modal
     */
    showCreateModal() {
        Modal.create({
            title: '新規インシデント作成',
            content: `
                <form id="create-incident-form">
                    <div class="form-group">
                        <label>件名 <span class="required">*</span></label>
                        <input type="text" name="subject" required minlength="5" placeholder="インシデントの概要を入力">
                    </div>
                    <div class="form-group">
                        <label>詳細 <span class="required">*</span></label>
                        <textarea name="description" required rows="4" placeholder="障害の詳細、影響範囲、発生時刻など"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>影響度 <span class="required">*</span></label>
                            <select name="impact" required>
                                <option value="">選択してください</option>
                                <option value="1">個人</option>
                                <option value="2">部署</option>
                                <option value="3">全社</option>
                                <option value="4">対外影響</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>緊急度 <span class="required">*</span></label>
                            <select name="urgency" required>
                                <option value="">選択してください</option>
                                <option value="1">低</option>
                                <option value="2">中</option>
                                <option value="3">高</option>
                                <option value="4">即時</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>カテゴリ</label>
                        <select name="category">
                            <option value="network">ネットワーク</option>
                            <option value="server">サーバー</option>
                            <option value="application">アプリケーション</option>
                            <option value="email">メール</option>
                            <option value="account">アカウント</option>
                            <option value="other">その他</option>
                        </select>
                    </div>
                    <div class="alert alert-info">
                        <i class="lucide-info"></i>
                        <span>優先度は影響度と緊急度から自動計算されます</span>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="create-incident-form" class="btn btn-primary">作成</button>
            `,
        });

        document.getElementById('create-incident-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.createTicket({
                    type: 'incident',
                    category: fd.get('category'),
                    subject: fd.get('subject'),
                    description: fd.get('description'),
                    impact: parseInt(fd.get('impact')),
                    urgency: parseInt(fd.get('urgency')),
                });
                Modal.hide();
                Toast.success('インシデントを作成しました');
                this.loadIncidents();
                if (this.currentView === 'list') {
                    this.loadStats();
                }
            } catch (err) {
                Toast.error(err.message || 'インシデントの作成に失敗しました');
            }
        });
    },

    /**
     * Show incident detail modal
     */
    async showIncidentDetail(id) {
        try {
            const incident = await API.getTicket(id);
            Modal.create({
                title: incident.ticket_number,
                content: `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>優先度</label>
                            <span class="badge badge-${this.priorityColors[incident.priority]}">
                                ${this.priorityLabels[incident.priority]}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>ステータス</label>
                            <span class="badge badge-${this.statusColors[incident.status]}">
                                ${this.statusLabels[incident.status]}
                            </span>
                        </div>
                        <div class="detail-item full-width">
                            <label>件名</label>
                            <p>${incident.subject}</p>
                        </div>
                        <div class="detail-item full-width">
                            <label>詳細</label>
                            <p>${incident.description || '-'}</p>
                        </div>
                        <div class="detail-item">
                            <label>作成日時</label>
                            <span>${this.formatDate(incident.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <label>担当者</label>
                            <span>${incident.assignee_name || '未割当'}</span>
                        </div>
                        ${incident.resolved_at ? `
                            <div class="detail-item">
                                <label>解決日時</label>
                                <span>${this.formatDate(incident.resolved_at)}</span>
                            </div>
                        ` : ''}
                    </div>
                `,
                size: 'large',
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.hide()">閉じる</button>
                    <a href="#/tickets/${incident.id}" class="btn btn-primary" onclick="Modal.hide()">詳細を見る</a>
                `
            });
        } catch (err) {
            Toast.error(err.message || 'インシデントの取得に失敗しました');
        }
    },

    /**
     * Utility: Truncate string
     */
    truncate(str, maxLength) {
        if (!str) return '-';
        return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
    },

    /**
     * Utility: Format date
     */
    formatDate(isoString) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    },

    /**
     * Utility: Format SLA due date with color
     */
    formatSLADue(isoString) {
        if (!isoString) return '-';
        const due = new Date(isoString);
        const now = new Date();
        const remaining = due - now;

        const formatted = this.formatDate(isoString);

        if (remaining < 0) {
            return `<span style="color: var(--color-error); font-weight: 500;">${formatted}</span>`;
        } else if (remaining < 24 * 60 * 60 * 1000) {
            return `<span style="color: var(--color-warning); font-weight: 500;">${formatted}</span>`;
        }

        return formatted;
    },
};

window.IncidentsPage = IncidentsPage;
