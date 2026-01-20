/**
 * Mirai HelpDesk - Sidebar Component
 */

const Sidebar = {
    /**
     * Navigation items based on user role
     */
    getNavItems() {
        const user = Auth.getUser();
        const role = user?.role || 'requester';

        const items = [
            {
                section: 'メイン',
                items: [
                    { path: '/dashboard', icon: 'lucide-layout-dashboard', label: 'ダッシュボード', roles: ['all'] },
                    { path: '/tickets', icon: 'lucide-ticket', label: 'チケット', roles: ['all'] },
                    { path: '/knowledge', icon: 'lucide-book-open', label: 'ナレッジ', roles: ['all'] },
                ],
            },
            {
                section: 'M365 管理',
                items: [
                    { path: '/m365/tasks', icon: 'lucide-cloud', label: 'M365 タスク', roles: ['agent', 'm365_operator', 'manager'] },
                    { path: '/m365/approvals', icon: 'lucide-check-square', label: '承認待ち', roles: ['approver', 'manager'] },
                    { path: '/m365/users', icon: 'lucide-user-search', label: 'ユーザー検索', roles: ['agent', 'm365_operator', 'manager'] },
                    { path: '/m365/licenses', icon: 'lucide-key', label: 'ライセンス管理', roles: ['m365_operator', 'manager'] },
                ],
            },
            {
                section: '管理',
                items: [
                    { path: '/users', icon: 'lucide-users', label: 'ユーザー管理', roles: ['manager'] },
                    { path: '/reports', icon: 'lucide-bar-chart-3', label: 'レポート', roles: ['manager', 'auditor'] },
                    { path: '/settings', icon: 'lucide-settings', label: '設定', roles: ['manager'] },
                ],
            },
        ];

        // Filter based on role
        return items.map(section => ({
            ...section,
            items: section.items.filter(item =>
                item.roles.includes('all') || item.roles.includes(role)
            ),
        })).filter(section => section.items.length > 0);
    },

    /**
     * Render sidebar navigation
     */
    render() {
        const navMenu = document.getElementById('nav-menu');
        const sections = this.getNavItems();

        let html = '';

        sections.forEach((section, index) => {
            if (index > 0) {
                html += `<li class="nav-section-title">${section.section}</li>`;
            }

            section.items.forEach(item => {
                const isActive = Router.getCurrentPath() === item.path;
                html += `
                    <li>
                        <a href="#${item.path}" class="nav-link ${isActive ? 'active' : ''}" data-path="${item.path}">
                            <i class="${item.icon}"></i>
                            <span>${item.label}</span>
                        </a>
                    </li>
                `;
            });
        });

        navMenu.innerHTML = html;
    },

    /**
     * Update user info in sidebar
     */
    updateUserInfo() {
        const userInfo = document.getElementById('user-info');
        const user = Auth.getUser();

        if (user) {
            const initials = user.display_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

            userInfo.innerHTML = `
                <div class="user-avatar">${initials}</div>
                <div class="user-details">
                    <div class="user-name">${user.display_name}</div>
                    <div class="user-role">${Auth.getRoleDisplayName(user.role)}</div>
                </div>
            `;
        }
    },

    /**
     * Update active nav item
     */
    updateActive(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.path === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    /**
     * Toggle sidebar collapsed state
     */
    toggle() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
    },
};

// Export for use
window.Sidebar = Sidebar;
