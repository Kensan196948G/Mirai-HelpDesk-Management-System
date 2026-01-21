/**
 * Mirai HelpDesk - Main Application
 */

const App = {
    async init() {
        // Check authentication
        if (!Auth.isAuthenticated()) {
            this.showLogin();
            return;
        }

        // Initialize UI
        this.initUI();

        // Initialize router
        this.initRouter();
    },

    showLogin() {
        Modal.show('login-modal');

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            try {
                await Auth.login(email, password);
                Modal.hide();
                this.init();
            } catch (error) {
                errorEl.textContent = error.message || 'ログインに失敗しました';
                errorEl.style.display = 'block';
            }
        });
    },

    initUI() {
        // Render sidebar
        Sidebar.render();
        Sidebar.updateUserInfo();

        // Sidebar toggle (optional)
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                Sidebar.toggle();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }
    },

    initRouter() {
        // Dashboard
        Router.register('/dashboard', () => DashboardPage.render());

        // Incident Management
        Router.register('/incidents', () => TicketsPage.render({ type: 'incident' }));
        Router.register('/incidents/priority', () => TicketsPage.render({ view: 'priority' }));
        Router.register('/incidents/sla', () => TicketsPage.render({ view: 'sla' }));

        // Service Request Management
        Router.register('/service-requests', () => TicketsPage.render({ type: 'service_request' }));
        Router.register('/service-requests/standard', () => TicketsPage.render({ view: 'standard' }));
        Router.register('/service-requests/approvals', () => M365ApprovalsPage.render());

        // Change Management
        Router.register('/changes', () => TicketsPage.render({ type: 'change' }));
        Router.register('/changes/m365', () => M365TasksPage.render());
        Router.register('/changes/approval-flow', () => M365ApprovalsPage.render({ view: 'flow' }));

        // Knowledge Management
        Router.register('/knowledge', () => KnowledgePage.render());
        Router.register('/knowledge/faq', () => KnowledgePage.render({ category: 'faq' }));
        Router.register('/knowledge/procedures', () => KnowledgePage.render({ category: 'procedure' }));
        Router.register('/knowledge/known-issues', () => KnowledgePage.render({ category: 'known_issue' }));

        // M365 Operations
        Router.register('/m365/tasks', () => M365TasksPage.render());
        Router.register('/m365/users', () => M365UsersPage.render());
        Router.register('/m365/licenses', () => M365LicensesPage.render());
        Router.register('/m365/execution-logs', () => {
            this.renderPlaceholder('M365実施ログ', 'M365操作の実施記録を表示します。');
        });

        // Audit & Compliance
        Router.register('/audit/logs', () => {
            this.renderPlaceholder('監査ログ', 'すべての操作履歴を表示します。');
        });
        Router.register('/audit/operation-history', () => {
            this.renderPlaceholder('操作履歴', 'チケット変更履歴を表示します。');
        });
        Router.register('/audit/sla-achievement', () => {
            this.renderPlaceholder('SLA達成率', 'サービスレベルの評価を表示します。');
        });
        Router.register('/audit/compliance-report', () => {
            this.renderPlaceholder('コンプライアンスレポート', '規制遵守状況を表示します。');
        });
        Router.register('/audit/sod-check', () => {
            this.renderPlaceholder('SOD検証', '職務分離の遵守確認を表示します。');
        });

        // Reports & Analytics
        Router.register('/reports', () => ReportsPage.render());
        Router.register('/reports/monthly', () => {
            this.renderPlaceholder('月次レポート', '月次パフォーマンス評価を表示します。');
        });
        Router.register('/reports/export', () => {
            this.renderPlaceholder('エクスポート', '監査用データのエクスポート機能を提供します。');
        });

        // System Administration
        Router.register('/users', () => UsersPage.render());
        Router.register('/settings/sla-policies', () => {
            this.renderPlaceholder('SLAポリシー設定', 'SLA目標値の設定を行います。');
        });
        Router.register('/settings/categories', () => {
            this.renderPlaceholder('カテゴリ管理', 'チケット分類の管理を行います。');
        });
        Router.register('/settings', () => SettingsPage.render());

        // Legacy routes (backward compatibility)
        Router.register('/tickets', () => Router.navigate('/incidents'));
        Router.register('/m365/approvals', () => Router.navigate('/service-requests/approvals'));

        // Initialize router
        Router.init();
    },

    /**
     * Render placeholder page for未実装の機能
     */
    renderPlaceholder(title, description) {
        document.getElementById('page-title').textContent = title;
        document.getElementById('page-content').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-tools" style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <h3>${title}</h3>
                <p style="max-width: 500px; margin-top: 0.5rem;">${description}</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">
                    この機能は今後実装予定です。
                </p>
            </div>
        `;
    }
};

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
