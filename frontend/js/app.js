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
        Router.register('/incidents', () => IncidentsPage.render());
        Router.register('/incidents/priority', () => IncidentsPage.render({ view: 'priority' }));
        Router.register('/incidents/sla', () => IncidentsPage.render({ view: 'sla' }));

        // Service Request Management
        Router.register('/service-requests', () => ServiceRequestsPage.render());
        Router.register('/service-requests/standard', () => ServiceRequestsPage.render({ view: 'standard' }));
        Router.register('/service-requests/approvals', () => M365ApprovalsPage.render());

        // Change Management
        Router.register('/changes', () => ChangesPage.render());
        Router.register('/changes/m365', () => ChangesPage.render({ view: 'm365' }));
        Router.register('/changes/approval-flow', () => ApprovalFlowPage.render());

        // Knowledge Management
        Router.register('/knowledge', () => KnowledgePage.render());
        Router.register('/knowledge/faq', () => KnowledgeFilteredPage.renderFAQ());
        Router.register('/knowledge/procedures', () => KnowledgeFilteredPage.renderProcedures());
        Router.register('/knowledge/known-issues', () => KnowledgeFilteredPage.renderKnownIssues());

        // M365 Operations
        Router.register('/m365/tasks', () => M365TasksPage.render());
        Router.register('/m365/users', () => M365UsersPage.render());
        Router.register('/m365/licenses', () => M365LicensesPage.render());
        Router.register('/m365/execution-logs', () => AuditPage.renderM365ExecutionLogs());

        // Audit & Compliance
        Router.register('/audit/logs', () => AuditPage.renderAuditLogs());
        Router.register('/audit/operation-history', () => AuditPage.renderOperationHistory());
        Router.register('/audit/sla-achievement', () => AuditPage.renderSLAAchievement());
        Router.register('/audit/compliance-report', () => AuditPage.renderComplianceReport());
        Router.register('/audit/sod-check', () => AuditPage.renderSODCheck());

        // Reports & Analytics
        Router.register('/reports', () => ReportsPage.render());
        Router.register('/reports/monthly', () => ReportsExtendedPage.renderMonthlyReport());
        Router.register('/reports/export', () => ReportsExtendedPage.renderExportPage());

        // System Administration
        Router.register('/users', () => UsersPage.render());
        Router.register('/settings/sla-policies', () => SettingsExtendedPage.renderSLAPolicies());
        Router.register('/settings/categories', () => SettingsExtendedPage.renderCategories());
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
