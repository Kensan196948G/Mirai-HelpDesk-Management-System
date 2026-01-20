/**
 * Mirai HelpDesk - Reports Page
 *
 * Dashboard analytics and SLA reporting.
 */

const ReportsPage = {
    currentPeriod: 30,

    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'レポート';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="period-select" class="filter-select">
                        <option value="7">過去7日間</option>
                        <option value="30" selected>過去30日間</option>
                        <option value="90">過去90日間</option>
                        <option value="365">過去1年間</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="export-btn" class="btn btn-secondary">
                        <i class="lucide-download"></i><span>エクスポート</span>
                    </button>
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>

            <div id="reports-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('period-select').addEventListener('change', (e) => {
            this.currentPeriod = parseInt(e.target.value);
            this.loadReports();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadReports());
        document.getElementById('export-btn').addEventListener('click', () => this.exportReport());

        await this.loadReports();
    },

    async loadReports() {
        const container = document.getElementById('reports-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const [dashboard, sla] = await Promise.all([
                API.getDashboardStats(),
                API.getSLAReport(this.currentPeriod),
            ]);
            this.renderReports(dashboard, sla);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderReports(dashboard, sla) {
        const container = document.getElementById('reports-content');

        container.innerHTML = `
            <!-- SLA Overview -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">SLA コンプライアンス</h3>
                    <span class="badge badge-${sla.compliance_rate >= 95 ? 'success' : sla.compliance_rate >= 80 ? 'warning' : 'error'}">
                        ${sla.compliance_rate}%
                    </span>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${sla.total_tickets}</div>
                                <div class="stat-label">総チケット</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-success">${sla.sla_met}</div>
                                <div class="stat-label">SLA達成</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-error">${sla.sla_breached}</div>
                                <div class="stat-label">SLA違反</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${this.currentPeriod}日</div>
                                <div class="stat-label">集計期間</div>
                            </div>
                        </div>
                    </div>

                    <!-- SLA Progress Bar -->
                    <div class="sla-progress" style="margin-top: var(--spacing-lg);">
                        <div class="progress-bar">
                            <div class="progress-fill success" style="width: ${sla.compliance_rate}%"></div>
                        </div>
                        <div class="progress-labels">
                            <span>0%</span>
                            <span>SLA達成率: ${sla.compliance_rate}%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg);">
                <!-- Priority Breakdown -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">優先度別 SLA 達成状況</h3>
                    </div>
                    <div class="card-body">
                        ${this.renderPrioritySLA(sla.by_priority)}
                    </div>
                </div>

                <!-- Ticket Stats -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">チケット概要</h3>
                    </div>
                    <div class="card-body">
                        <div class="metric-list">
                            <div class="metric-item">
                                <span class="metric-label">総チケット数</span>
                                <span class="metric-value">${dashboard.total_tickets}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">対応中</span>
                                <span class="metric-value">${dashboard.open_tickets}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">本日解決</span>
                                <span class="metric-value">${dashboard.resolved_today}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">期限超過</span>
                                <span class="metric-value text-error">${dashboard.overdue_tickets}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Status Distribution -->
            <div class="card" style="margin-top: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">ステータス分布</h3>
                </div>
                <div class="card-body">
                    ${this.renderStatusDistribution(dashboard.tickets_by_status)}
                </div>
            </div>

            <!-- Category Distribution -->
            <div class="card" style="margin-top: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">カテゴリ分布</h3>
                </div>
                <div class="card-body">
                    ${this.renderCategoryDistribution(dashboard.tickets_by_category)}
                </div>
            </div>
        `;
    },

    renderPrioritySLA(byPriority) {
        const priorityConfig = {
            'p1': { label: 'P1 - 緊急', color: 'var(--color-p1)' },
            'p2': { label: 'P2 - 高', color: 'var(--color-p2)' },
            'p3': { label: 'P3 - 中', color: 'var(--color-p3)' },
            'p4': { label: 'P4 - 低', color: 'var(--color-p4)' },
        };

        let html = '<div class="priority-sla-list">';

        for (const [priority, config] of Object.entries(priorityConfig)) {
            const data = byPriority[priority] || { total: 0, met: 0, breached: 0 };
            const rate = data.total > 0 ? Math.round((data.met / data.total) * 100) : 100;

            html += `
                <div class="priority-sla-item">
                    <div class="priority-header">
                        <span class="priority-dot" style="background: ${config.color}"></span>
                        <span class="priority-label">${config.label}</span>
                        <span class="priority-rate ${rate >= 95 ? 'text-success' : rate >= 80 ? 'text-warning' : 'text-error'}">${rate}%</span>
                    </div>
                    <div class="priority-details">
                        <span>達成: ${data.met}</span>
                        <span>違反: ${data.breached}</span>
                        <span>合計: ${data.total}</span>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    renderStatusDistribution(statusData) {
        const statusLabels = {
            'new': '新規',
            'triage': '分類中',
            'assigned': '割当済',
            'in_progress': '対応中',
            'pending_customer': '回答待ち',
            'pending_approval': '承認待ち',
            'pending_change': '実施待ち',
            'resolved': '解決済',
            'closed': '完了',
            'canceled': 'キャンセル',
            'reopened': '再オープン',
        };

        const total = Object.values(statusData).reduce((a, b) => a + b, 0) || 1;

        let html = '<div class="distribution-bars">';

        for (const [status, count] of Object.entries(statusData)) {
            const percentage = Math.round((count / total) * 100);
            html += `
                <div class="distribution-item">
                    <div class="distribution-label">
                        <span>${statusLabels[status] || status}</span>
                        <span>${count} (${percentage}%)</span>
                    </div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    renderCategoryDistribution(categoryData) {
        const categoryLabels = {
            'account': 'アカウント',
            'license': 'ライセンス',
            'email': 'メール',
            'teams': 'Teams',
            'onedrive': 'OneDrive',
            'sharepoint': 'SharePoint',
            'security': 'セキュリティ',
            'network': 'ネットワーク',
            'hardware': 'ハードウェア',
            'software': 'ソフトウェア',
            'other': 'その他',
        };

        const total = Object.values(categoryData).reduce((a, b) => a + b, 0) || 1;
        const sorted = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);

        let html = '<div class="category-grid">';

        for (const [category, count] of sorted) {
            const percentage = Math.round((count / total) * 100);
            html += `
                <div class="category-card">
                    <div class="category-name">${categoryLabels[category] || category}</div>
                    <div class="category-count">${count}</div>
                    <div class="category-percentage">${percentage}%</div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    exportReport() {
        Toast.info('レポートのエクスポート機能は開発中です');
    },
};

window.ReportsPage = ReportsPage;
