/**
 * Mirai HelpDesk - Dashboard Page
 */

const DashboardPage = {
    /**
     * Render dashboard
     */
    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'ダッシュボード';

        content.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>読み込み中...</p>
            </div>
        `;

        try {
            const stats = await API.getDashboardStats();
            this.renderContent(stats);
        } catch (error) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-alert-circle"></i>
                    <h3>データを取得できませんでした</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render dashboard content
     */
    renderContent(stats) {
        const content = document.getElementById('page-content');

        content.innerHTML = `
            <!-- Project Introduction -->
            <div class="project-intro">
                <div class="intro-header">
                    <i class="fas fa-info-circle"></i>
                    <h2>Mirai ヘルプデスクとは</h2>
                </div>

                <div class="intro-cards">
                    <div class="intro-card">
                        <i class="fas fa-bullseye"></i>
                        <h3>目的</h3>
                        <p>社内のIT関連の困りごとを迅速に解決し、業務を円滑に進めるための窓口です</p>
                    </div>

                    <div class="intro-card">
                        <i class="fas fa-heart"></i>
                        <h3>意義</h3>
                        <p>全社員が安心してITシステムを利用でき、生産性を最大化できる環境を提供します</p>
                    </div>

                    <div class="intro-card">
                        <i class="fas fa-shield-alt"></i>
                        <h3>品質保証</h3>
                        <p>ITSM（ITサービス管理）とISO20000に準拠した、監査証跡完備の信頼できるシステムです</p>
                    </div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="lucide-ticket"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.total_tickets}</div>
                        <div class="stat-label">総チケット数</div>
                        <div class="stat-description">
                            <i class="fas fa-info-circle"></i>
                            現在対応中および過去のすべての問い合わせ件数
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="lucide-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.open_tickets}</div>
                        <div class="stat-label">対応中</div>
                        <div class="stat-description">
                            <i class="fas fa-info-circle"></i>
                            現在IT部門が対応を進めているチケット数
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="lucide-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.resolved_today}</div>
                        <div class="stat-label">本日解決</div>
                        <div class="stat-description">
                            <i class="fas fa-info-circle"></i>
                            今日中に解決できた問い合わせの件数
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon error">
                        <i class="lucide-alert-triangle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.overdue_tickets}</div>
                        <div class="stat-label">期限超過</div>
                        <div class="stat-description">
                            <i class="fas fa-info-circle"></i>
                            対応期限を過ぎているチケット（優先対応中）
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Main Content Grid -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--spacing-lg);">
                <!-- Left Column -->
                <div>
                    <!-- Status Chart -->
                    <div class="card" style="margin-bottom: var(--spacing-lg);">
                        <div class="card-header">
                            <h3 class="card-title">ステータス別チケット</h3>
                        </div>
                        <div class="chart-placeholder">
                            ${this.renderStatusBars(stats.tickets_by_status)}
                        </div>
                    </div>
                    
                    <!-- Recent Activity -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">最近のアクティビティ</h3>
                            <a href="#/tickets" class="btn btn-ghost">すべて見る</a>
                        </div>
                        <div id="recent-tickets" class="ticket-list">
                            <div class="empty-state" style="padding: var(--spacing-lg);">
                                <i class="lucide-inbox"></i>
                                <p>最近のチケットはありません</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Column -->
                <div>
                    <!-- Priority Distribution -->
                    <div class="card" style="margin-bottom: var(--spacing-lg);">
                        <div class="card-header">
                            <h3 class="card-title">優先度別</h3>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            ${this.renderPriorityBars(stats.tickets_by_priority)}
                        </div>
                    </div>
                    
                    <!-- Category Distribution -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">カテゴリ別</h3>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            ${this.renderCategoryList(stats.tickets_by_category)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render status bars
     */
    renderStatusBars(statusData) {
        const statusLabels = {
            'new': '新規',
            'triage': '分類中',
            'assigned': '割当済',
            'in_progress': '対応中',
            'pending_customer': '回答待ち',
            'pending_approval': '承認待ち',
            'resolved': '解決済',
            'closed': '完了',
        };

        const total = Object.values(statusData).reduce((a, b) => a + b, 0) || 1;

        let html = '<div style="display: flex; flex-direction: column; gap: 8px; padding: 16px;">';

        for (const [status, count] of Object.entries(statusData)) {
            const percentage = Math.round((count / total) * 100);
            html += `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="width: 80px; font-size: 13px; color: var(--color-text-secondary);">
                        ${statusLabels[status] || status}
                    </span>
                    <div style="flex: 1; height: 8px; background: var(--color-bg-tertiary); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: var(--color-primary); border-radius: 4px;"></div>
                    </div>
                    <span style="width: 40px; text-align: right; font-size: 13px;">${count}</span>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    /**
     * Render priority bars
     */
    renderPriorityBars(priorityData) {
        const priorityConfig = {
            'p1': { label: 'P1 - 緊急', color: 'var(--color-p1)' },
            'p2': { label: 'P2 - 高', color: 'var(--color-p2)' },
            'p3': { label: 'P3 - 中', color: 'var(--color-p3)' },
            'p4': { label: 'P4 - 低', color: 'var(--color-p4)' },
        };

        let html = '';

        for (const [priority, config] of Object.entries(priorityConfig)) {
            const count = priorityData[priority] || 0;
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${config.color};"></span>
                        <span style="font-size: 14px;">${config.label}</span>
                    </div>
                    <span style="font-weight: 600;">${count}</span>
                </div>
            `;
        }

        return html;
    },

    /**
     * Render category list
     */
    renderCategoryList(categoryData) {
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

        const sorted = Object.entries(categoryData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sorted.length === 0) {
            return '<p style="color: var(--color-text-tertiary); text-align: center; padding: 16px;">データなし</p>';
        }

        let html = '';

        for (const [category, count] of sorted) {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 6px;">
                    <span style="font-size: 14px;">${categoryLabels[category] || category}</span>
                    <span class="badge badge-primary">${count}</span>
                </div>
            `;
        }

        return html;
    },
};

// Export for use
window.DashboardPage = DashboardPage;
