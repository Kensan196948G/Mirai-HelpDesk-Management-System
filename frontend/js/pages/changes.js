/**
 * Mirai HelpDesk - Change Management Pages
 *
 * Handles change requests, M365 settings changes, and approval flows.
 */

const ChangesPage = {
    currentPage: 1,
    pageSize: 20,
    filters: {},
    view: 'all',

    statusLabels: {
        'new': '新規',
        'triage': 'トリアージ',
        'assigned': 'アサイン済',
        'in_progress': '対応中',
        'pending_customer': '利用者回答待ち',
        'pending_approval': '承認待ち',
        'pending_change_window': '実施待ち',
        'resolved': '解決済',
        'closed': 'クローズ'
    },

    statusColors: {
        'new': 'info',
        'triage': 'warning',
        'assigned': 'info',
        'in_progress': 'primary',
        'pending_customer': 'warning',
        'pending_approval': 'warning',
        'pending_change_window': 'warning',
        'resolved': 'success',
        'closed': 'secondary'
    },

    priorityLabels: {
        'P1': '最優先',
        'P2': '高',
        'P3': '中',
        'P4': '低'
    },

    priorityColors: {
        'P1': 'error',
        'P2': 'warning',
        'P3': 'info',
        'P4': 'secondary'
    },

    /**
     * Render change requests list
     */
    async render(options = {}) {
        this.view = options.view || 'all';
        const content = document.getElementById('page-content');

        // Set page title based on view
        let pageTitle = '変更要求一覧';
        let pageDescription = 'すべての変更要求を表示します。M365設定変更には承認フローが適用されます。';

        if (this.view === 'm365') {
            pageTitle = 'M365設定変更';
            pageDescription = 'Microsoft 365関連の設定変更要求を管理します。すべての変更には承認が必要です。';
            this.filters.type = 'm365_request';
        } else {
            this.filters.type = 'change';
        }

        document.getElementById('page-title').textContent = pageTitle;

        content.innerHTML = `
            <div class="alert alert-info" style="margin-bottom: var(--spacing-lg);">
                <i class="lucide-info"></i>
                <span>${pageDescription}</span>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="change-search" placeholder="変更要求を検索...">
                    </div>
                    <select id="filter-status" class="filter-select">
                        <option value="">すべてのステータス</option>
                        <option value="new">新規</option>
                        <option value="pending_approval">承認待ち</option>
                        <option value="pending_change_window">実施待ち</option>
                        <option value="in_progress">対応中</option>
                        <option value="resolved">解決済</option>
                    </select>
                    <select id="filter-priority" class="filter-select">
                        <option value="">すべての優先度</option>
                        <option value="P1">最優先 (P1)</option>
                        <option value="P2">高 (P2)</option>
                        <option value="P3">中 (P3)</option>
                        <option value="P4">低 (P4)</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                    <button id="create-change-btn" class="btn btn-primary">
                        <i class="lucide-plus"></i><span>新規変更要求</span>
                    </button>
                </div>
            </div>

            <!-- Stats Cards -->
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
                    <div class="stat-icon info">
                        <i class="lucide-calendar"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="pending-window-count">-</div>
                        <div class="stat-label">実施待ち</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="lucide-activity"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="in-progress-count">-</div>
                        <div class="stat-label">対応中</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="lucide-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="resolved-count">-</div>
                        <div class="stat-label">今月解決</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div id="changes-list">
                    <div class="loading-spinner"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value || undefined;
            this.loadChanges();
        });
        document.getElementById('filter-priority').addEventListener('change', (e) => {
            this.filters.priority = e.target.value || undefined;
            this.loadChanges();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadChanges());
        document.getElementById('create-change-btn').addEventListener('click', () => this.showCreateModal());

        await this.loadChanges();
        await this.loadStats();
    },

    /**
     * Load change requests
     */
    async loadChanges() {
        const container = document.getElementById('changes-list');
        try {
            const data = await API.getTickets({ page: this.currentPage, ...this.filters });
            this.renderChanges(data);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    /**
     * Load statistics
     */
    async loadStats() {
        try {
            // Get counts for different statuses
            const pendingApproval = await API.getTickets({
                type: this.filters.type,
                status: 'pending_approval',
                page_size: 1
            });
            const pendingWindow = await API.getTickets({
                type: this.filters.type,
                status: 'pending_change_window',
                page_size: 1
            });
            const inProgress = await API.getTickets({
                type: this.filters.type,
                status: 'in_progress',
                page_size: 1
            });
            const resolved = await API.getTickets({
                type: this.filters.type,
                status: 'resolved',
                page_size: 1
            });

            document.getElementById('pending-approval-count').textContent = pendingApproval.total || 0;
            document.getElementById('pending-window-count').textContent = pendingWindow.total || 0;
            document.getElementById('in-progress-count').textContent = inProgress.total || 0;
            document.getElementById('resolved-count').textContent = resolved.total || 0;
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },

    /**
     * Render changes table
     */
    renderChanges(data) {
        const container = document.getElementById('changes-list');
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-clipboard-list"></i>
                    <h3>変更要求がありません</h3>
                    <p>現在、変更要求は登録されていません</p>
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
                        <th>優先度</th>
                        <th>ステータス</th>
                        <th>担当者</th>
                        <th>作成日</th>
                        <th>期限</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(change => `
                        <tr data-id="${change.id}">
                            <td>
                                <a href="#/tickets/${change.id}" class="link">
                                    ${change.ticket_number || `CHG-${change.id}`}
                                </a>
                            </td>
                            <td>
                                <div class="cell-content">
                                    ${this.truncate(change.subject, 50)}
                                    ${change.impact > 2 ? '<i class="lucide-alert-triangle text-warning" style="margin-left: 4px;"></i>' : ''}
                                </div>
                            </td>
                            <td>
                                <span class="badge badge-${this.priorityColors[change.priority] || 'secondary'}">
                                    ${change.priority || '-'}
                                </span>
                            </td>
                            <td>
                                <span class="badge badge-${this.statusColors[change.status] || 'secondary'}">
                                    ${this.statusLabels[change.status] || change.status}
                                </span>
                            </td>
                            <td>${change.assignee_name || '未割当'}</td>
                            <td>${this.formatDate(change.created_at)}</td>
                            <td>
                                ${change.due_at ? `
                                    <span class="${this.isOverdue(change.due_at) ? 'text-error' : ''}">
                                        ${this.formatDate(change.due_at)}
                                    </span>
                                ` : '-'}
                            </td>
                            <td>
                                <button class="btn btn-ghost btn-sm view-btn" data-id="${change.id}">
                                    <i class="lucide-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Event listeners
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showDetailModal(btn.dataset.id, items.find(c => c.id == btn.dataset.id)));
        });
    },

    /**
     * Show create change modal
     */
    showCreateModal() {
        Modal.create({
            title: '新規変更要求作成',
            content: `
                <form id="create-change-form">
                    <div class="form-group">
                        <label>種別 <span class="required">*</span></label>
                        <select name="type" required>
                            <option value="change">標準変更</option>
                            <option value="m365_request">M365設定変更</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>件名 <span class="required">*</span></label>
                        <input type="text" name="subject" required minlength="5" placeholder="変更内容の概要">
                    </div>
                    <div class="form-group">
                        <label>詳細 <span class="required">*</span></label>
                        <textarea name="description" required rows="4" placeholder="変更の詳細と理由を記載してください"></textarea>
                    </div>
                    <div class="form-group">
                        <label>影響度 <span class="required">*</span></label>
                        <select name="impact" required>
                            <option value="1">個人</option>
                            <option value="2" selected>部署</option>
                            <option value="3">全社</option>
                            <option value="4">対外影響</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>緊急度 <span class="required">*</span></label>
                        <select name="urgency" required>
                            <option value="1">低</option>
                            <option value="2" selected>中</option>
                            <option value="3">高</option>
                            <option value="4">即時</option>
                        </select>
                    </div>
                    <div class="alert alert-warning">
                        <i class="lucide-alert-triangle"></i>
                        <span>M365設定変更には承認が必要です。承認後、実施日時を指定して作業を行います。</span>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="create-change-form" class="btn btn-primary">作成</button>
            `,
            size: 'medium'
        });

        document.getElementById('create-change-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.createTicket({
                    type: fd.get('type'),
                    subject: fd.get('subject'),
                    description: fd.get('description'),
                    impact: parseInt(fd.get('impact')),
                    urgency: parseInt(fd.get('urgency')),
                });
                Modal.hide();
                Toast.success('変更要求を作成しました');
                this.loadChanges();
                this.loadStats();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    },

    /**
     * Show change detail modal
     */
    showDetailModal(id, change) {
        Modal.create({
            title: `変更要求詳細 - ${change.ticket_number || `CHG-${id}`}`,
            content: `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>チケット番号</label>
                        <span>${change.ticket_number || `CHG-${id}`}</span>
                    </div>
                    <div class="detail-item">
                        <label>ステータス</label>
                        <span class="badge badge-${this.statusColors[change.status]}">${this.statusLabels[change.status]}</span>
                    </div>
                    <div class="detail-item">
                        <label>優先度</label>
                        <span class="badge badge-${this.priorityColors[change.priority]}">${change.priority}</span>
                    </div>
                    <div class="detail-item">
                        <label>担当者</label>
                        <span>${change.assignee_name || '未割当'}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>件名</label>
                        <p>${change.subject}</p>
                    </div>
                    <div class="detail-item full-width">
                        <label>詳細</label>
                        <p style="white-space: pre-wrap;">${change.description || '-'}</p>
                    </div>
                    <div class="detail-item">
                        <label>影響度</label>
                        <span>${['', '個人', '部署', '全社', '対外影響'][change.impact] || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>緊急度</label>
                        <span>${['', '低', '中', '高', '即時'][change.urgency] || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>作成日時</label>
                        <span>${this.formatDate(change.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <label>期限</label>
                        <span>${change.due_at ? this.formatDate(change.due_at) : '-'}</span>
                    </div>
                    ${change.resolved_at ? `
                        <div class="detail-item">
                            <label>解決日時</label>
                            <span>${this.formatDate(change.resolved_at)}</span>
                        </div>
                    ` : ''}
                </div>
            `,
            size: 'large'
        });
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
     * Utility: Check if overdue
     */
    isOverdue(dueDate) {
        return new Date(dueDate) < new Date();
    }
};

