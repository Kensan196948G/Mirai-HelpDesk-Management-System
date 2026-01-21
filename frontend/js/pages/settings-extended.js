/**
 * Mirai HelpDesk - Extended Settings Pages
 *
 * システム管理機能:
 * - SLAポリシー設定
 * - カテゴリ管理
 */

const SettingsExtendedPage = {
    /**
     * SLAポリシー設定ページ
     */
    async renderSLAPolicies() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'SLAポリシー設定';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="alert alert-info" style="margin: 0;">
                        <i class="lucide-info"></i>
                        <span>SLAポリシーは優先度ごとのサービスレベル目標を定義します。</span>
                    </div>
                </div>
                <div class="toolbar-right">
                    <button id="add-policy-btn" class="btn btn-primary">
                        <i class="lucide-plus"></i><span>新規ポリシー</span>
                    </button>
                </div>
            </div>

            <div id="sla-policies-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('add-policy-btn').addEventListener('click', () => this.showAddPolicyModal());

        await this.loadSLAPolicies();
    },

    async loadSLAPolicies() {
        const container = document.getElementById('sla-policies-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const policies = await this.getMockSLAPolicies();
            this.renderSLAPoliciesContent(policies);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderSLAPoliciesContent(policies) {
        const container = document.getElementById('sla-policies-content');

        container.innerHTML = `
            <!-- Default Policy -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">デフォルトSLAポリシー</h3>
                    <span class="badge badge-success">アクティブ</span>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>優先度</th>
                                    <th>初動対応時間</th>
                                    <th>解決目標時間</th>
                                    <th>営業時間のみ</th>
                                    <th style="width: 150px;">アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${policies.default.map(p => `
                                    <tr>
                                        <td><span class="badge badge-${p.priority.toLowerCase()}">${p.priority} - ${p.label}</span></td>
                                        <td>
                                            <input type="text" class="input-sm" value="${p.first_response}" style="width: 100px;">
                                        </td>
                                        <td>
                                            <input type="text" class="input-sm" value="${p.resolution_target}" style="width: 100px;">
                                        </td>
                                        <td style="text-align: center;">
                                            <input type="checkbox" ${p.business_hours_only ? 'checked' : ''}>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="Toast.info('SLAポリシーの編集機能は開発中です')">
                                                <i class="lucide-edit"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="form-actions" style="margin-top: var(--spacing-lg);">
                        <button class="btn btn-primary" onclick="Toast.success('SLAポリシーを保存しました')">
                            <i class="lucide-save"></i><span>保存</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Business Hours Configuration -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">営業時間設定</h3>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>開始時刻</label>
                            <input type="time" value="09:00" id="business-hours-start">
                        </div>
                        <div class="form-group">
                            <label>終了時刻</label>
                            <input type="time" value="18:00" id="business-hours-end">
                        </div>
                        <div class="form-group">
                            <label>タイムゾーン</label>
                            <select id="timezone-select">
                                <option value="Asia/Tokyo" selected>Asia/Tokyo (JST)</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>営業日</label>
                        <div class="checkbox-group" style="display: flex; gap: var(--spacing-md);">
                            <label class="checkbox-label">
                                <input type="checkbox" id="day-sunday">
                                <span>日</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="day-monday" checked>
                                <span>月</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="day-tuesday" checked>
                                <span>火</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="day-wednesday" checked>
                                <span>水</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="day-thursday" checked>
                                <span>木</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="day-friday" checked>
                                <span>金</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="day-saturday">
                                <span>土</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>祝日設定</label>
                        <textarea rows="3" placeholder="祝日を手動で入力するか、カレンダーAPIと連携します。&#10;例: 2026-01-01, 2026-01-13, 2026-02-11"></textarea>
                    </div>

                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="Toast.success('営業時間設定を保存しました')">
                            <i class="lucide-save"></i><span>保存</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Custom Policies -->
            ${policies.custom.length > 0 ? `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">カスタムSLAポリシー</h3>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                            ${policies.custom.map(policy => `
                                <div class="custom-policy-item" style="padding: var(--spacing-md); background: var(--background-secondary); border-radius: var(--border-radius); display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 0.25rem;">${policy.name}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${policy.description}</div>
                                    </div>
                                    <div style="display: flex; gap: var(--spacing-sm);">
                                        <button class="btn btn-sm btn-secondary" onclick="Toast.info('カスタムポリシーの編集機能は開発中です')">
                                            <i class="lucide-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-error" onclick="Toast.warning('削除機能は開発中です')">
                                            <i class="lucide-trash-2"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- SLA Escalation Rules -->
            <div class="card" style="margin-top: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">エスカレーションルール</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" checked>
                            <span>SLA期限の1時間前に担当者へ通知</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" checked>
                            <span>SLA期限の30分前にマネージャーへ通知</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" checked>
                            <span>SLA違反時に即座にマネージャーへエスカレーション</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox">
                            <span>P1チケットは作成時に即座にマネージャーへ通知</span>
                        </label>
                    </div>

                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="Toast.success('エスカレーションルールを保存しました')">
                            <i class="lucide-save"></i><span>保存</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    showAddPolicyModal() {
        Toast.info('カスタムSLAポリシーの作成機能は開発中です');
    },

    /**
     * カテゴリ管理ページ
     */
    async renderCategories() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'カテゴリ管理';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="alert alert-info" style="margin: 0;">
                        <i class="lucide-info"></i>
                        <span>チケットを分類するためのカテゴリを管理します。</span>
                    </div>
                </div>
                <div class="toolbar-right">
                    <button id="add-category-btn" class="btn btn-primary">
                        <i class="lucide-plus"></i><span>新規カテゴリ</span>
                    </button>
                </div>
            </div>

            <div id="categories-content">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        document.getElementById('add-category-btn').addEventListener('click', () => this.showAddCategoryModal());

        await this.loadCategories();
    },

    async loadCategories() {
        const container = document.getElementById('categories-content');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        try {
            const categories = await this.getMockCategories();
            this.renderCategoriesContent(categories);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderCategoriesContent(categories) {
        const container = document.getElementById('categories-content');

        container.innerHTML = `
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 250px;">カテゴリ名</th>
                                    <th>説明</th>
                                    <th style="width: 150px;">デフォルト担当者</th>
                                    <th style="width: 100px;">チケット数</th>
                                    <th style="width: 100px;">状態</th>
                                    <th style="width: 150px;">アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categories.map(cat => `
                                    <tr>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                                                <i class="${cat.icon}" style="color: ${cat.color};"></i>
                                                <span style="font-weight: 600;">${cat.name}</span>
                                            </div>
                                        </td>
                                        <td style="max-width: 300px;">${cat.description}</td>
                                        <td>
                                            ${cat.default_assignee
                                                ? `<div class="user-cell">
                                                    <div class="avatar-sm">${cat.default_assignee.charAt(0)}</div>
                                                    <span>${cat.default_assignee}</span>
                                                </div>`
                                                : '<span style="color: var(--text-tertiary);">未設定</span>'}
                                        </td>
                                        <td>${cat.ticket_count}</td>
                                        <td>
                                            <span class="badge badge-${cat.active ? 'success' : 'secondary'}">
                                                ${cat.active ? 'アクティブ' : '無効'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display: flex; gap: var(--spacing-xs);">
                                                <button class="btn btn-sm btn-secondary" onclick="SettingsExtendedPage.editCategory('${cat.id}')" title="編集">
                                                    <i class="lucide-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-secondary" onclick="SettingsExtendedPage.toggleCategory('${cat.id}')" title="有効/無効">
                                                    <i class="lucide-${cat.active ? 'eye-off' : 'eye'}"></i>
                                                </button>
                                                ${cat.ticket_count === 0
                                                    ? `<button class="btn btn-sm btn-error" onclick="SettingsExtendedPage.deleteCategory('${cat.id}')" title="削除">
                                                        <i class="lucide-trash-2"></i>
                                                    </button>`
                                                    : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Category Groups -->
            <div class="card" style="margin-top: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">カテゴリグループ</h3>
                </div>
                <div class="card-body">
                    <p style="color: var(--text-secondary); margin-bottom: var(--spacing-lg);">
                        関連するカテゴリをグループ化することで、レポートやフィルタリングが容易になります。
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-lg);">
                        ${this.renderCategoryGroups(categories)}
                    </div>
                </div>
            </div>

            <!-- Category Statistics -->
            <div class="card" style="margin-top: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">カテゴリ別統計（過去30日間）</h3>
                </div>
                <div class="card-body">
                    ${this.renderCategoryStatistics(categories)}
                </div>
            </div>
        `;
    },

    renderCategoryGroups(categories) {
        const groups = {
            'M365関連': ['アカウント', 'ライセンス', 'メール', 'Teams', 'OneDrive', 'SharePoint'],
            'インフラ': ['ネットワーク', 'セキュリティ', 'VPN'],
            'デバイス': ['PC/ノートPC', 'プリンター', 'スマートフォン'],
        };

        let html = '';
        for (const [groupName, categoryNames] of Object.entries(groups)) {
            const groupCategories = categories.filter(c => categoryNames.includes(c.name));
            const totalTickets = groupCategories.reduce((sum, c) => sum + c.ticket_count, 0);

            html += `
                <div class="category-group" style="padding: var(--spacing-md); background: var(--background-secondary); border-radius: var(--border-radius);">
                    <div style="font-weight: 600; margin-bottom: var(--spacing-md);">${groupName}</div>
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-xs);">
                        ${groupCategories.map(c => `
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
                                <span style="color: var(--text-secondary);">${c.name}</span>
                                <span style="font-weight: 600;">${c.ticket_count}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: var(--spacing-sm); padding-top: var(--spacing-sm); border-top: 1px solid var(--border-color); font-weight: 600;">
                        合計: ${totalTickets}
                    </div>
                </div>
            `;
        }

        return html;
    },

    renderCategoryStatistics(categories) {
        const total = categories.reduce((sum, c) => sum + c.ticket_count, 0) || 1;
        const sorted = [...categories].sort((a, b) => b.ticket_count - a.ticket_count);

        let html = '<div style="display: flex; flex-direction: column; gap: var(--spacing-md);">';

        for (const cat of sorted) {
            const percentage = Math.round((cat.ticket_count / total) * 100);
            html += `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                            <i class="${cat.icon}" style="color: ${cat.color};"></i>
                            <span>${cat.name}</span>
                        </div>
                        <span style="font-weight: 600;">${cat.ticket_count} (${percentage}%)</span>
                    </div>
                    <div class="progress-bar" style="height: 24px;">
                        <div class="progress-fill primary" style="width: ${percentage}%; background: ${cat.color};"></div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    showAddCategoryModal() {
        Toast.info('カテゴリ追加機能は開発中です');
    },

    editCategory(categoryId) {
        Toast.info(`カテゴリ ${categoryId} の編集機能は開発中です`);
    },

    toggleCategory(categoryId) {
        Toast.success('カテゴリの状態を変更しました');
    },

    deleteCategory(categoryId) {
        if (confirm('このカテゴリを削除してもよろしいですか？')) {
            Toast.success('カテゴリを削除しました');
        }
    },

    // ============== Mock Data ==============

    async getMockSLAPolicies() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    default: [
                        {
                            priority: 'P1',
                            label: '緊急',
                            first_response: '15分',
                            resolution_target: '2時間',
                            business_hours_only: false,
                        },
                        {
                            priority: 'P2',
                            label: '高',
                            first_response: '1時間',
                            resolution_target: '8時間',
                            business_hours_only: true,
                        },
                        {
                            priority: 'P3',
                            label: '中',
                            first_response: '4時間',
                            resolution_target: '3営業日',
                            business_hours_only: true,
                        },
                        {
                            priority: 'P4',
                            label: '低',
                            first_response: '1営業日',
                            resolution_target: '5営業日',
                            business_hours_only: true,
                        },
                    ],
                    custom: [
                        {
                            id: 'vip',
                            name: 'VIPユーザーポリシー',
                            description: '役員・VIPユーザー向けの優先対応ポリシー',
                        },
                    ],
                });
            }, 300);
        });
    },

    async getMockCategories() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        id: 'account',
                        name: 'アカウント',
                        description: 'ユーザーアカウントの作成、変更、削除',
                        icon: 'lucide-user',
                        color: '#0078d4',
                        default_assignee: '鈴木一郎',
                        ticket_count: 60,
                        active: true,
                    },
                    {
                        id: 'license',
                        name: 'ライセンス',
                        description: 'M365ライセンスの付与、変更、剥奪',
                        icon: 'lucide-key',
                        color: '#00a651',
                        default_assignee: '鈴木一郎',
                        ticket_count: 45,
                        active: true,
                    },
                    {
                        id: 'email',
                        name: 'メール',
                        description: 'メールボックス、権限、転送設定',
                        icon: 'lucide-mail',
                        color: '#0078d4',
                        default_assignee: '田中次郎',
                        ticket_count: 40,
                        active: true,
                    },
                    {
                        id: 'teams',
                        name: 'Teams',
                        description: 'Teamsの作成、設定、権限管理',
                        icon: 'lucide-users',
                        color: '#6264a7',
                        default_assignee: '田中次郎',
                        ticket_count: 35,
                        active: true,
                    },
                    {
                        id: 'onedrive',
                        name: 'OneDrive',
                        description: 'OneDriveの容量、共有、リストア',
                        icon: 'lucide-cloud',
                        color: '#0078d4',
                        default_assignee: '佐藤花子',
                        ticket_count: 28,
                        active: true,
                    },
                    {
                        id: 'sharepoint',
                        name: 'SharePoint',
                        description: 'SharePointサイト、ライブラリ、権限',
                        icon: 'lucide-folder',
                        color: '#0078d4',
                        default_assignee: '佐藤花子',
                        ticket_count: 22,
                        active: true,
                    },
                    {
                        id: 'network',
                        name: 'ネットワーク',
                        description: 'ネットワーク接続、VPN、Wi-Fi',
                        icon: 'lucide-network',
                        color: '#107c10',
                        default_assignee: null,
                        ticket_count: 30,
                        active: true,
                    },
                    {
                        id: 'security',
                        name: 'セキュリティ',
                        description: 'MFA、条件付きアクセス、セキュリティアラート',
                        icon: 'lucide-shield',
                        color: '#d83b01',
                        default_assignee: null,
                        ticket_count: 18,
                        active: true,
                    },
                    {
                        id: 'hardware',
                        name: 'PC/ノートPC',
                        description: 'PCのセットアップ、故障、交換',
                        icon: 'lucide-laptop',
                        color: '#5c2d91',
                        default_assignee: null,
                        ticket_count: 25,
                        active: true,
                    },
                    {
                        id: 'software',
                        name: 'ソフトウェア',
                        description: 'アプリケーションのインストール、ライセンス',
                        icon: 'lucide-package',
                        color: '#008272',
                        default_assignee: null,
                        ticket_count: 20,
                        active: true,
                    },
                    {
                        id: 'printer',
                        name: 'プリンター',
                        description: 'プリンター設定、印刷トラブル',
                        icon: 'lucide-printer',
                        color: '#5c2d91',
                        default_assignee: null,
                        ticket_count: 15,
                        active: true,
                    },
                    {
                        id: 'other',
                        name: 'その他',
                        description: 'その他の問い合わせ',
                        icon: 'lucide-help-circle',
                        color: '#737373',
                        default_assignee: null,
                        ticket_count: 12,
                        active: true,
                    },
                ]);
            }, 300);
        });
    },
};

// Export for use
window.SettingsExtendedPage = SettingsExtendedPage;
