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
        // Register routes
        Router.register('/dashboard', () => DashboardPage.render());
        Router.register('/tickets', () => TicketsPage.render());
        Router.register('/knowledge', () => KnowledgePage.render());

        // M365 management routes
        Router.register('/m365/tasks', () => M365TasksPage.render());
        Router.register('/m365/approvals', () => M365ApprovalsPage.render());
        Router.register('/m365/users', () => M365UsersPage.render());
        Router.register('/m365/licenses', () => M365LicensesPage.render());

        // Admin routes
        Router.register('/users', () => UsersPage.render());
        Router.register('/reports', () => ReportsPage.render());
        Router.register('/settings', () => SettingsPage.render());

        // Initialize router
        Router.init();
    }
};

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
