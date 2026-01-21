/**
 * Mirai HelpDesk - Users Page
 *
 * User management for administrators.
 */

const UsersPage = {
    currentPage: 1,
    pageSize: 20,
    filters: {},

    roleLabels: {
        'requester': '依頼者',
        'agent': '一次対応',
        'm365_operator': 'M365オペレーター',
        'approver': '承認者',
        'manager': '管理者',
        'auditor': '監査閲覧',
    },

    roleColors: {
        'requester': 'secondary',
        'agent': 'info',
        'm365_operator': 'warning',
        'approver': 'success',
        'manager': 'primary',
        'auditor': 'outline',
    },

    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'ユーザー管理';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="user-search" placeholder="ユーザーを検索...">
                    </div>
                    <select id="filter-role" class="filter-select">
                        <option value="">すべてのロール</option>
                        <option value="requester">依頼者</option>
                        <option value="agent">一次対応</option>
                        <option value="m365_operator">M365オペレーター</option>
                        <option value="approver">承認者</option>
                        <option value="manager">管理者</option>
                        <option value="auditor">監査閲覧</option>
                    </select>
                    <select id="filter-active" class="filter-select">
                        <option value="">すべてのステータス</option>
                        <option value="true">有効</option>
                        <option value="false">無効</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="create-user-btn" class="btn btn-primary">
                        <i class="lucide-user-plus"></i><span>新規ユーザー</span>
                    </button>
                </div>
            </div>
            <div class="card">
                <div id="users-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        document.getElementById('filter-role').addEventListener('change', (e) => {
            this.filters.role = e.target.value || undefined;
            this.loadUsers();
        });
        document.getElementById('filter-active').addEventListener('change', (e) => {
            this.filters.is_active = e.target.value || undefined;
            this.loadUsers();
        });
        document.getElementById('create-user-btn').addEventListener('click', () => this.showCreateModal());

        await this.loadUsers();
    },

    async loadUsers() {
        const container = document.getElementById('users-list');
        try {
            const data = await API.getUsers({ page: this.currentPage, ...this.filters });
            this.renderUsers(data);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderUsers(data) {
        const container = document.getElementById('users-list');
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-users"></i>
                    <h3>ユーザーがいません</h3>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ユーザー</th>
                        <th>メールアドレス</th>
                        <th>部署</th>
                        <th>ロール</th>
                        <th>ステータス</th>
                        <th>最終ログイン</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(user => `
                        <tr data-id="${user.id}">
                            <td>
                                <div class="user-cell">
                                    <div class="user-avatar-sm">${this.getInitials(user.display_name)}</div>
                                    <span>${user.display_name}</span>
                                </div>
                            </td>
                            <td>${user.email}</td>
                            <td>${user.department || '-'}</td>
                            <td>
                                <span class="badge badge-${this.roleColors[user.role]}">
                                    ${this.roleLabels[user.role] || user.role}
                                </span>
                            </td>
                            <td>
                                <span class="badge badge-${user.is_active ? 'success' : 'error'}">
                                    ${user.is_active ? '有効' : '無効'}
                                </span>
                            </td>
                            <td>${user.last_login_at ? this.formatDate(user.last_login_at) : '-'}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-ghost btn-sm edit-btn" data-id="${user.id}">
                                        <i class="lucide-edit"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="pagination">
                <span class="pagination-info">全 ${data.total} 件</span>
            </div>
        `;

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showEditModal(btn.dataset.id));
        });
    },

    showCreateModal() {
        Modal.create({
            title: '新規ユーザー作成',
            content: `
                <form id="create-user-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>表示名 <span class="required">*</span></label>
                            <input type="text" name="display_name" required placeholder="山田 太郎">
                        </div>
                        <div class="form-group">
                            <label>メールアドレス <span class="required">*</span></label>
                            <input type="email" name="email" required placeholder="taro.yamada@example.com">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>パスワード <span class="required">*</span></label>
                            <input type="password" name="password" required minlength="6" placeholder="••••••••">
                        </div>
                        <div class="form-group">
                            <label>部署</label>
                            <input type="text" name="department" placeholder="情報システム部">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>ロール <span class="required">*</span></label>
                        <select name="role" required>
                            <option value="requester">依頼者</option>
                            <option value="agent">一次対応</option>
                            <option value="m365_operator">M365オペレーター</option>
                            <option value="approver">承認者</option>
                            <option value="manager">管理者</option>
                            <option value="auditor">監査閲覧</option>
                        </select>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="create-user-form" class="btn btn-primary">作成</button>
            `,
        });

        document.getElementById('create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.createUser({
                    display_name: fd.get('display_name'),
                    email: fd.get('email'),
                    password: fd.get('password'),
                    department: fd.get('department') || null,
                    role: fd.get('role'),
                });
                Modal.hide();
                Toast.success('ユーザーを作成しました');
                this.loadUsers();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    },

    async showEditModal(userId) {
        let user;
        try {
            user = await API.getUser(userId);
        } catch (err) {
            Toast.error('ユーザー情報の取得に失敗しました');
            return;
        }

        Modal.create({
            title: 'ユーザー編集',
            content: `
                <form id="edit-user-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>表示名 <span class="required">*</span></label>
                            <input type="text" name="display_name" required value="${user.display_name}">
                        </div>
                        <div class="form-group">
                            <label>メールアドレス</label>
                            <input type="email" value="${user.email}" disabled>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>部署</label>
                            <input type="text" name="department" value="${user.department || ''}" placeholder="情報システム部">
                        </div>
                        <div class="form-group">
                            <label>ロール <span class="required">*</span></label>
                            <select name="role" required>
                                ${Object.entries(this.roleLabels).map(([value, label]) =>
                                    `<option value="${value}" ${user.role === value ? 'selected' : ''}>${label}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="is_active" ${user.is_active ? 'checked' : ''}>
                            <span>アカウント有効</span>
                        </label>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="edit-user-form" class="btn btn-primary">保存</button>
            `,
        });

        document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.updateUser(userId, {
                    display_name: fd.get('display_name'),
                    department: fd.get('department') || null,
                    role: fd.get('role'),
                    is_active: fd.has('is_active'),
                });
                Modal.hide();
                Toast.success('ユーザーを更新しました');
                this.loadUsers();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    },

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
};

window.UsersPage = UsersPage;
