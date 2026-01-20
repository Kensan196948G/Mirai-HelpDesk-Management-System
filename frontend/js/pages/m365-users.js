/**
 * Mirai HelpDesk - M365 Users Page
 *
 * Microsoft 365 user search and management interface.
 * Provides user search, license viewing, and account status information.
 */

const M365UsersPage = {
    currentPage: 1,
    pageSize: 20,
    searchQuery: '',
    debounceTimer: null,
    users: [],

    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'M365 ユーザー検索';

        content.innerHTML = `
            <div class="m365-users-container">
                <div class="search-section">
                    <div class="search-box-large">
                        <i class="lucide-search"></i>
                        <input
                            type="text"
                            id="user-search"
                            placeholder="ユーザー名、メールアドレス、部署で検索..."
                            autocomplete="off"
                        >
                        <button id="clear-search" class="btn-icon" style="display: none;">
                            <i class="lucide-x"></i>
                        </button>
                    </div>
                    <div class="search-info" id="search-info">
                        <i class="lucide-info"></i>
                        <span>検索キーワードを入力してください</span>
                    </div>
                </div>

                <div class="users-grid" id="users-grid">
                    <div class="empty-state">
                        <i class="lucide-users"></i>
                        <h3>ユーザーを検索</h3>
                        <p>検索バーにキーワードを入力して、M365ユーザーを検索してください</p>
                    </div>
                </div>

                <div id="pagination-container"></div>
            </div>
        `;

        this.initEventListeners();
    },

    initEventListeners() {
        const searchInput = document.getElementById('user-search');
        const clearBtn = document.getElementById('clear-search');

        // Real-time search with debounce
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearBtn.style.display = query ? 'block' : 'none';

            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.searchQuery = query;
                this.currentPage = 1;
                this.searchUsers();
            }, 300);
        });

        // Clear search
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            clearBtn.style.display = 'none';
            this.showEmptyState();
        });
    },

    async searchUsers() {
        const grid = document.getElementById('users-grid');
        const searchInfo = document.getElementById('search-info');

        if (!this.searchQuery) {
            this.showEmptyState();
            return;
        }

        // Show loading
        grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>検索中...</p></div>';
        searchInfo.innerHTML = '<i class="lucide-loader"></i><span>検索中...</span>';
        searchInfo.className = 'search-info loading';

        try {
            const data = await API.searchM365Users({
                query: this.searchQuery,
                page: this.currentPage,
                page_size: this.pageSize
            });

            this.users = data.items || [];

            if (this.users.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="lucide-search-x"></i>
                        <h3>ユーザーが見つかりません</h3>
                        <p>「${this.searchQuery}」に一致するユーザーが見つかりませんでした</p>
                    </div>
                `;
                searchInfo.innerHTML = '<i class="lucide-info"></i><span>検索結果: 0件</span>';
                searchInfo.className = 'search-info';
            } else {
                this.renderUsers();
                searchInfo.innerHTML = `<i class="lucide-check-circle"></i><span>検索結果: ${data.total || this.users.length}件</span>`;
                searchInfo.className = 'search-info success';
            }

            if (data.total > this.pageSize) {
                this.renderPagination(data.total);
            }
        } catch (error) {
            console.error('User search error:', error);
            grid.innerHTML = `
                <div class="empty-state error">
                    <i class="lucide-alert-circle"></i>
                    <h3>エラーが発生しました</h3>
                    <p>${error.message || 'ユーザー検索に失敗しました'}</p>
                </div>
            `;
            searchInfo.innerHTML = '<i class="lucide-alert-circle"></i><span>エラー</span>';
            searchInfo.className = 'search-info error';
        }
    },

    renderUsers() {
        const grid = document.getElementById('users-grid');

        grid.innerHTML = this.users.map(user => `
            <div class="user-card" data-upn="${user.userPrincipalName}">
                <div class="user-card-header">
                    <div class="user-avatar">
                        ${this.getUserInitials(user.displayName)}
                    </div>
                    <div class="user-basic-info">
                        <h4 class="user-name">${this.escapeHtml(user.displayName)}</h4>
                        <p class="user-email">${this.escapeHtml(user.userPrincipalName)}</p>
                    </div>
                    <span class="badge badge-${user.accountEnabled ? 'success' : 'error'}">
                        ${user.accountEnabled ? '有効' : '無効'}
                    </span>
                </div>

                <div class="user-card-body">
                    <div class="user-info-row">
                        <i class="lucide-building"></i>
                        <span>${user.department || '未設定'}</span>
                    </div>
                    <div class="user-info-row">
                        <i class="lucide-briefcase"></i>
                        <span>${user.jobTitle || '未設定'}</span>
                    </div>
                    <div class="user-info-row">
                        <i class="lucide-mail"></i>
                        <span>${user.mail || user.userPrincipalName}</span>
                    </div>
                    ${user.mobilePhone ? `
                        <div class="user-info-row">
                            <i class="lucide-phone"></i>
                            <span>${this.escapeHtml(user.mobilePhone)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="user-card-licenses">
                    <div class="licenses-header">
                        <i class="lucide-key"></i>
                        <span>ライセンス</span>
                    </div>
                    <div class="licenses-list">
                        ${this.renderUserLicenses(user.assignedLicenses)}
                    </div>
                </div>

                <div class="user-card-footer">
                    <button class="btn btn-ghost btn-sm view-details-btn" data-upn="${user.userPrincipalName}">
                        <i class="lucide-eye"></i>
                        <span>詳細</span>
                    </button>
                    <button class="btn btn-primary btn-sm actions-btn" data-upn="${user.userPrincipalName}">
                        <i class="lucide-settings"></i>
                        <span>操作</span>
                    </button>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        grid.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showUserDetail(btn.dataset.upn));
        });

        grid.querySelectorAll('.actions-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showActionsMenu(btn.dataset.upn));
        });
    },

    renderUserLicenses(licenses) {
        if (!licenses || licenses.length === 0) {
            return '<span class="license-badge badge-outline">ライセンスなし</span>';
        }

        const licenseNames = {
            'SPE_E3': 'Microsoft 365 E3',
            'SPE_E5': 'Microsoft 365 E5',
            'ENTERPRISEPACK': 'Office 365 E3',
            'ENTERPRISEPREMIUM': 'Office 365 E5',
            'FLOW_FREE': 'Power Automate Free',
            'POWER_BI_STANDARD': 'Power BI Free',
            'TEAMS_EXPLORATORY': 'Teams Exploratory',
        };

        return licenses.slice(0, 3).map(license => {
            const skuId = license.skuId || license;
            const name = licenseNames[skuId] || skuId;
            return `<span class="license-badge">${this.escapeHtml(name)}</span>`;
        }).join('') + (licenses.length > 3 ? `<span class="license-badge">+${licenses.length - 3}</span>` : '');
    },

    getUserInitials(displayName) {
        if (!displayName) return '??';
        const parts = displayName.split(' ').filter(p => p);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return displayName.substring(0, 2).toUpperCase();
    },

    async showUserDetail(upn) {
        const user = this.users.find(u => u.userPrincipalName === upn);
        if (!user) return;

        // Fetch additional details
        let userDetails = user;
        let licenses = [];

        try {
            const [detailsResponse, licensesResponse] = await Promise.all([
                API.getM365User(upn),
                API.getM365UserLicenses(upn)
            ]);
            userDetails = detailsResponse;
            licenses = licensesResponse.value || licensesResponse;
        } catch (error) {
            console.error('Failed to fetch user details:', error);
        }

        Modal.create({
            title: `${userDetails.displayName} - ユーザー詳細`,
            content: `
                <div class="user-detail-modal">
                    <div class="user-detail-header">
                        <div class="user-avatar-large">
                            ${this.getUserInitials(userDetails.displayName)}
                        </div>
                        <div>
                            <h3>${this.escapeHtml(userDetails.displayName)}</h3>
                            <p class="text-muted">${this.escapeHtml(userDetails.userPrincipalName)}</p>
                            <span class="badge badge-${userDetails.accountEnabled ? 'success' : 'error'}">
                                ${userDetails.accountEnabled ? 'アカウント有効' : 'アカウント無効'}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="lucide-user"></i> 基本情報</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>表示名</label>
                                <span>${this.escapeHtml(userDetails.displayName)}</span>
                            </div>
                            <div class="detail-item">
                                <label>メールアドレス</label>
                                <span>${this.escapeHtml(userDetails.mail || userDetails.userPrincipalName)}</span>
                            </div>
                            <div class="detail-item">
                                <label>部署</label>
                                <span>${this.escapeHtml(userDetails.department || '-')}</span>
                            </div>
                            <div class="detail-item">
                                <label>役職</label>
                                <span>${this.escapeHtml(userDetails.jobTitle || '-')}</span>
                            </div>
                            <div class="detail-item">
                                <label>オフィス</label>
                                <span>${this.escapeHtml(userDetails.officeLocation || '-')}</span>
                            </div>
                            <div class="detail-item">
                                <label>電話番号</label>
                                <span>${this.escapeHtml(userDetails.mobilePhone || userDetails.businessPhones?.[0] || '-')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="lucide-key"></i> ライセンス情報</h4>
                        <div class="licenses-detail-list">
                            ${licenses.length > 0 ? licenses.map(license => `
                                <div class="license-detail-card">
                                    <div class="license-name">${this.escapeHtml(license.skuPartNumber || license.skuId)}</div>
                                    <div class="license-status">
                                        <span class="badge badge-success">割り当て済み</span>
                                    </div>
                                </div>
                            `).join('') : '<p class="text-muted">ライセンスが割り当てられていません</p>'}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="lucide-shield"></i> アカウント情報</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>UPN</label>
                                <span class="monospace">${this.escapeHtml(userDetails.userPrincipalName)}</span>
                            </div>
                            <div class="detail-item">
                                <label>オブジェクトID</label>
                                <span class="monospace">${this.escapeHtml(userDetails.id || '-')}</span>
                            </div>
                            <div class="detail-item">
                                <label>作成日時</label>
                                <span>${userDetails.createdDateTime ? this.formatDate(userDetails.createdDateTime) : '-'}</span>
                            </div>
                            <div class="detail-item">
                                <label>最終サインイン</label>
                                <span>${userDetails.signInActivity?.lastSignInDateTime ? this.formatDate(userDetails.signInActivity.lastSignInDateTime) : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">閉じる</button>
                <button class="btn btn-primary" onclick="M365UsersPage.showActionsMenu('${upn}')">
                    <i class="lucide-settings"></i> 操作
                </button>
            `,
            size: 'large'
        });
    },

    showActionsMenu(upn) {
        Modal.hide(); // Close detail modal if open

        const user = this.users.find(u => u.userPrincipalName === upn);
        if (!user) return;

        Modal.create({
            title: `${user.displayName} - 操作選択`,
            content: `
                <div class="actions-menu">
                    <p class="text-muted">実行する操作を選択してください。選択した操作はチケットに紐づくM365タスクとして作成されます。</p>

                    <div class="action-card" data-action="license_assign">
                        <i class="lucide-key"></i>
                        <div>
                            <h4>ライセンス付与</h4>
                            <p>ユーザーにライセンスを割り当てます</p>
                        </div>
                    </div>

                    <div class="action-card" data-action="license_remove">
                        <i class="lucide-key-off"></i>
                        <div>
                            <h4>ライセンス削除</h4>
                            <p>ユーザーからライセンスを削除します</p>
                        </div>
                    </div>

                    <div class="action-card" data-action="password_reset">
                        <i class="lucide-lock"></i>
                        <div>
                            <h4>パスワードリセット</h4>
                            <p>ユーザーのパスワードをリセットします</p>
                        </div>
                    </div>

                    <div class="action-card" data-action="mfa_reset">
                        <i class="lucide-smartphone"></i>
                        <div>
                            <h4>MFAリセット</h4>
                            <p>多要素認証の設定をリセットします</p>
                        </div>
                    </div>

                    <div class="action-card" data-action="group_membership">
                        <i class="lucide-users"></i>
                        <div>
                            <h4>グループメンバーシップ</h4>
                            <p>グループへの追加・削除を行います</p>
                        </div>
                    </div>

                    <div class="action-card" data-action="mailbox_permission">
                        <i class="lucide-mail"></i>
                        <div>
                            <h4>メールボックス権限</h4>
                            <p>メールボックスのアクセス権限を設定します</p>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
            `,
            size: 'medium'
        });

        // Attach action card click handlers
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                this.createM365Task(upn, action);
            });
        });
    },

    async createM365Task(upn, taskType) {
        const user = this.users.find(u => u.userPrincipalName === upn);

        // Show task creation form (simplified for MVP)
        Modal.create({
            title: `M365タスク作成: ${this.getTaskTypeName(taskType)}`,
            content: `
                <form id="m365-task-form">
                    <div class="form-group">
                        <label>対象ユーザー</label>
                        <input type="text" value="${this.escapeHtml(user.displayName)} (${this.escapeHtml(upn)})" disabled>
                    </div>
                    <div class="form-group">
                        <label>関連チケット <span class="required">*</span></label>
                        <input type="text" name="ticket_id" placeholder="TKT-2026-0001" required>
                        <small>この操作を紐づけるチケットIDを入力してください</small>
                    </div>
                    <div class="form-group">
                        <label>説明 <span class="required">*</span></label>
                        <textarea name="description" rows="3" required placeholder="この操作の詳細を入力してください"></textarea>
                    </div>
                    ${this.getTaskTypeSpecificFields(taskType)}
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="m365-task-form" class="btn btn-primary">タスク作成</button>
            `,
            size: 'medium'
        });

        document.getElementById('m365-task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                await API.createM365Task({
                    task_type: taskType,
                    target_upn: upn,
                    ticket_id: formData.get('ticket_id'),
                    description: formData.get('description'),
                    parameters: this.getTaskParameters(taskType, formData)
                });

                Modal.hide();
                Toast.success('M365タスクを作成しました');
            } catch (error) {
                Toast.error(error.message || 'タスクの作成に失敗しました');
            }
        });
    },

    getTaskTypeName(taskType) {
        const names = {
            'license_assign': 'ライセンス付与',
            'license_remove': 'ライセンス削除',
            'password_reset': 'パスワードリセット',
            'mfa_reset': 'MFAリセット',
            'group_membership': 'グループメンバーシップ',
            'mailbox_permission': 'メールボックス権限',
        };
        return names[taskType] || taskType;
    },

    getTaskTypeSpecificFields(taskType) {
        switch (taskType) {
            case 'license_assign':
            case 'license_remove':
                return `
                    <div class="form-group">
                        <label>ライセンスSKU <span class="required">*</span></label>
                        <select name="license_sku" required>
                            <option value="">選択してください</option>
                            <option value="SPE_E3">Microsoft 365 E3</option>
                            <option value="SPE_E5">Microsoft 365 E5</option>
                            <option value="ENTERPRISEPACK">Office 365 E3</option>
                            <option value="ENTERPRISEPREMIUM">Office 365 E5</option>
                        </select>
                    </div>
                `;
            case 'group_membership':
                return `
                    <div class="form-group">
                        <label>グループID/名前 <span class="required">*</span></label>
                        <input type="text" name="group_id" required placeholder="グループのオブジェクトIDまたは名前">
                    </div>
                    <div class="form-group">
                        <label>操作</label>
                        <select name="membership_action" required>
                            <option value="add">追加</option>
                            <option value="remove">削除</option>
                        </select>
                    </div>
                `;
            case 'mailbox_permission':
                return `
                    <div class="form-group">
                        <label>権限種別 <span class="required">*</span></label>
                        <select name="permission_type" required>
                            <option value="FullAccess">フルアクセス</option>
                            <option value="SendAs">送信者として送信</option>
                            <option value="SendOnBehalf">代理送信</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>権限付与先ユーザー <span class="required">*</span></label>
                        <input type="text" name="trustee_upn" required placeholder="user@example.com">
                    </div>
                `;
            default:
                return '';
        }
    },

    getTaskParameters(taskType, formData) {
        const params = {};

        switch (taskType) {
            case 'license_assign':
            case 'license_remove':
                params.license_sku = formData.get('license_sku');
                break;
            case 'group_membership':
                params.group_id = formData.get('group_id');
                params.action = formData.get('membership_action');
                break;
            case 'mailbox_permission':
                params.permission_type = formData.get('permission_type');
                params.trustee_upn = formData.get('trustee_upn');
                break;
        }

        return params;
    },

    showEmptyState() {
        const grid = document.getElementById('users-grid');
        const searchInfo = document.getElementById('search-info');

        grid.innerHTML = `
            <div class="empty-state">
                <i class="lucide-users"></i>
                <h3>ユーザーを検索</h3>
                <p>検索バーにキーワードを入力して、M365ユーザーを検索してください</p>
            </div>
        `;

        searchInfo.innerHTML = '<i class="lucide-info"></i><span>検索キーワードを入力してください</span>';
        searchInfo.className = 'search-info';
    },

    renderPagination(total) {
        const container = document.getElementById('pagination-container');
        const totalPages = Math.ceil(total / this.pageSize);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const pages = [];
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            pages.push(`
                <button class="btn ${i === this.currentPage ? 'btn-primary' : 'btn-secondary'}"
                        data-page="${i}">
                    ${i}
                </button>
            `);
        }

        container.innerHTML = `
            <div class="pagination">
                <button class="btn btn-secondary" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
                    <i class="lucide-chevron-left"></i>
                </button>
                ${pages.join('')}
                ${totalPages > 5 ? '<span>...</span>' : ''}
                <button class="btn btn-secondary" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
                    <i class="lucide-chevron-right"></i>
                </button>
            </div>
        `;

        container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.dataset.page);
                this.searchUsers();
            });
        });
    },

    formatDate(isoString) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.M365UsersPage = M365UsersPage;
