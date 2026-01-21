/**
 * Mirai HelpDesk - Audit Pages
 *
 * 監査・コンプライアンス機能:
 * - 監査ログ
 * - 操作履歴
 * - SLA達成率
 * - コンプライアンスレポート
 * - SOD検証
 * - M365実施ログ
 */

const AuditPage = {
    /**
     * 監査ログページ
     */
    async renderAuditLogs() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '監査ログ';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <input type="date" id="date-from" class="filter-input" placeholder="開始日">
                    <input type="date" id="date-to" class="filter-input" placeholder="終了日">
                    <select id="action-filter" class="filter-select">
                        <option value="">すべての操作</option>
                        <option value="login">ログイン</option>
                        <option value="logout">ログアウト</option>
                        <option value="ticket_create">チケット作成</option>
                        <option value="ticket_update">チケット更新</option>
                        <option value="approval">承認操作</option>
                        <option value="m365_execute">M365実施</option>
                    </select>
                    <input type="text" id="user-search" class="filter-input" placeholder="ユーザー検索">
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

            <div id="audit-logs-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        // Event listeners
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadAuditLogs());
        document.getElementById('export-btn').addEventListener('click', () => this.exportAuditLogs());
        document.getElementById('action-filter').addEventListener('change', () => this.loadAuditLogs());
        document.getElementById('user-search').addEventListener('input', () => this.loadAuditLogs());

        await this.loadAuditLogs();
    },

    async loadAuditLogs() {
        const container = document.getElementById('audit-logs-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            // Mock data - 本番ではAPIから取得
            const logs = await this.getMockAuditLogs();
            this.renderAuditLogsTable(logs);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderAuditLogsTable(logs) {
        const container = document.getElementById('audit-logs-content');

        const actionLabels = {
            'login': 'ログイン',
            'logout': 'ログアウト',
            'ticket_create': 'チケット作成',
            'ticket_update': 'チケット更新',
            'ticket_comment': 'コメント追加',
            'approval_request': '承認依頼',
            'approval_approve': '承認',
            'approval_reject': '却下',
            'm365_execute': 'M365操作実施',
            'settings_update': '設定変更',
            'user_create': 'ユーザー作成',
            'user_update': 'ユーザー更新',
        };

        container.innerHTML = `
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 180px;">日時</th>
                                    <th style="width: 150px;">ユーザー</th>
                                    <th style="width: 150px;">操作</th>
                                    <th>詳細</th>
                                    <th style="width: 120px;">IPアドレス</th>
                                    <th style="width: 100px;">結果</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.map(log => `
                                    <tr>
                                        <td>${this.formatDateTime(log.timestamp)}</td>
                                        <td>
                                            <div class="user-cell">
                                                <div class="avatar-sm">${log.user_name.charAt(0)}</div>
                                                <span>${log.user_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="badge badge-${this.getActionColor(log.action)}">
                                                ${actionLabels[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${log.details}
                                        </td>
                                        <td style="font-family: monospace; font-size: 0.875rem;">${log.ip_address}</td>
                                        <td>
                                            ${log.success
                                                ? '<span class="badge badge-success">成功</span>'
                                                : '<span class="badge badge-error">失敗</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="pagination">
                <button class="btn btn-sm btn-secondary" disabled>前へ</button>
                <span>1 / 10</span>
                <button class="btn btn-sm btn-secondary">次へ</button>
            </div>
        `;
    },

    getActionColor(action) {
        const colors = {
            'login': 'info',
            'logout': 'secondary',
            'ticket_create': 'primary',
            'ticket_update': 'primary',
            'approval_approve': 'success',
            'approval_reject': 'error',
            'm365_execute': 'warning',
            'settings_update': 'warning',
        };
        return colors[action] || 'secondary';
    },

    /**
     * 操作履歴ページ
     */
    async renderOperationHistory() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '操作履歴';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <input type="text" id="ticket-search" class="filter-input" placeholder="チケット番号で検索">
                    <select id="change-type-filter" class="filter-select">
                        <option value="">すべての変更</option>
                        <option value="status">ステータス変更</option>
                        <option value="assignment">担当者変更</option>
                        <option value="priority">優先度変更</option>
                        <option value="category">カテゴリ変更</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>

            <div id="operation-history-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('refresh-btn').addEventListener('click', () => this.loadOperationHistory());
        document.getElementById('change-type-filter').addEventListener('change', () => this.loadOperationHistory());

        await this.loadOperationHistory();
    },

    async loadOperationHistory() {
        const container = document.getElementById('operation-history-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const history = await this.getMockOperationHistory();
            this.renderOperationHistoryTable(history);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderOperationHistoryTable(history) {
        const container = document.getElementById('operation-history-content');

        container.innerHTML = `
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 180px;">日時</th>
                                    <th style="width: 120px;">チケット</th>
                                    <th style="width: 150px;">操作者</th>
                                    <th style="width: 150px;">変更タイプ</th>
                                    <th>変更前</th>
                                    <th>変更後</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${history.map(item => `
                                    <tr>
                                        <td>${this.formatDateTime(item.timestamp)}</td>
                                        <td>
                                            <a href="#/tickets/${item.ticket_id}" class="link-primary">
                                                #${item.ticket_id}
                                            </a>
                                        </td>
                                        <td>
                                            <div class="user-cell">
                                                <div class="avatar-sm">${item.actor_name.charAt(0)}</div>
                                                <span>${item.actor_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="badge badge-info">${item.change_type}</span>
                                        </td>
                                        <td>${this.formatValue(item.before)}</td>
                                        <td><strong>${this.formatValue(item.after)}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * SLA達成率ページ
     */
    async renderSLAAchievement() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'SLA達成率';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="period-select" class="filter-select">
                        <option value="7">過去7日間</option>
                        <option value="30" selected>過去30日間</option>
                        <option value="90">過去90日間</option>
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

            <div id="sla-achievement-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('refresh-btn').addEventListener('click', () => this.loadSLAAchievement());
        document.getElementById('period-select').addEventListener('change', () => this.loadSLAAchievement());
        document.getElementById('export-btn').addEventListener('click', () => {
            Toast.info('SLAレポートのエクスポート機能は開発中です');
        });

        await this.loadSLAAchievement();
    },

    async loadSLAAchievement() {
        const container = document.getElementById('sla-achievement-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const slaData = await this.getMockSLAData();
            this.renderSLAAchievementCharts(slaData);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderSLAAchievementCharts(slaData) {
        const container = document.getElementById('sla-achievement-content');

        const overallRate = Math.round((slaData.total_met / slaData.total_tickets) * 100);

        container.innerHTML = `
            <!-- Overall SLA Status -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">全体のSLA達成状況</h3>
                    <span class="badge badge-${overallRate >= 95 ? 'success' : overallRate >= 80 ? 'warning' : 'error'}" style="font-size: 1.25rem; padding: 0.5rem 1rem;">
                        ${overallRate}%
                    </span>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${slaData.total_tickets}</div>
                                <div class="stat-label">総チケット数</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-success">${slaData.total_met}</div>
                                <div class="stat-label">SLA達成</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-error">${slaData.total_breached}</div>
                                <div class="stat-label">SLA違反</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${slaData.at_risk}</div>
                                <div class="stat-label">期限間近</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: var(--spacing-xl);">
                        <div class="progress-bar" style="height: 40px;">
                            <div class="progress-fill success" style="width: ${overallRate}%;">
                                <span style="color: white; font-weight: 600; line-height: 40px;">${overallRate}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Priority Breakdown -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">優先度別のSLA達成状況</h3>
                </div>
                <div class="card-body">
                    ${this.renderPrioritySLABars(slaData.by_priority)}
                </div>
            </div>

            <!-- Detailed Table -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">優先度別詳細</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>優先度</th>
                                    <th>総チケット数</th>
                                    <th>SLA達成</th>
                                    <th>SLA違反</th>
                                    <th>達成率</th>
                                    <th>平均解決時間</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderPrioritySLARows(slaData.by_priority)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderPrioritySLABars(byPriority) {
        const priorities = ['p1', 'p2', 'p3', 'p4'];
        const priorityLabels = {
            'p1': 'P1 - 緊急',
            'p2': 'P2 - 高',
            'p3': 'P3 - 中',
            'p4': 'P4 - 低',
        };

        let html = '<div style="display: flex; flex-direction: column; gap: var(--spacing-lg);">';

        for (const priority of priorities) {
            const data = byPriority[priority];
            const rate = data.total > 0 ? Math.round((data.met / data.total) * 100) : 100;

            html += `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span class="badge badge-${priority}">${priorityLabels[priority]}</span>
                        <span style="font-weight: 600; color: ${rate >= 95 ? 'var(--color-success)' : rate >= 80 ? 'var(--color-warning)' : 'var(--color-error)'};">
                            ${rate}%
                        </span>
                    </div>
                    <div class="progress-bar" style="height: 30px;">
                        <div class="progress-fill ${rate >= 95 ? 'success' : rate >= 80 ? 'warning' : 'error'}" style="width: ${rate}%;">
                            <span style="color: white; font-size: 0.875rem; line-height: 30px;">
                                ${data.met} / ${data.total}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    renderPrioritySLARows(byPriority) {
        const priorities = ['p1', 'p2', 'p3', 'p4'];
        const priorityLabels = {
            'p1': 'P1 - 緊急',
            'p2': 'P2 - 高',
            'p3': 'P3 - 中',
            'p4': 'P4 - 低',
        };

        let html = '';
        for (const priority of priorities) {
            const data = byPriority[priority];
            const rate = data.total > 0 ? Math.round((data.met / data.total) * 100) : 100;

            html += `
                <tr>
                    <td><span class="badge badge-${priority}">${priorityLabels[priority]}</span></td>
                    <td>${data.total}</td>
                    <td class="text-success">${data.met}</td>
                    <td class="text-error">${data.breached}</td>
                    <td>
                        <span style="font-weight: 600; color: ${rate >= 95 ? 'var(--color-success)' : rate >= 80 ? 'var(--color-warning)' : 'var(--color-error)'};">
                            ${rate}%
                        </span>
                    </td>
                    <td>${data.avg_resolution_time}</td>
                </tr>
            `;
        }
        return html;
    },

    /**
     * コンプライアンスレポートページ
     */
    async renderComplianceReport() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'コンプライアンスレポート';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-right">
                    <button id="export-pdf-btn" class="btn btn-secondary">
                        <i class="lucide-file-text"></i><span>PDF出力</span>
                    </button>
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>

            <div id="compliance-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('refresh-btn').addEventListener('click', () => this.loadComplianceReport());
        document.getElementById('export-pdf-btn').addEventListener('click', () => {
            Toast.info('PDFエクスポート機能は開発中です');
        });

        await this.loadComplianceReport();
    },

    async loadComplianceReport() {
        const container = document.getElementById('compliance-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const compliance = await this.getMockComplianceData();
            this.renderComplianceContent(compliance);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderComplianceContent(compliance) {
        const container = document.getElementById('compliance-content');

        container.innerHTML = `
            <!-- Overall Compliance Score -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">総合コンプライアンススコア</h3>
                    <span class="badge badge-${compliance.overall_score >= 95 ? 'success' : 'warning'}" style="font-size: 1.5rem; padding: 0.75rem 1.5rem;">
                        ${compliance.overall_score}%
                    </span>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <i class="lucide-info"></i>
                        <span>ISO20000およびITIL準拠の基準に基づく評価です。</span>
                    </div>
                </div>
            </div>

            <!-- Compliance Categories -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); margin-bottom: var(--spacing-lg);">
                ${compliance.categories.map(cat => `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">${cat.name}</h3>
                            <span class="badge badge-${cat.score >= 95 ? 'success' : cat.score >= 80 ? 'warning' : 'error'}">
                                ${cat.score}%
                            </span>
                        </div>
                        <div class="card-body">
                            <div class="progress-bar" style="margin-bottom: var(--spacing-md);">
                                <div class="progress-fill ${cat.score >= 95 ? 'success' : cat.score >= 80 ? 'warning' : 'error'}" style="width: ${cat.score}%"></div>
                            </div>
                            <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-secondary);">
                                ${cat.requirements.map(req => `
                                    <li style="margin-bottom: 0.5rem;">
                                        ${req.met
                                            ? '<i class="lucide-check-circle text-success" style="font-size: 0.875rem;"></i>'
                                            : '<i class="lucide-x-circle text-error" style="font-size: 0.875rem;"></i>'}
                                        <span>${req.name}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Audit Trail Integrity -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">監査証跡の整合性</h3>
                    <span class="badge badge-success">検証済み</span>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${compliance.audit_trail.total_records}</div>
                                <div class="stat-label">総レコード数</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-success">${compliance.audit_trail.verified_records}</div>
                                <div class="stat-label">検証済み</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-error">${compliance.audit_trail.tampered_records}</div>
                                <div class="stat-label">改ざん検出</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${compliance.audit_trail.retention_days}日</div>
                                <div class="stat-label">保持期間</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * SOD検証ページ
     */
    async renderSODCheck() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'SOD検証（職務分離）';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="period-select" class="filter-select">
                        <option value="7">過去7日間</option>
                        <option value="30" selected>過去30日間</option>
                        <option value="90">過去90日間</option>
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

            <div id="sod-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('refresh-btn').addEventListener('click', () => this.loadSODCheck());
        document.getElementById('period-select').addEventListener('change', () => this.loadSODCheck());
        document.getElementById('export-btn').addEventListener('click', () => {
            Toast.info('SODレポートのエクスポート機能は開発中です');
        });

        await this.loadSODCheck();
    },

    async loadSODCheck() {
        const container = document.getElementById('sod-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const sodData = await this.getMockSODData();
            this.renderSODContent(sodData);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderSODContent(sodData) {
        const container = document.getElementById('sod-content');

        container.innerHTML = `
            <!-- SOD Overview -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">職務分離（SOD）検証結果</h3>
                    <span class="badge badge-${sodData.violations === 0 ? 'success' : 'error'}">
                        ${sodData.violations === 0 ? '違反なし' : `${sodData.violations}件の違反`}
                    </span>
                </div>
                <div class="card-body">
                    <div class="alert ${sodData.violations === 0 ? 'alert-success' : 'alert-warning'}">
                        <i class="lucide-${sodData.violations === 0 ? 'shield-check' : 'alert-triangle'}"></i>
                        <span>
                            ${sodData.violations === 0
                                ? '承認者と実施者の分離が適切に行われています。'
                                : 'SOD違反が検出されました。早急に対応が必要です。'}
                        </span>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${sodData.total_checks}</div>
                                <div class="stat-label">総検証数</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-success">${sodData.passed}</div>
                                <div class="stat-label">検証合格</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-error">${sodData.violations}</div>
                                <div class="stat-label">違反検出</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${sodData.compliance_rate}%</div>
                                <div class="stat-label">遵守率</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SOD Rules -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">SODルール</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                        ${sodData.rules.map(rule => `
                            <div class="sod-rule-item" style="padding: var(--spacing-md); background: var(--background-secondary); border-radius: var(--border-radius); border-left: 4px solid ${rule.compliant ? 'var(--color-success)' : 'var(--color-error)'};">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 0.25rem;">${rule.name}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${rule.description}</div>
                                    </div>
                                    <span class="badge badge-${rule.compliant ? 'success' : 'error'}">
                                        ${rule.compliant ? '遵守' : '違反'}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Violation Details -->
            ${sodData.violation_details.length > 0 ? `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">違反詳細</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>日時</th>
                                        <th>チケット</th>
                                        <th>違反ルール</th>
                                        <th>承認者</th>
                                        <th>実施者</th>
                                        <th>状態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sodData.violation_details.map(v => `
                                        <tr>
                                            <td>${this.formatDateTime(v.timestamp)}</td>
                                            <td>
                                                <a href="#/tickets/${v.ticket_id}" class="link-primary">#${v.ticket_id}</a>
                                            </td>
                                            <td>${v.rule_violated}</td>
                                            <td>${v.approver}</td>
                                            <td>${v.executor}</td>
                                            <td>
                                                <span class="badge badge-${v.resolved ? 'success' : 'error'}">
                                                    ${v.resolved ? '解決済み' : '未解決'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    },

    /**
     * M365実施ログページ
     */
    async renderM365ExecutionLogs() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'M365実施ログ';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <input type="date" id="date-from" class="filter-input" placeholder="開始日">
                    <input type="date" id="date-to" class="filter-input" placeholder="終了日">
                    <select id="task-type-filter" class="filter-select">
                        <option value="">すべてのタスク</option>
                        <option value="license_assign">ライセンス付与</option>
                        <option value="license_revoke">ライセンス剥奪</option>
                        <option value="password_reset">パスワードリセット</option>
                        <option value="mailbox_permission">メールボックス権限</option>
                        <option value="group_membership">グループメンバーシップ</option>
                    </select>
                    <input type="text" id="operator-search" class="filter-input" placeholder="実施者で検索">
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

            <div id="m365-logs-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('refresh-btn').addEventListener('click', () => this.loadM365ExecutionLogs());
        document.getElementById('task-type-filter').addEventListener('change', () => this.loadM365ExecutionLogs());
        document.getElementById('export-btn').addEventListener('click', () => {
            Toast.info('M365ログのエクスポート機能は開発中です');
        });

        await this.loadM365ExecutionLogs();
    },

    async loadM365ExecutionLogs() {
        const container = document.getElementById('m365-logs-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const logs = await this.getMockM365ExecutionLogs();
            this.renderM365ExecutionLogsTable(logs);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderM365ExecutionLogsTable(logs) {
        const container = document.getElementById('m365-logs-content');

        const taskTypeLabels = {
            'license_assign': 'ライセンス付与',
            'license_revoke': 'ライセンス剥奪',
            'password_reset': 'パスワードリセット',
            'mfa_reset': 'MFAリセット',
            'mailbox_permission': 'メールボックス権限',
            'group_membership': 'グループメンバーシップ',
            'teams_create': 'Teams作成',
            'onedrive_restore': 'OneDriveリストア',
        };

        const methodLabels = {
            'admin_center': '管理センター',
            'powershell': 'PowerShell',
            'graph_api': 'Graph API',
        };

        container.innerHTML = `
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 180px;">実施日時</th>
                                    <th style="width: 120px;">チケット</th>
                                    <th style="width: 150px;">実施者</th>
                                    <th style="width: 180px;">タスクタイプ</th>
                                    <th>対象</th>
                                    <th style="width: 120px;">実施方法</th>
                                    <th style="width: 100px;">結果</th>
                                    <th style="width: 80px;">エビデンス</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.map(log => `
                                    <tr>
                                        <td>${this.formatDateTime(log.executed_at)}</td>
                                        <td>
                                            <a href="#/tickets/${log.ticket_id}" class="link-primary">#${log.ticket_id}</a>
                                        </td>
                                        <td>
                                            <div class="user-cell">
                                                <div class="avatar-sm">${log.operator_name.charAt(0)}</div>
                                                <span>${log.operator_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="badge badge-info">${taskTypeLabels[log.task_type] || log.task_type}</span>
                                        </td>
                                        <td style="font-family: monospace; font-size: 0.875rem;">${log.target_upn}</td>
                                        <td>
                                            <span class="badge badge-secondary">${methodLabels[log.method] || log.method}</span>
                                        </td>
                                        <td>
                                            ${log.success
                                                ? '<span class="badge badge-success">成功</span>'
                                                : '<span class="badge badge-error">失敗</span>'}
                                        </td>
                                        <td style="text-align: center;">
                                            ${log.has_evidence
                                                ? '<button class="btn btn-sm btn-secondary" onclick="Toast.info(\'エビデンス表示機能は開発中です\')"><i class="lucide-file"></i></button>'
                                                : '<span style="color: var(--text-tertiary);">-</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="pagination">
                <button class="btn btn-sm btn-secondary" disabled>前へ</button>
                <span>1 / 5</span>
                <button class="btn btn-sm btn-secondary">次へ</button>
            </div>
        `;
    },

    // ============== Utility Functions ==============

    formatDateTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    },

    formatValue(value) {
        if (value === null || value === undefined || value === '') {
            return '<span style="color: var(--text-tertiary);">-</span>';
        }
        return value;
    },

    exportAuditLogs() {
        Toast.info('監査ログのエクスポート機能は開発中です');
    },

    // ============== Mock Data Functions ==============

    async getMockAuditLogs() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        timestamp: '2026-01-21T10:30:00',
                        user_name: '山田太郎',
                        action: 'login',
                        details: 'ログインに成功しました',
                        ip_address: '192.168.1.100',
                        success: true,
                    },
                    {
                        timestamp: '2026-01-21T10:32:15',
                        user_name: '山田太郎',
                        action: 'ticket_create',
                        details: 'チケット #1234 を作成しました - メールアクセス不可',
                        ip_address: '192.168.1.100',
                        success: true,
                    },
                    {
                        timestamp: '2026-01-21T10:45:00',
                        user_name: '佐藤花子',
                        action: 'approval_approve',
                        details: 'M365タスク #567 を承認しました - ライセンス付与',
                        ip_address: '192.168.1.105',
                        success: true,
                    },
                    {
                        timestamp: '2026-01-21T11:00:22',
                        user_name: '鈴木一郎',
                        action: 'm365_execute',
                        details: 'M365操作を実施しました - user@example.com にライセンスを付与',
                        ip_address: '192.168.1.110',
                        success: true,
                    },
                    {
                        timestamp: '2026-01-21T11:15:45',
                        user_name: '田中次郎',
                        action: 'ticket_update',
                        details: 'チケット #1234 のステータスを "resolved" に変更しました',
                        ip_address: '192.168.1.102',
                        success: true,
                    },
                ]);
            }, 500);
        });
    },

    async getMockOperationHistory() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        timestamp: '2026-01-21T10:32:15',
                        ticket_id: '1234',
                        actor_name: '山田太郎',
                        change_type: 'ステータス変更',
                        before: 'new',
                        after: 'assigned',
                    },
                    {
                        timestamp: '2026-01-21T10:35:00',
                        ticket_id: '1234',
                        actor_name: '佐藤花子',
                        change_type: '担当者変更',
                        before: '未割当',
                        after: '鈴木一郎',
                    },
                    {
                        timestamp: '2026-01-21T10:40:30',
                        ticket_id: '1234',
                        actor_name: '佐藤花子',
                        change_type: '優先度変更',
                        before: 'P3',
                        after: 'P2',
                    },
                    {
                        timestamp: '2026-01-21T11:15:45',
                        ticket_id: '1234',
                        actor_name: '田中次郎',
                        change_type: 'ステータス変更',
                        before: 'in_progress',
                        after: 'resolved',
                    },
                ]);
            }, 500);
        });
    },

    async getMockSLAData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    total_tickets: 250,
                    total_met: 235,
                    total_breached: 15,
                    at_risk: 8,
                    by_priority: {
                        p1: { total: 10, met: 10, breached: 0, avg_resolution_time: '1.5時間' },
                        p2: { total: 40, met: 38, breached: 2, avg_resolution_time: '6時間' },
                        p3: { total: 120, met: 110, breached: 10, avg_resolution_time: '2営業日' },
                        p4: { total: 80, met: 77, breached: 3, avg_resolution_time: '4営業日' },
                    },
                });
            }, 500);
        });
    },

    async getMockComplianceData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    overall_score: 97,
                    categories: [
                        {
                            name: 'インシデント管理',
                            score: 98,
                            requirements: [
                                { name: '全インシデントの記録', met: true },
                                { name: '優先度の適切な設定', met: true },
                                { name: 'SLA遵守', met: true },
                                { name: '解決後のレビュー', met: true },
                            ],
                        },
                        {
                            name: '変更管理',
                            score: 95,
                            requirements: [
                                { name: '承認フローの実施', met: true },
                                { name: '変更影響評価', met: true },
                                { name: 'ロールバック計画', met: true },
                                { name: '変更後レビュー', met: false },
                            ],
                        },
                        {
                            name: '監査証跡',
                            score: 100,
                            requirements: [
                                { name: 'すべての操作の記録', met: true },
                                { name: '削除不可の保証', met: true },
                                { name: '2年以上の保持', met: true },
                                { name: '整合性の検証', met: true },
                            ],
                        },
                        {
                            name: '職務分離',
                            score: 96,
                            requirements: [
                                { name: '承認者≠実施者', met: true },
                                { name: 'SOD違反の検出', met: true },
                                { name: '定期的なレビュー', met: true },
                                { name: '違反時の是正', met: true },
                            ],
                        },
                    ],
                    audit_trail: {
                        total_records: 12450,
                        verified_records: 12450,
                        tampered_records: 0,
                        retention_days: 730,
                    },
                });
            }, 500);
        });
    },

    async getMockSODData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    total_checks: 150,
                    passed: 150,
                    violations: 0,
                    compliance_rate: 100,
                    rules: [
                        {
                            name: '承認者と実施者の分離',
                            description: 'M365操作の承認者と実施者が同一人物でないことを確認',
                            compliant: true,
                        },
                        {
                            name: '申請者と承認者の分離',
                            description: 'チケット申請者と承認者が同一人物でないことを確認',
                            compliant: true,
                        },
                        {
                            name: '実施者と検証者の分離',
                            description: 'M365操作の実施者と最終検証者が異なることを確認',
                            compliant: true,
                        },
                    ],
                    violation_details: [],
                });
            }, 500);
        });
    },

    async getMockM365ExecutionLogs() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        ticket_id: '1234',
                        executed_at: '2026-01-21T11:00:00',
                        operator_name: '鈴木一郎',
                        task_type: 'license_assign',
                        target_upn: 'user001@example.com',
                        method: 'admin_center',
                        success: true,
                        has_evidence: true,
                    },
                    {
                        ticket_id: '1235',
                        executed_at: '2026-01-21T11:30:00',
                        operator_name: '鈴木一郎',
                        task_type: 'password_reset',
                        target_upn: 'user002@example.com',
                        method: 'powershell',
                        success: true,
                        has_evidence: true,
                    },
                    {
                        ticket_id: '1236',
                        executed_at: '2026-01-21T12:00:00',
                        operator_name: '田中次郎',
                        task_type: 'mailbox_permission',
                        target_upn: 'user003@example.com',
                        method: 'graph_api',
                        success: true,
                        has_evidence: true,
                    },
                    {
                        ticket_id: '1237',
                        executed_at: '2026-01-21T12:30:00',
                        operator_name: '鈴木一郎',
                        task_type: 'group_membership',
                        target_upn: 'user004@example.com',
                        method: 'admin_center',
                        success: true,
                        has_evidence: false,
                    },
                ]);
            }, 500);
        });
    },
};

// Export for use
window.AuditPage = AuditPage;
