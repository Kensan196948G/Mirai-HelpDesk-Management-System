/**
 * Mirai HelpDesk - Service Requests Page
 *
 * Service request management with three views:
 * 1. List view - All service requests
 * 2. Standard view - Standard request templates
 * 3. Approvals view - Approval workflow management
 */

const ServiceRequestsPage = {
    currentPage: 1,
    pageSize: 20,
    filters: { type: 'service_request' },
    currentView: 'list', // 'list', 'standard', 'approvals'

    statusLabels: {
        'new': '新規',
        'triage': 'トリアージ',
        'assigned': 'アサイン済',
        'in_progress': '対応中',
        'pending_approval': '承認待ち',
        'pending_customer': '利用者回答待ち',
        'pending_change_window': '実施待ち',
        'resolved': '解決済',
        'closed': 'クローズ',
    },

    statusColors: {
        'new': 'info',
        'triage': 'warning',
        'assigned': 'primary',
        'in_progress': 'primary',
        'pending_approval': 'warning',
        'pending_customer': 'warning',
        'pending_change_window': 'info',
        'resolved': 'success',
        'closed': 'secondary',
    },

    // Standard request templates
    standardTemplates: [
        {
            id: 'new-user-account',
            icon: 'user-plus',
            title: '新規ユーザーアカウント作成',
            description: '新入社員または異動者向けのアカウント作成申請',
            category: 'account',
            requiresApproval: true,
            estimatedDays: 2,
            fields: ['full_name', 'department', 'position', 'start_date', 'manager']
        },
        {
            id: 'license-assignment',
            icon: 'key',
            title: 'Microsoft 365 ライセンス付与',
            description: 'Office 365、Teams等のライセンス付与申請',
            category: 'license',
            requiresApproval: true,
            estimatedDays: 1,
            fields: ['target_user', 'license_type', 'business_reason']
        },
        {
            id: 'mailbox-permission',
            icon: 'mail',
            title: 'メールボックス権限設定',
            description: '共有メールボックスへのアクセス権限付与',
            category: 'email',
            requiresApproval: true,
            estimatedDays: 1,
            fields: ['target_mailbox', 'target_user', 'permission_type']
        },
        {
            id: 'group-membership',
            icon: 'users',
            title: 'グループメンバーシップ変更',
            description: 'セキュリティグループ、配布リストへの追加/削除',
            category: 'group',
            requiresApproval: true,
            estimatedDays: 1,
            fields: ['group_name', 'target_user', 'action']
        },
        {
            id: 'password-reset',
            icon: 'lock',
            title: 'パスワードリセット',
            description: 'ユーザーアカウントのパスワード初期化',
            category: 'account',
            requiresApproval: false,
            estimatedDays: 0.5,
            fields: ['target_user', 'reason']
        },
        {
            id: 'teams-creation',
            icon: 'message-square',
            title: 'Teams チーム作成',
            description: '新規プロジェクトや部門向けTeamsチーム作成',
            category: 'teams',
            requiresApproval: true,
            estimatedDays: 1,
            fields: ['team_name', 'description', 'privacy', 'owners']
        },
        {
            id: 'onedrive-restore',
            icon: 'cloud',
            title: 'OneDrive ファイル復元',
            description: '削除されたファイル・フォルダの復元申請',
            category: 'onedrive',
            requiresApproval: false,
            estimatedDays: 1,
            fields: ['target_user', 'file_path', 'deletion_date']
        },
        {
            id: 'user-offboarding',
            icon: 'user-x',
            title: '退職者アカウント処理',
            description: '退職者のアカウント無効化とデータ保持処理',
            category: 'account',
            requiresApproval: true,
            estimatedDays: 3,
            fields: ['target_user', 'last_day', 'mail_forward', 'data_retention']
        },
    ],

    async render(options = {}) {
        this.currentView = options.view || 'list';

        if (this.currentView === 'standard') {
            await this.renderStandardView();
        } else if (this.currentView === 'approvals') {
            // Redirect to M365 Approvals page
            Router.navigate('/service-requests/approvals');
            await M365ApprovalsPage.render();
        } else {
            await this.renderListView();
        }
    },

    /**
     * View 1: サービス要求一覧
     */
    async renderListView() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'サービス要求管理';

        content.innerHTML = `
            <div class="page-header">
                <p class="page-description">アカウント、権限、PC、ソフトウェア、M365設定の依頼を管理します。承認ワークフローとSOD原則を遵守します。</p>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="request-search" placeholder="サービス要求を検索...">
                    </div>
                    <select id="filter-status" class="filter-select">
                        <option value="">すべてのステータス</option>
                        <option value="new">新規</option>
                        <option value="pending_approval">承認待ち</option>
                        <option value="in_progress">対応中</option>
                        <option value="pending_change_window">実施待ち</option>
                        <option value="resolved">解決済</option>
                        <option value="closed">クローズ</option>
                    </select>
                    <select id="filter-category" class="filter-select">
                        <option value="">すべてのカテゴリ</option>
                        <option value="account">アカウント</option>
                        <option value="license">ライセンス</option>
                        <option value="email">メール</option>
                        <option value="group">グループ</option>
                        <option value="teams">Teams</option>
                        <option value="onedrive">OneDrive</option>
                        <option value="other">その他</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                    <button id="create-request-btn" class="btn btn-primary">
                        <i class="lucide-plus"></i><span>新規サービス要求</span>
                    </button>
                </div>
            </div>

            <!-- Stats -->
            <div class="stats-grid" style="margin-bottom: var(--spacing-lg);">
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="lucide-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="pending-approval-count">-</div>
                        <div class="stat-label">承認待ち</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="lucide-list"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="in-progress-count">-</div>
                        <div class="stat-label">対応中</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info">
                        <i class="lucide-calendar"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="scheduled-count">-</div>
                        <div class="stat-label">実施待ち</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="lucide-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="completed-today">-</div>
                        <div class="stat-label">本日完了</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div id="requests-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        // Event listeners
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value || undefined;
            this.loadRequests();
        });
        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.filters.category = e.target.value || undefined;
            this.loadRequests();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadRequests());
        document.getElementById('create-request-btn').addEventListener('click', () => this.showCreateModal());

        // Load data
        await this.loadRequests();
        await this.loadStats();
    },

    /**
     * View 2: 標準リクエストテンプレート
     */
    async renderStandardView() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'サービス要求 - 標準リクエスト';

        content.innerHTML = `
            <div class="page-header">
                <p class="page-description">よくある依頼のテンプレートから選択して申請できます。ワンクリックで必要な情報を入力できます。</p>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="template-search" placeholder="テンプレートを検索...">
                    </div>
                    <select id="filter-template-category" class="filter-select">
                        <option value="">すべてのカテゴリ</option>
                        <option value="account">アカウント</option>
                        <option value="license">ライセンス</option>
                        <option value="email">メール</option>
                        <option value="group">グループ</option>
                        <option value="teams">Teams</option>
                        <option value="onedrive">OneDrive</option>
                    </select>
                </div>
            </div>

            <div id="templates-grid" class="templates-grid">
                ${this.standardTemplates.map(template => `
                    <div class="template-card" data-id="${template.id}">
                        <div class="template-icon">
                            <i class="lucide-${template.icon}"></i>
                        </div>
                        <h3 class="template-title">${template.title}</h3>
                        <p class="template-description">${template.description}</p>
                        <div class="template-meta">
                            <span class="badge badge-${template.requiresApproval ? 'warning' : 'success'}">
                                <i class="lucide-${template.requiresApproval ? 'shield-check' : 'zap'}"></i>
                                ${template.requiresApproval ? '承認必須' : '即時対応'}
                            </span>
                            <span class="text-secondary text-sm">
                                <i class="lucide-clock"></i> 約${template.estimatedDays}日
                            </span>
                        </div>
                        <button class="btn btn-primary btn-block use-template-btn" data-id="${template.id}">
                            <i class="lucide-file-text"></i> このテンプレートを使う
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // Event listeners
        document.querySelectorAll('.use-template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const template = this.standardTemplates.find(t => t.id === btn.dataset.id);
                this.showTemplateModal(template);
            });
        });

        // Search and filter
        document.getElementById('template-search').addEventListener('input', (e) => {
            this.filterTemplates(e.target.value, document.getElementById('filter-template-category').value);
        });
        document.getElementById('filter-template-category').addEventListener('change', (e) => {
            this.filterTemplates(document.getElementById('template-search').value, e.target.value);
        });
    },

    /**
     * Filter templates by search and category
     */
    filterTemplates(searchText, category) {
        const cards = document.querySelectorAll('.template-card');
        const search = searchText.toLowerCase();

        cards.forEach(card => {
            const templateId = card.dataset.id;
            const template = this.standardTemplates.find(t => t.id === templateId);

            const matchesSearch = !search ||
                template.title.toLowerCase().includes(search) ||
                template.description.toLowerCase().includes(search);
            const matchesCategory = !category || template.category === category;

            card.style.display = (matchesSearch && matchesCategory) ? 'block' : 'none';
        });
    },

    /**
     * Load service requests
     */
    async loadRequests() {
        const container = document.getElementById('requests-list');
        if (!container) return;

        try {
            const data = await API.getTickets({
                page: this.currentPage,
                page_size: this.pageSize,
                ...this.filters
            });
            this.renderRequests(data, container);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>エラー: ${error.message}</p></div>`;
        }
    },

    /**
     * Render service requests table
     */
    renderRequests(data, container) {
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-inbox"></i>
                    <h3>サービス要求がありません</h3>
                    <p>該当するサービス要求が見つかりませんでした</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>チケット番号</th>
                        <th>件名</th>
                        <th>カテゴリ</th>
                        <th>ステータス</th>
                        <th>担当者</th>
                        <th>作成日時</th>
                        <th>期限</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(request => `
                        <tr>
                            <td>
                                <a href="#/tickets/${request.id}" class="link">${request.ticket_number}</a>
                            </td>
                            <td>
                                <div class="cell-content">
                                    ${this.truncate(request.subject, 60)}
                                </div>
                            </td>
                            <td>
                                <span class="badge badge-secondary">
                                    ${request.category || '-'}
                                </span>
                            </td>
                            <td>
                                <span class="badge badge-${this.statusColors[request.status]}">
                                    ${this.statusLabels[request.status] || request.status}
                                </span>
                            </td>
                            <td>${request.assignee_name || '-'}</td>
                            <td>${this.formatDate(request.created_at)}</td>
                            <td>${this.formatDate(request.due_at)}</td>
                            <td>
                                <button class="btn btn-ghost btn-sm view-btn" data-id="${request.id}">
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
            btn.addEventListener('click', () => this.showRequestDetail(btn.dataset.id));
        });
    },

    /**
     * Load stats
     */
    async loadStats() {
        try {
            // Pending approval count
            const pendingData = await API.getTickets({
                type: 'service_request',
                status: 'pending_approval',
                page_size: 1
            });
            document.getElementById('pending-approval-count').textContent = pendingData.total || 0;

            // In progress count
            const inProgressData = await API.getTickets({
                type: 'service_request',
                status: 'in_progress',
                page_size: 1
            });
            document.getElementById('in-progress-count').textContent = inProgressData.total || 0;

            // Scheduled count
            const scheduledData = await API.getTickets({
                type: 'service_request',
                status: 'pending_change_window',
                page_size: 1
            });
            document.getElementById('scheduled-count').textContent = scheduledData.total || 0;

            // Completed today
            const today = new Date().toISOString().split('T')[0];
            const completedData = await API.getTickets({
                type: 'service_request',
                status: 'resolved,closed',
                resolved_after: today,
                page_size: 1
            });
            document.getElementById('completed-today').textContent = completedData.total || 0;
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },

    /**
     * Show create service request modal
     */
    showCreateModal() {
        Modal.create({
            title: '新規サービス要求作成',
            content: `
                <form id="create-request-form">
                    <div class="form-group">
                        <label>件名 <span class="required">*</span></label>
                        <input type="text" name="subject" required minlength="5" placeholder="サービス要求の概要を入力">
                    </div>
                    <div class="form-group">
                        <label>詳細 <span class="required">*</span></label>
                        <textarea name="description" required rows="4" placeholder="要求の詳細、目的、必要な設定など"></textarea>
                    </div>
                    <div class="form-group">
                        <label>カテゴリ <span class="required">*</span></label>
                        <select name="category" required>
                            <option value="">選択してください</option>
                            <option value="account">アカウント</option>
                            <option value="license">ライセンス</option>
                            <option value="email">メール</option>
                            <option value="group">グループ</option>
                            <option value="teams">Teams</option>
                            <option value="onedrive">OneDrive</option>
                            <option value="other">その他</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>影響度</label>
                            <select name="impact">
                                <option value="1">個人</option>
                                <option value="2" selected>部署</option>
                                <option value="3">全社</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>緊急度</label>
                            <select name="urgency">
                                <option value="1">低</option>
                                <option value="2" selected>中</option>
                                <option value="3">高</option>
                            </select>
                        </div>
                    </div>
                    <div class="alert alert-info">
                        <i class="lucide-info"></i>
                        <span>承認が必要な要求は、承認後に実施されます</span>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="create-request-form" class="btn btn-primary">作成</button>
            `,
        });

        document.getElementById('create-request-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.createTicket({
                    type: 'service_request',
                    category: fd.get('category'),
                    subject: fd.get('subject'),
                    description: fd.get('description'),
                    impact: parseInt(fd.get('impact')),
                    urgency: parseInt(fd.get('urgency')),
                });
                Modal.hide();
                Toast.success('サービス要求を作成しました');
                this.loadRequests();
                this.loadStats();
            } catch (err) {
                Toast.error(err.message || 'サービス要求の作成に失敗しました');
            }
        });
    },

    /**
     * Show template-based request modal
     */
    showTemplateModal(template) {
        let formFields = '';

        // Generate form fields based on template
        switch (template.id) {
            case 'new-user-account':
                formFields = `
                    <div class="form-group">
                        <label>氏名 <span class="required">*</span></label>
                        <input type="text" name="full_name" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>部署 <span class="required">*</span></label>
                            <input type="text" name="department" required>
                        </div>
                        <div class="form-group">
                            <label>役職 <span class="required">*</span></label>
                            <input type="text" name="position" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>利用開始日 <span class="required">*</span></label>
                        <input type="date" name="start_date" required>
                    </div>
                    <div class="form-group">
                        <label>直属上司 <span class="required">*</span></label>
                        <input type="text" name="manager" required>
                    </div>
                `;
                break;
            case 'license-assignment':
                formFields = `
                    <div class="form-group">
                        <label>対象ユーザー <span class="required">*</span></label>
                        <input type="email" name="target_user" required placeholder="user@example.com">
                    </div>
                    <div class="form-group">
                        <label>ライセンス種別 <span class="required">*</span></label>
                        <select name="license_type" required>
                            <option value="">選択してください</option>
                            <option value="microsoft_365_e3">Microsoft 365 E3</option>
                            <option value="microsoft_365_e5">Microsoft 365 E5</option>
                            <option value="office_365_e3">Office 365 E3</option>
                            <option value="project_plan_3">Project Plan 3</option>
                            <option value="visio_plan_2">Visio Plan 2</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>業務上の理由 <span class="required">*</span></label>
                        <textarea name="business_reason" required rows="3"></textarea>
                    </div>
                `;
                break;
            case 'password-reset':
                formFields = `
                    <div class="form-group">
                        <label>対象ユーザー <span class="required">*</span></label>
                        <input type="email" name="target_user" required placeholder="user@example.com">
                    </div>
                    <div class="form-group">
                        <label>リセット理由 <span class="required">*</span></label>
                        <select name="reason" required>
                            <option value="">選択してください</option>
                            <option value="forgot">パスワード忘れ</option>
                            <option value="locked">アカウントロック</option>
                            <option value="expired">パスワード期限切れ</option>
                            <option value="security">セキュリティ上の理由</option>
                        </select>
                    </div>
                `;
                break;
            default:
                formFields = `
                    <div class="form-group">
                        <label>詳細 <span class="required">*</span></label>
                        <textarea name="details" required rows="4" placeholder="詳細な要件を入力してください"></textarea>
                    </div>
                `;
        }

        Modal.create({
            title: template.title,
            content: `
                <div class="alert alert-info" style="margin-bottom: var(--spacing-md);">
                    <i class="lucide-info"></i>
                    <div>
                        <div>${template.description}</div>
                        <div class="text-sm" style="margin-top: 0.25rem;">
                            ${template.requiresApproval ? '承認必須 • ' : ''}目安: ${template.estimatedDays}日
                        </div>
                    </div>
                </div>
                <form id="template-request-form">
                    <input type="hidden" name="template_id" value="${template.id}">
                    ${formFields}
                    ${template.requiresApproval ? `
                        <div class="alert alert-warning">
                            <i class="lucide-shield-check"></i>
                            <span>この要求は承認ワークフローが必要です</span>
                        </div>
                    ` : ''}
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="template-request-form" class="btn btn-primary">申請</button>
            `,
            size: 'medium'
        });

        document.getElementById('template-request-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);

            // Build description from form fields
            let description = `【${template.title}】\n\n`;
            for (const [key, value] of fd.entries()) {
                if (key !== 'template_id') {
                    description += `${key}: ${value}\n`;
                }
            }

            try {
                await API.createTicket({
                    type: 'service_request',
                    category: template.category,
                    subject: template.title,
                    description: description,
                    impact: 2,
                    urgency: 2,
                });
                Modal.hide();
                Toast.success('サービス要求を作成しました');
                Router.navigate('/service-requests');
            } catch (err) {
                Toast.error(err.message || 'サービス要求の作成に失敗しました');
            }
        });
    },

    /**
     * Show service request detail modal
     */
    async showRequestDetail(id) {
        try {
            const request = await API.getTicket(id);
            Modal.create({
                title: request.ticket_number,
                content: `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>カテゴリ</label>
                            <span class="badge badge-secondary">${request.category || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>ステータス</label>
                            <span class="badge badge-${this.statusColors[request.status]}">
                                ${this.statusLabels[request.status]}
                            </span>
                        </div>
                        <div class="detail-item full-width">
                            <label>件名</label>
                            <p>${request.subject}</p>
                        </div>
                        <div class="detail-item full-width">
                            <label>詳細</label>
                            <p style="white-space: pre-wrap;">${request.description || '-'}</p>
                        </div>
                        <div class="detail-item">
                            <label>作成日時</label>
                            <span>${this.formatDate(request.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <label>担当者</label>
                            <span>${request.assignee_name || '未割当'}</span>
                        </div>
                        ${request.due_at ? `
                            <div class="detail-item">
                                <label>期限</label>
                                <span>${this.formatDate(request.due_at)}</span>
                            </div>
                        ` : ''}
                    </div>
                `,
                size: 'large',
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.hide()">閉じる</button>
                    <a href="#/tickets/${request.id}" class="btn btn-primary" onclick="Modal.hide()">詳細を見る</a>
                `
            });
        } catch (err) {
            Toast.error(err.message || 'サービス要求の取得に失敗しました');
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
};

window.ServiceRequestsPage = ServiceRequestsPage;
