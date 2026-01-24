/**
 * Mirai HelpDesk - Extended Reports Pages
 *
 * レポート・分析機能:
 * - 月次レポート
 * - データエクスポート
 */

const ReportsExtendedPage = {
    /**
     * 月次レポートページ
     */
    async renderMonthlyReport() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '月次レポート';

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="year-select" class="filter-select">
                        <option value="${currentYear}">${currentYear}年</option>
                        <option value="${currentYear - 1}">${currentYear - 1}年</option>
                        <option value="${currentYear - 2}">${currentYear - 2}年</option>
                    </select>
                    <select id="month-select" class="filter-select">
                        ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                            <option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}月</option>
                        `).join('')}
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="export-pdf-btn" class="btn btn-secondary">
                        <i class="lucide-file-text"></i><span>PDF出力</span>
                    </button>
                    <button id="export-csv-btn" class="btn btn-secondary">
                        <i class="lucide-table"></i><span>CSV出力</span>
                    </button>
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>

            <div id="monthly-report-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('year-select').addEventListener('change', () => this.loadMonthlyReport());
        document.getElementById('month-select').addEventListener('change', () => this.loadMonthlyReport());
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadMonthlyReport());
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportMonthlyReportPDF());
        document.getElementById('export-csv-btn').addEventListener('click', () => this.exportMonthlyReportCSV());

        await this.loadMonthlyReport();
    },

    async loadMonthlyReport() {
        const container = document.getElementById('monthly-report-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const year = document.getElementById('year-select').value;
            const month = document.getElementById('month-select').value;

            const report = await this.getMockMonthlyReport(year, month);
            this.renderMonthlyReportContent(report, year, month);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderMonthlyReportContent(report, year, month) {
        const container = document.getElementById('monthly-report-content');

        container.innerHTML = `
            <!-- Report Header -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">${year}年${month}月 月次KPIレポート</h3>
                    <span class="badge badge-info">レポート期間: ${year}/${month}/1 - ${year}/${month}/${report.days_in_month}</span>
                </div>
                <div class="card-body">
                    <div style="color: var(--text-secondary); line-height: 1.6;">
                        <p>このレポートは、${year}年${month}月のヘルプデスクパフォーマンスをまとめたものです。</p>
                        <p>ITIL/ISO20000の基準に基づいて評価しています。</p>
                    </div>
                </div>
            </div>

            <!-- Executive Summary -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">エグゼクティブサマリー</h3>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.summary.total_tickets}</div>
                                <div class="stat-label">総チケット数</div>
                                <div class="stat-trend ${report.summary.ticket_trend >= 0 ? 'positive' : 'negative'}">
                                    <i class="lucide-trending-${report.summary.ticket_trend >= 0 ? 'up' : 'down'}"></i>
                                    <span>${Math.abs(report.summary.ticket_trend)}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.summary.resolved_tickets}</div>
                                <div class="stat-label">解決済み</div>
                                <div class="stat-trend positive">
                                    <i class="lucide-check-circle"></i>
                                    <span>${Math.round((report.summary.resolved_tickets / report.summary.total_tickets) * 100)}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.summary.sla_compliance}%</div>
                                <div class="stat-label">SLA達成率</div>
                                <div class="stat-trend ${report.summary.sla_trend >= 0 ? 'positive' : 'negative'}">
                                    <i class="lucide-trending-${report.summary.sla_trend >= 0 ? 'up' : 'down'}"></i>
                                    <span>${Math.abs(report.summary.sla_trend)}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.summary.avg_resolution_time}</div>
                                <div class="stat-label">平均解決時間</div>
                                <div class="stat-trend ${report.summary.resolution_trend <= 0 ? 'positive' : 'negative'}">
                                    <i class="lucide-clock"></i>
                                    <span>${Math.abs(report.summary.resolution_trend)}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.summary.customer_satisfaction}%</div>
                                <div class="stat-label">顧客満足度</div>
                                <div class="stat-trend positive">
                                    <i class="lucide-smile"></i>
                                    <span>Good</span>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.summary.first_response_time}</div>
                                <div class="stat-label">初動対応時間</div>
                                <div class="stat-trend positive">
                                    <i class="lucide-zap"></i>
                                    <span>Fast</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); margin-bottom: var(--spacing-lg);">
                <!-- Ticket Volume by Category -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">カテゴリ別チケット数</h3>
                    </div>
                    <div class="card-body">
                        ${this.renderCategoryChart(report.by_category)}
                    </div>
                </div>

                <!-- Ticket Volume by Priority -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">優先度別チケット数</h3>
                    </div>
                    <div class="card-body">
                        ${this.renderPriorityChart(report.by_priority)}
                    </div>
                </div>
            </div>

            <!-- SLA Performance -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">SLAパフォーマンス</h3>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>優先度</th>
                                    <th>目標時間</th>
                                    <th>平均解決時間</th>
                                    <th>SLA達成数</th>
                                    <th>SLA違反数</th>
                                    <th>達成率</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderSLAPerformanceRows(report.sla_performance)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Team Performance -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">チームパフォーマンス</h3>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>担当者</th>
                                    <th>割当数</th>
                                    <th>解決数</th>
                                    <th>解決率</th>
                                    <th>平均解決時間</th>
                                    <th>顧客満足度</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.team_performance.map(member => `
                                    <tr>
                                        <td>
                                            <div class="user-cell">
                                                <div class="avatar-sm">${member.name.charAt(0)}</div>
                                                <span>${member.name}</span>
                                            </div>
                                        </td>
                                        <td>${member.assigned}</td>
                                        <td>${member.resolved}</td>
                                        <td>
                                            <span style="font-weight: 600; color: ${member.resolution_rate >= 90 ? 'var(--color-success)' : 'var(--color-warning)'};">
                                                ${member.resolution_rate}%
                                            </span>
                                        </td>
                                        <td>${member.avg_resolution_time}</td>
                                        <td>
                                            <span class="badge badge-${member.satisfaction >= 4.5 ? 'success' : member.satisfaction >= 4.0 ? 'warning' : 'error'}">
                                                ${member.satisfaction}/5.0
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- M365 Operations -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">M365操作統計</h3>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.m365_operations.total}</div>
                                <div class="stat-label">総操作数</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-success">${report.m365_operations.successful}</div>
                                <div class="stat-label">成功</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value text-error">${report.m365_operations.failed}</div>
                                <div class="stat-label">失敗</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">${report.m365_operations.success_rate}%</div>
                                <div class="stat-label">成功率</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: var(--spacing-lg);">
                        <h4 style="margin-bottom: var(--spacing-md);">操作タイプ別</h4>
                        ${this.renderM365OperationsBars(report.m365_operations.by_type)}
                    </div>
                </div>
            </div>
        `;
    },

    renderCategoryChart(byCategory) {
        const total = Object.values(byCategory).reduce((a, b) => a + b, 0) || 1;

        let html = '<div style="display: flex; flex-direction: column; gap: var(--spacing-md);">';

        for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
            const percentage = Math.round((count / total) * 100);
            html += `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-size: 0.875rem;">${category}</span>
                        <span style="font-weight: 600;">${count} (${percentage}%)</span>
                    </div>
                    <div class="progress-bar" style="height: 20px;">
                        <div class="progress-fill primary" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    renderPriorityChart(byPriority) {
        const priorities = ['P1', 'P2', 'P3', 'P4'];
        const total = Object.values(byPriority).reduce((a, b) => a + b, 0) || 1;

        let html = '<div style="display: flex; flex-direction: column; gap: var(--spacing-md);">';

        for (const priority of priorities) {
            const count = byPriority[priority] || 0;
            const percentage = Math.round((count / total) * 100);
            html += `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span class="badge badge-${priority.toLowerCase()}">${priority}</span>
                        <span style="font-weight: 600;">${count} (${percentage}%)</span>
                    </div>
                    <div class="progress-bar" style="height: 20px;">
                        <div class="progress-fill" style="width: ${percentage}%; background: var(--color-${priority.toLowerCase()});"></div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    renderSLAPerformanceRows(slaPerformance) {
        const priorities = ['P1', 'P2', 'P3', 'P4'];
        const targets = {
            'P1': '2時間',
            'P2': '8時間',
            'P3': '3営業日',
            'P4': '5営業日',
        };

        let html = '';
        for (const priority of priorities) {
            const data = slaPerformance[priority];
            const rate = data.total > 0 ? Math.round((data.met / data.total) * 100) : 100;

            html += `
                <tr>
                    <td><span class="badge badge-${priority.toLowerCase()}">${priority}</span></td>
                    <td>${targets[priority]}</td>
                    <td>${data.avg_time}</td>
                    <td class="text-success">${data.met}</td>
                    <td class="text-error">${data.breached}</td>
                    <td>
                        <span style="font-weight: 600; color: ${rate >= 95 ? 'var(--color-success)' : rate >= 80 ? 'var(--color-warning)' : 'var(--color-error)'};">
                            ${rate}%
                        </span>
                    </td>
                </tr>
            `;
        }
        return html;
    },

    renderM365OperationsBars(byType) {
        const total = Object.values(byType).reduce((a, b) => a + b, 0) || 1;

        let html = '<div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">';

        for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
            const percentage = Math.round((count / total) * 100);
            html += `
                <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                    <div style="min-width: 150px; font-size: 0.875rem;">${type}</div>
                    <div class="progress-bar" style="flex: 1; height: 16px;">
                        <div class="progress-fill info" style="width: ${percentage}%"></div>
                    </div>
                    <div style="min-width: 60px; text-align: right; font-weight: 600;">${count}</div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    exportMonthlyReportPDF() {
        Toast.info('PDF出力機能は開発中です');
    },

    exportMonthlyReportCSV() {
        Toast.info('CSV出力機能は開発中です');
    },

    /**
     * データエクスポートページ
     */
    async renderExportPage() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'データエクスポート';

        content.innerHTML = `
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">チケットデータのエクスポート</h3>
                </div>
                <div class="card-body">
                    <form id="ticket-export-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>開始日 <span class="required">*</span></label>
                                <input type="date" name="start_date" required>
                            </div>
                            <div class="form-group">
                                <label>終了日 <span class="required">*</span></label>
                                <input type="date" name="end_date" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>フォーマット</label>
                            <select name="format">
                                <option value="csv">CSV</option>
                                <option value="json">JSON</option>
                                <option value="excel">Excel (XLSX)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>含めるフィールド</label>
                            <div class="checkbox-group" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm);">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="ticket_id" checked disabled>
                                    <span>チケット番号</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="subject" checked>
                                    <span>件名</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="status" checked>
                                    <span>ステータス</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="priority" checked>
                                    <span>優先度</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="category" checked>
                                    <span>カテゴリ</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="requester">
                                    <span>依頼者</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="assignee">
                                    <span>担当者</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="created_at">
                                    <span>作成日時</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="fields" value="resolved_at">
                                    <span>解決日時</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="lucide-download"></i><span>エクスポート</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">監査ログのエクスポート</h3>
                </div>
                <div class="card-body">
                    <form id="audit-export-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>開始日 <span class="required">*</span></label>
                                <input type="date" name="start_date" required>
                            </div>
                            <div class="form-group">
                                <label>終了日 <span class="required">*</span></label>
                                <input type="date" name="end_date" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>フォーマット</label>
                            <select name="format">
                                <option value="csv">CSV</option>
                                <option value="json">JSON</option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="lucide-download"></i><span>エクスポート</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">M365実施ログのエクスポート</h3>
                </div>
                <div class="card-body">
                    <form id="m365-export-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>開始日 <span class="required">*</span></label>
                                <input type="date" name="start_date" required>
                            </div>
                            <div class="form-group">
                                <label>終了日 <span class="required">*</span></label>
                                <input type="date" name="end_date" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>フォーマット</label>
                            <select name="format">
                                <option value="csv">CSV</option>
                                <option value="json">JSON</option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="lucide-download"></i><span>エクスポート</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('ticket-export-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.exportTickets(new FormData(e.target));
        });

        document.getElementById('audit-export-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.exportAuditLogs(new FormData(e.target));
        });

        document.getElementById('m365-export-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.exportM365Logs(new FormData(e.target));
        });
    },

    exportTickets(formData) {
        const format = formData.get('format');
        Toast.success(`チケットデータを${format.toUpperCase()}形式でエクスポートしています...`);
        // 本番ではAPIを呼び出してファイルをダウンロード
    },

    exportAuditLogs(formData) {
        const format = formData.get('format');
        Toast.success(`監査ログを${format.toUpperCase()}形式でエクスポートしています...`);
    },

    exportM365Logs(formData) {
        const format = formData.get('format');
        Toast.success(`M365実施ログを${format.toUpperCase()}形式でエクスポートしています...`);
    },

    // ============== Mock Data ==============

    async getMockMonthlyReport(year, month) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    year,
                    month,
                    days_in_month: 31,
                    summary: {
                        total_tickets: 250,
                        resolved_tickets: 235,
                        ticket_trend: 5,
                        sla_compliance: 94,
                        sla_trend: 2,
                        avg_resolution_time: '2.5営業日',
                        resolution_trend: -5,
                        customer_satisfaction: 92,
                        first_response_time: '1.2時間',
                    },
                    by_category: {
                        'アカウント': 60,
                        'ライセンス': 45,
                        'メール': 40,
                        'Teams': 35,
                        'ネットワーク': 30,
                        'ハードウェア': 25,
                        'その他': 15,
                    },
                    by_priority: {
                        'P1': 10,
                        'P2': 40,
                        'P3': 120,
                        'P4': 80,
                    },
                    sla_performance: {
                        'P1': { total: 10, met: 10, breached: 0, avg_time: '1.5時間' },
                        'P2': { total: 40, met: 38, breached: 2, avg_time: '6時間' },
                        'P3': { total: 120, met: 110, breached: 10, avg_time: '2営業日' },
                        'P4': { total: 80, met: 77, breached: 3, avg_time: '4営業日' },
                    },
                    team_performance: [
                        {
                            name: '鈴木一郎',
                            assigned: 85,
                            resolved: 80,
                            resolution_rate: 94,
                            avg_resolution_time: '2.2営業日',
                            satisfaction: 4.6,
                        },
                        {
                            name: '田中次郎',
                            assigned: 75,
                            resolved: 70,
                            resolution_rate: 93,
                            avg_resolution_time: '2.4営業日',
                            satisfaction: 4.5,
                        },
                        {
                            name: '佐藤花子',
                            assigned: 90,
                            resolved: 85,
                            resolution_rate: 94,
                            avg_resolution_time: '2.3営業日',
                            satisfaction: 4.7,
                        },
                    ],
                    m365_operations: {
                        total: 150,
                        successful: 147,
                        failed: 3,
                        success_rate: 98,
                        by_type: {
                            'ライセンス付与': 45,
                            'パスワードリセット': 35,
                            'メールボックス権限': 28,
                            'グループメンバーシップ': 22,
                            'MFAリセット': 12,
                            'その他': 8,
                        },
                    },
                });
            }, 500);
        });
    },
};

// Export for use
window.ReportsExtendedPage = ReportsExtendedPage;
