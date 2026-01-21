/**
 * Mirai HelpDesk - Sidebar Component
 */

const Sidebar = {
    /**
     * Navigation items based on user role
     * ITSM/ISO20000準拠のメニュー構造
     */
    getNavItems() {
        const user = Auth.getUser();
        const role = user?.role || 'requester';

        const items = [
            {
                section: 'ダッシュボード',
                items: [
                    {
                        path: '/dashboard',
                        icon: 'fa-solid fa-chart-line',
                        label: 'ダッシュボード',
                        roles: ['all'],
                        purpose: '全体状況の可視化',
                        value: 'リアルタイムKPI監視',
                        necessity: 'ISO20000: サービス状況の把握'
                    },
                ],
            },
            {
                section: 'インシデント管理',
                description: 'Incident Management - 障害・不具合の対応',
                items: [
                    {
                        path: '/incidents',
                        icon: 'fa-solid fa-triangle-exclamation',
                        label: 'インシデント一覧',
                        roles: ['all'],
                        purpose: '障害・不具合チケットの管理',
                        value: '迅速な障害対応',
                        necessity: 'ITIL: インシデント管理プロセス'
                    },
                    {
                        path: '/incidents/priority',
                        icon: 'fa-solid fa-fire',
                        label: '優先度別表示',
                        roles: ['agent', 'm365_operator', 'manager'],
                        purpose: '優先度でフィルタリング',
                        value: '緊急対応の効率化',
                        necessity: 'SLA遵守のための優先順位管理'
                    },
                    {
                        path: '/incidents/sla',
                        icon: 'fa-solid fa-clock',
                        label: 'SLA状況監視',
                        roles: ['agent', 'm365_operator', 'manager'],
                        purpose: 'SLA期限の追跡',
                        value: 'サービスレベルの維持',
                        necessity: 'ISO20000: SLA管理要件'
                    },
                ],
            },
            {
                section: 'サービス要求管理',
                description: 'Service Request Management - アカウント・権限・設定変更',
                items: [
                    {
                        path: '/service-requests',
                        icon: 'fa-solid fa-clipboard-list',
                        label: 'サービス要求一覧',
                        roles: ['all'],
                        purpose: 'アカウント・権限・設定変更の依頼管理',
                        value: '標準化されたサービス提供',
                        necessity: 'ITIL: サービス要求管理プロセス'
                    },
                    {
                        path: '/service-requests/standard',
                        icon: 'fa-solid fa-file-lines',
                        label: '標準リクエスト',
                        roles: ['requester', 'agent', 'm365_operator', 'manager'],
                        purpose: '定型業務のテンプレート',
                        value: '申請の効率化',
                        necessity: 'ITSM: 標準化によるサービス品質向上'
                    },
                    {
                        path: '/service-requests/approvals',
                        icon: 'fa-solid fa-check-double',
                        label: '承認待ち',
                        roles: ['approver', 'manager'],
                        purpose: '権限付与・ライセンス変更の承認',
                        value: 'リスク管理',
                        necessity: 'SOD: 職務分離の遵守'
                    },
                ],
            },
            {
                section: '変更管理',
                description: 'Change Management - M365設定・ポリシー変更',
                items: [
                    {
                        path: '/changes',
                        icon: 'fa-solid fa-arrows-rotate',
                        label: '変更要求一覧',
                        roles: ['agent', 'm365_operator', 'manager'],
                        purpose: 'M365設定・ポリシー変更の管理',
                        value: '計画的な変更実施',
                        necessity: 'ITIL: 変更管理プロセス'
                    },
                    {
                        path: '/changes/m365',
                        icon: 'fa-brands fa-microsoft',
                        label: 'M365設定変更',
                        roles: ['m365_operator', 'manager'],
                        purpose: 'M365操作の実施管理',
                        value: '特権操作の追跡',
                        necessity: '監査: 特権アクセス管理'
                    },
                    {
                        path: '/changes/approval-flow',
                        icon: 'fa-solid fa-diagram-project',
                        label: '承認フロー',
                        roles: ['approver', 'manager'],
                        purpose: '変更承認の可視化',
                        value: 'ガバナンスの強化',
                        necessity: 'ISO20000: 変更承認要件'
                    },
                ],
            },
            {
                section: 'ナレッジ管理',
                description: 'Knowledge Management - FAQ・手順書・既知の問題',
                items: [
                    {
                        path: '/knowledge',
                        icon: 'fa-solid fa-book',
                        label: 'ナレッジベース',
                        roles: ['all'],
                        purpose: 'FAQ・手順書の検索',
                        value: '自己解決の促進',
                        necessity: 'ITIL: ナレッジ管理プロセス'
                    },
                    {
                        path: '/knowledge/faq',
                        icon: 'fa-solid fa-question-circle',
                        label: 'FAQ',
                        roles: ['all'],
                        purpose: 'よくある質問',
                        value: '問い合わせ削減',
                        necessity: 'ITSM: 効率的なサービス提供'
                    },
                    {
                        path: '/knowledge/procedures',
                        icon: 'fa-solid fa-list-check',
                        label: '手順書',
                        roles: ['agent', 'm365_operator', 'manager'],
                        purpose: '作業手順の標準化',
                        value: '作業品質の均一化',
                        necessity: 'ISO20000: プロセス文書化要件'
                    },
                    {
                        path: '/knowledge/known-issues',
                        icon: 'fa-solid fa-bug',
                        label: '既知の問題',
                        roles: ['agent', 'm365_operator', 'manager'],
                        purpose: '既知問題の共有',
                        value: '重複調査の防止',
                        necessity: 'ITIL: 問題管理との連携'
                    },
                ],
            },
            {
                section: 'M365 運用',
                description: 'Microsoft 365 Operations - アカウント・ライセンス・リソース管理',
                items: [
                    {
                        path: '/m365/tasks',
                        icon: 'fa-solid fa-tasks',
                        label: 'M365 タスク',
                        roles: ['agent', 'm365_operator', 'manager'],
                        purpose: 'M365操作タスクの実施',
                        value: '操作の標準化',
                        necessity: '監査: 操作証跡の記録'
                    },
                    {
                        path: '/m365/users',
                        icon: 'fa-solid fa-user-search',
                        label: 'ユーザー検索',
                        roles: ['agent', 'm365_operator', 'manager'],
                        purpose: 'M365アカウント情報の参照',
                        value: '迅速な情報確認',
                        necessity: 'ITSM: 情報の一元管理'
                    },
                    {
                        path: '/m365/licenses',
                        icon: 'fa-solid fa-key',
                        label: 'ライセンス管理',
                        roles: ['m365_operator', 'manager'],
                        purpose: 'ライセンス使用状況の把握',
                        value: 'コスト最適化',
                        necessity: 'ITAM: IT資産管理'
                    },
                    {
                        path: '/m365/execution-logs',
                        icon: 'fa-solid fa-file-medical',
                        label: 'M365実施ログ',
                        roles: ['m365_operator', 'manager', 'auditor'],
                        purpose: 'M365操作の実施記録',
                        value: '操作の透明性',
                        necessity: '監査: 特権操作の追跡必須'
                    },
                ],
            },
            {
                section: '監査・コンプライアンス',
                description: 'Audit & Compliance - 監査ログ・SLA達成率・コンプライアンス',
                items: [
                    {
                        path: '/audit/logs',
                        icon: 'fa-solid fa-history',
                        label: '監査ログ',
                        roles: ['manager', 'auditor'],
                        purpose: 'すべての操作履歴の参照',
                        value: '完全な監査証跡',
                        necessity: '監査: 追記専用ログ要件'
                    },
                    {
                        path: '/audit/operation-history',
                        icon: 'fa-solid fa-timeline',
                        label: '操作履歴',
                        roles: ['manager', 'auditor'],
                        purpose: 'チケット変更履歴の追跡',
                        value: '透明性の確保',
                        necessity: 'ISO20000: 変更追跡要件'
                    },
                    {
                        path: '/audit/sla-achievement',
                        icon: 'fa-solid fa-chart-bar',
                        label: 'SLA達成率',
                        roles: ['manager', 'auditor'],
                        purpose: 'サービスレベルの評価',
                        value: '継続的改善',
                        necessity: 'ISO20000: SLA測定・報告要件'
                    },
                    {
                        path: '/audit/compliance-report',
                        icon: 'fa-solid fa-file-shield',
                        label: 'コンプライアンスレポート',
                        roles: ['manager', 'auditor'],
                        purpose: '規制遵守状況の確認',
                        value: 'リスク管理',
                        necessity: '監査: コンプライアンス証跡'
                    },
                    {
                        path: '/audit/sod-check',
                        icon: 'fa-solid fa-user-shield',
                        label: 'SOD検証',
                        roles: ['manager', 'auditor'],
                        purpose: '職務分離の遵守確認',
                        value: '内部統制の強化',
                        necessity: 'SOD: 承認者≠実施者の検証'
                    },
                ],
            },
            {
                section: 'レポート・分析',
                description: 'Reports & Analytics - KPI・傾向分析・パフォーマンス測定',
                items: [
                    {
                        path: '/reports',
                        icon: 'fa-solid fa-chart-pie',
                        label: 'レポート',
                        roles: ['manager', 'auditor'],
                        purpose: 'KPI・統計レポート',
                        value: 'データに基づく意思決定',
                        necessity: 'ISO20000: 測定・報告要件'
                    },
                    {
                        path: '/reports/monthly',
                        icon: 'fa-solid fa-calendar-days',
                        label: '月次レポート',
                        roles: ['manager'],
                        purpose: '月次パフォーマンス評価',
                        value: 'トレンド分析',
                        necessity: 'ITSM: 定期的なレビュー'
                    },
                    {
                        path: '/reports/export',
                        icon: 'fa-solid fa-download',
                        label: 'エクスポート',
                        roles: ['manager', 'auditor'],
                        purpose: '監査用データのエクスポート',
                        value: '外部監査対応',
                        necessity: '監査: データ提出要件'
                    },
                ],
            },
            {
                section: 'システム管理',
                description: 'System Administration - ユーザー・SLA・システム設定',
                items: [
                    {
                        path: '/users',
                        icon: 'fa-solid fa-users-gear',
                        label: 'ユーザー管理',
                        roles: ['manager'],
                        purpose: 'システムユーザーの管理',
                        value: 'アクセス制御',
                        necessity: 'RBAC: 役割ベースアクセス制御'
                    },
                    {
                        path: '/settings/sla-policies',
                        icon: 'fa-solid fa-gauge-high',
                        label: 'SLAポリシー設定',
                        roles: ['manager'],
                        purpose: 'SLA目標値の設定',
                        value: 'サービス品質の定義',
                        necessity: 'ISO20000: SLA定義要件'
                    },
                    {
                        path: '/settings/categories',
                        icon: 'fa-solid fa-tags',
                        label: 'カテゴリ管理',
                        roles: ['manager'],
                        purpose: 'チケット分類の管理',
                        value: '効率的な分類',
                        necessity: 'ITSM: 分類・優先順位付け'
                    },
                    {
                        path: '/settings',
                        icon: 'fa-solid fa-gears',
                        label: 'システム設定',
                        roles: ['manager'],
                        purpose: 'システム全体の設定',
                        value: 'システム最適化',
                        necessity: 'ITSM: システム構成管理'
                    },
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
            // セクションタイトル（説明付き）
            html += `
                <li class="nav-section-title" title="${section.description || ''}">
                    ${section.section}
                </li>
            `;

            // メニュー項目
            section.items.forEach(item => {
                const isActive = Router.getCurrentPath() === item.path;
                const tooltip = `目的: ${item.purpose}\n意義: ${item.value}\n必要性: ${item.necessity}`;

                html += `
                    <li>
                        <a href="#${item.path}"
                           class="nav-link ${isActive ? 'active' : ''}"
                           data-path="${item.path}"
                           title="${tooltip}">
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
