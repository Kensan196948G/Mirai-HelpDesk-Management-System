/**
 * Mirai HelpDesk - M365 Approvals Page
 *
 * Approval workflow management for M365 operations.
 */

const M365ApprovalsPage = {
    currentPage: 1,
    pageSize: 20,
    filters: { status: 'pending' },

    statusLabels: {
        'pending': '承認待ち',
        'approved': '承認済み',
        'rejected': '却下',
    },

    statusColors: {
        'pending': 'warning',
        'approved': 'success',
        'rejected': 'error',
    },

    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '承認待ち';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="filter-status" class="filter-select">
                        <option value="pending" selected>承認待ち</option>
                        <option value="approved">承認済み</option>
                        <option value="rejected">却下</option>
                        <option value="">すべて</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>

            <!-- Pending Stats -->
            <div class="stats-grid" style="margin-bottom: var(--spacing-lg);">
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="lucide-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="pending-count">-</div>
                        <div class="stat-label">承認待ち</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div id="approvals-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value || undefined;
            this.loadApprovals();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadApprovals());

        await this.loadApprovals();
    },

    async loadApprovals() {
        const container = document.getElementById('approvals-list');
        try {
            const data = await API.getApprovals({ page: this.currentPage, ...this.filters });
            this.renderApprovals(data);

            // Update pending count
            if (this.filters.status === 'pending') {
                document.getElementById('pending-count').textContent = data.total;
            } else {
                const pendingData = await API.getApprovals({ status: 'pending', page_size: 1 });
                document.getElementById('pending-count').textContent = pendingData.total;
            }
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderApprovals(data) {
        const container = document.getElementById('approvals-list');
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-check-circle"></i>
                    <h3>承認待ちの項目はありません</h3>
                    <p>すべての承認リクエストが処理されています</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>チケット</th>
                        <th>申請理由</th>
                        <th>ステータス</th>
                        <th>申請日時</th>
                        <th>承認者</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(approval => `
                        <tr data-id="${approval.id}">
                            <td>
                                <div class="cell-content">
                                    <a href="#/tickets/${approval.ticket_id}" class="link">
                                        ${approval.ticket_number}
                                    </a>
                                    <div class="text-secondary text-sm">${this.truncate(approval.ticket_subject, 30)}</div>
                                </div>
                            </td>
                            <td>
                                <div class="cell-content">
                                    ${this.truncate(approval.request_reason, 50)}
                                </div>
                            </td>
                            <td>
                                <span class="badge badge-${this.statusColors[approval.status]}">
                                    ${this.statusLabels[approval.status]}
                                </span>
                            </td>
                            <td>${this.formatDate(approval.created_at)}</td>
                            <td>${approval.approver_name || '-'}</td>
                            <td>
                                <div class="action-buttons">
                                    ${approval.status === 'pending' ? `
                                        <button class="btn btn-success btn-sm approve-btn" data-id="${approval.id}">
                                            <i class="lucide-check"></i> 承認
                                        </button>
                                        <button class="btn btn-error btn-sm reject-btn" data-id="${approval.id}">
                                            <i class="lucide-x"></i> 却下
                                        </button>
                                    ` : `
                                        <button class="btn btn-ghost btn-sm view-btn" data-id="${approval.id}">
                                            <i class="lucide-eye"></i>
                                        </button>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Event listeners
        container.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showApproveModal(btn.dataset.id));
        });
        container.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showRejectModal(btn.dataset.id));
        });
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showDetailModal(btn.dataset.id, items.find(a => a.id == btn.dataset.id)));
        });
    },

    showApproveModal(approvalId) {
        Modal.create({
            title: '承認確認',
            content: `
                <form id="approve-form">
                    <p style="margin-bottom: var(--spacing-md);">この操作を承認しますか？</p>
                    <div class="form-group">
                        <label>コメント（任意）</label>
                        <textarea name="comment" rows="3" placeholder="承認に関するコメント"></textarea>
                    </div>
                    <div class="alert alert-warning">
                        <i class="lucide-alert-triangle"></i>
                        <span>承認後、M365オペレーターが操作を実施できるようになります。</span>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="approve-form" class="btn btn-success">承認する</button>
            `,
        });

        document.getElementById('approve-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.approveTask(approvalId, fd.get('comment') || null);
                Modal.hide();
                Toast.success('承認しました');
                this.loadApprovals();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    },

    showRejectModal(approvalId) {
        Modal.create({
            title: '却下確認',
            content: `
                <form id="reject-form">
                    <p style="margin-bottom: var(--spacing-md);">この操作を却下しますか？</p>
                    <div class="form-group">
                        <label>却下理由 <span class="required">*</span></label>
                        <textarea name="comment" rows="3" required placeholder="却下の理由を入力してください"></textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="reject-form" class="btn btn-error">却下する</button>
            `,
        });

        document.getElementById('reject-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.rejectTask(approvalId, fd.get('comment'));
                Modal.hide();
                Toast.success('却下しました');
                this.loadApprovals();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    },

    showDetailModal(approvalId, approval) {
        Modal.create({
            title: `承認詳細 #${approvalId}`,
            content: `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>チケット</label>
                        <span>${approval.ticket_number}</span>
                    </div>
                    <div class="detail-item">
                        <label>ステータス</label>
                        <span class="badge badge-${this.statusColors[approval.status]}">${this.statusLabels[approval.status]}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>件名</label>
                        <p>${approval.ticket_subject}</p>
                    </div>
                    <div class="detail-item full-width">
                        <label>申請理由</label>
                        <p>${approval.request_reason}</p>
                    </div>
                    <div class="detail-item">
                        <label>申請日時</label>
                        <span>${this.formatDate(approval.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <label>承認者</label>
                        <span>${approval.approver_name || '-'}</span>
                    </div>
                    ${approval.approved_at ? `
                        <div class="detail-item">
                            <label>承認日時</label>
                            <span>${this.formatDate(approval.approved_at)}</span>
                        </div>
                    ` : ''}
                    ${approval.comment ? `
                        <div class="detail-item full-width">
                            <label>コメント</label>
                            <p>${approval.comment}</p>
                        </div>
                    ` : ''}
                </div>
            `,
            size: 'medium'
        });
    },

    truncate(str, maxLength) {
        if (!str) return '-';
        return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
    },

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

window.M365ApprovalsPage = M365ApprovalsPage;