/**
 * Approval Flow Visualization Page
 */
const ApprovalFlowPage = {
    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '承認フロー';

        content.innerHTML = `
            <div class="alert alert-info" style="margin-bottom: var(--spacing-lg);">
                <i class="lucide-info"></i>
                <span>変更要求の承認プロセスを可視化します。SOD（職務分離）原則に基づき、承認者と実施者は異なる必要があります。</span>
            </div>

            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <h2 style="margin-bottom: var(--spacing-lg);">承認ワークフロー図</h2>
                <div class="workflow-diagram">
                    <div class="workflow-step">
                        <div class="workflow-node primary">
                            <i class="lucide-file-plus"></i>
                            <span>変更要求作成</span>
                        </div>
                        <div class="workflow-label">依頼者</div>
                    </div>
                    <div class="workflow-arrow">→</div>
                    <div class="workflow-step">
                        <div class="workflow-node info">
                            <i class="lucide-clipboard-check"></i>
                            <span>トリアージ</span>
                        </div>
                        <div class="workflow-label">Agent</div>
                    </div>
                    <div class="workflow-arrow">→</div>
                    <div class="workflow-step">
                        <div class="workflow-node warning">
                            <i class="lucide-user-check"></i>
                            <span>承認待ち</span>
                        </div>
                        <div class="workflow-label">Approver</div>
                    </div>
                    <div class="workflow-arrow">→</div>
                    <div class="workflow-step">
                        <div class="workflow-node primary">
                            <i class="lucide-settings"></i>
                            <span>実施</span>
                        </div>
                        <div class="workflow-label">M365 Operator</div>
                    </div>
                    <div class="workflow-arrow">→</div>
                    <div class="workflow-step">
                        <div class="workflow-node success">
                            <i class="lucide-check-circle"></i>
                            <span>完了</span>
                        </div>
                        <div class="workflow-label">検証・クローズ</div>
                    </div>
                </div>
            </div>

            <div class="stats-grid" style="margin-bottom: var(--spacing-lg);">
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="lucide-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="approval-pending-count">-</div>
                        <div class="stat-label">承認待ち</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="lucide-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="approval-approved-count">-</div>
                        <div class="stat-label">承認済み</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon error">
                        <i class="lucide-x"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="approval-rejected-count">-</div>
                        <div class="stat-label">却下</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2 style="margin-bottom: var(--spacing-lg);">SOD（職務分離）原則</h2>
                <div class="alert alert-warning">
                    <i class="lucide-shield-alert"></i>
                    <div>
                        <strong>重要な制約事項</strong>
                        <ul style="margin-top: 8px; padding-left: 20px;">
                            <li>承認者 ≠ 実施者（M365 Operator）</li>
                            <li>実施者 ≠ 最終承認者</li>
                            <li>すべてのM365操作には承認フロー + 実施ログが必須</li>
                            <li>監査証跡として「誰が/いつ/何を/なぜ」を記録</li>
                        </ul>
                    </div>
                </div>

                <h3 style="margin-top: var(--spacing-lg); margin-bottom: var(--spacing-md);">役割と責任</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>役割</th>
                            <th>責任</th>
                            <th>権限</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Requester（依頼者）</strong></td>
                            <td>変更要求の作成、状況確認</td>
                            <td>チケット登録、コメント追加</td>
                        </tr>
                        <tr>
                            <td><strong>Agent（一次対応）</strong></td>
                            <td>トリアージ、分類、エスカレーション</td>
                            <td>チケット更新、担当者割当</td>
                        </tr>
                        <tr>
                            <td><strong>Approver（承認者）</strong></td>
                            <td>変更内容の承認/却下判断</td>
                            <td>承認、却下、差し戻し</td>
                        </tr>
                        <tr>
                            <td><strong>M365 Operator（実施者）</strong></td>
                            <td>承認済み変更の実施、実施ログ記録</td>
                            <td>M365操作実行、エビデンス添付</td>
                        </tr>
                        <tr>
                            <td><strong>Manager（運用管理者）</strong></td>
                            <td>SLA/KPI管理、監査閲覧</td>
                            <td>すべての閲覧、レポート出力</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        await this.loadApprovalStats();
    },

    async loadApprovalStats() {
        try {
            const pending = await API.getApprovals({ status: 'pending', page_size: 1 });
            const approved = await API.getApprovals({ status: 'approved', page_size: 1 });
            const rejected = await API.getApprovals({ status: 'rejected', page_size: 1 });

            document.getElementById('approval-pending-count').textContent = pending.total || 0;
            document.getElementById('approval-approved-count').textContent = approved.total || 0;
            document.getElementById('approval-rejected-count').textContent = rejected.total || 0;
        } catch (error) {
            console.error('Failed to load approval stats:', error);
        }
    }
};

// Export for use
window.ChangesPage = ChangesPage;
window.ApprovalFlowPage = ApprovalFlowPage;
