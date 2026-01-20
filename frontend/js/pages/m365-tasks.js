/**
 * Mirai HelpDesk - M365 Tasks Page
 *
 * Microsoft 365 task management for operators and agents.
 */

const M365TasksPage = {
    currentPage: 1,
    pageSize: 20,
    filters: {},

    taskTypeLabels: {
        'license_assign': 'ライセンス付与',
        'license_remove': 'ライセンス剥奪',
        'password_reset': 'パスワードリセット',
        'mfa_reset': 'MFAリセット',
        'mailbox_permission': 'メールボックス権限',
        'group_add': 'グループ追加',
        'group_remove': 'グループ削除',
        'team_create': 'Teams作成',
        'team_owner_change': 'Teams所有者変更',
        'onedrive_restore': 'OneDrive復元',
        'onedrive_share_remove': 'OneDrive共有解除',
        'user_offboard': '退職者処理',
        'user_onboard': '新規入社者処理',
        'other': 'その他',
    },

    statusLabels: {
        'pending': '承認待ち',
        'approved': '承認済み',
        'in_progress': '実施中',
        'completed': '完了',
        'failed': '失敗',
        'cancelled': 'キャンセル',
    },

    statusColors: {
        'pending': 'warning',
        'approved': 'info',
        'in_progress': 'primary',
        'completed': 'success',
        'failed': 'error',
        'cancelled': 'secondary',
    },

    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'M365 タスク';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="filter-status" class="filter-select">
                        <option value="">すべてのステータス</option>
                        <option value="pending">承認待ち</option>
                        <option value="approved">承認済み</option>
                        <option value="in_progress">実施中</option>
                        <option value="completed">完了</option>
                        <option value="failed">失敗</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                </div>
            </div>
            <div class="card">
                <div id="tasks-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value || undefined;
            this.loadTasks();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadTasks());

        await this.loadTasks();
    },

    async loadTasks() {
        const container = document.getElementById('tasks-list');
        try {
            const data = await API.getM365Tasks({ page: this.currentPage, ...this.filters });
            this.renderTasks(data);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderTasks(data) {
        const container = document.getElementById('tasks-list');
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-cloud-off"></i>
                    <h3>M365タスクがありません</h3>
                    <p>チケットからM365操作タスクを作成してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>タスク種別</th>
                        <th>対象</th>
                        <th>ステータス</th>
                        <th>作成日時</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(task => `
                        <tr data-id="${task.id}">
                            <td>#${task.id}</td>
                            <td>
                                <span class="badge badge-outline">
                                    ${this.taskTypeLabels[task.task_type] || task.task_type}
                                </span>
                            </td>
                            <td>
                                <div class="cell-content">
                                    ${task.target_upn || task.target_description || '-'}
                                </div>
                            </td>
                            <td>
                                <span class="badge badge-${this.statusColors[task.status] || 'secondary'}">
                                    ${this.statusLabels[task.status] || task.status}
                                </span>
                            </td>
                            <td>${this.formatDate(task.created_at)}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-ghost btn-sm view-btn" data-id="${task.id}">
                                        <i class="lucide-eye"></i>
                                    </button>
                                    ${task.status === 'approved' ? `
                                        <button class="btn btn-primary btn-sm execute-btn" data-id="${task.id}">
                                            <i class="lucide-play"></i> 実施
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Event listeners
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showTaskDetail(btn.dataset.id));
        });
        container.querySelectorAll('.execute-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showExecuteModal(btn.dataset.id));
        });
    },

    async showTaskDetail(taskId) {
        const task = await API.getM365Task(taskId).catch(() => null);
        if (!task) {
            Toast.error('タスクの取得に失敗しました');
            return;
        }

        Modal.create({
            title: `M365タスク #${task.id}`,
            content: `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>タスク種別</label>
                        <span>${this.taskTypeLabels[task.task_type] || task.task_type}</span>
                    </div>
                    <div class="detail-item">
                        <label>ステータス</label>
                        <span class="badge badge-${this.statusColors[task.status]}">${this.statusLabels[task.status]}</span>
                    </div>
                    <div class="detail-item">
                        <label>対象UPN</label>
                        <span>${task.target_upn || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>対象リソース</label>
                        <span>${task.target_resource_id || '-'}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>説明</label>
                        <p>${task.target_description}</p>
                    </div>
                    <div class="detail-item">
                        <label>作成日時</label>
                        <span>${this.formatDate(task.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <label>完了日時</label>
                        <span>${task.completed_at ? this.formatDate(task.completed_at) : '-'}</span>
                    </div>
                </div>
            `,
            size: 'medium'
        });
    },

    async showExecuteModal(taskId) {
        // Fetch task details
        const task = await API.getM365Task(taskId).catch(() => null);
        if (!task) {
            Toast.error('タスクの取得に失敗しました');
            return;
        }

        // Show confirmation modal first
        Modal.create({
            title: 'M365操作確認',
            content: `
                <div class="m365-execution-confirm">
                    <div class="confirm-warning">
                        <i class="lucide-alert-triangle"></i>
                        <span>以下のM365操作を実行します。実行前に内容を確認してください。</span>
                    </div>

                    <div class="confirm-details">
                        <div class="detail-row">
                            <label>操作種別</label>
                            <span class="badge badge-primary">${this.taskTypeLabels[task.task_type] || task.task_type}</span>
                        </div>
                        <div class="detail-row">
                            <label>対象ユーザー</label>
                            <span class="monospace">${this.escapeHtml(task.target_upn || task.target_description)}</span>
                        </div>
                        ${task.target_resource_id ? `
                            <div class="detail-row">
                                <label>対象リソース</label>
                                <span class="monospace">${this.escapeHtml(task.target_resource_id)}</span>
                            </div>
                        ` : ''}
                        <div class="detail-row">
                            <label>チケット</label>
                            <span>#${task.ticket_id}</span>
                        </div>
                        ${task.approved_by ? `
                            <div class="detail-row">
                                <label>承認者</label>
                                <span>${this.escapeHtml(task.approved_by)}</span>
                            </div>
                        ` : ''}
                        <div class="detail-row full-width">
                            <label>説明</label>
                            <p>${this.escapeHtml(task.target_description)}</p>
                        </div>
                    </div>

                    <div class="execution-method">
                        <label class="form-label">実施方法を選択 <span class="required">*</span></label>
                        <div class="radio-group">
                            <label class="radio-card">
                                <input type="radio" name="method" value="graph_api" checked>
                                <div class="radio-content">
                                    <i class="lucide-cloud"></i>
                                    <span>Microsoft Graph API</span>
                                    <small>推奨: 自動実行、ログ自動記録</small>
                                </div>
                            </label>
                            <label class="radio-card">
                                <input type="radio" name="method" value="admin_center">
                                <div class="radio-content">
                                    <i class="lucide-layout-dashboard"></i>
                                    <span>管理センター（手動）</span>
                                    <small>GUIでの手動操作</small>
                                </div>
                            </label>
                            <label class="radio-card">
                                <input type="radio" name="method" value="powershell">
                                <div class="radio-content">
                                    <i class="lucide-terminal"></i>
                                    <span>PowerShell</span>
                                    <small>スクリプトでの実行</small>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button id="confirm-execute-btn" class="btn btn-primary">
                    <i class="lucide-play"></i> 実行
                </button>
            `,
            size: 'large'
        });

        document.getElementById('confirm-execute-btn').addEventListener('click', () => {
            const selectedMethod = document.querySelector('input[name="method"]:checked').value;
            Modal.hide();
            this.showExecutionLogModal(taskId, selectedMethod, task);
        });
    },

    showExecutionLogModal(taskId, method, task) {
        Modal.create({
            title: '実施ログ記録',
            content: `
                <form id="execute-form">
                    <div class="execution-summary">
                        <div class="summary-item">
                            <label>操作</label>
                            <span>${this.taskTypeLabels[task.task_type]}</span>
                        </div>
                        <div class="summary-item">
                            <label>実施方法</label>
                            <span class="badge badge-info">${this.getMethodLabel(method)}</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>コマンド/操作内容 <span class="required">*</span></label>
                        <textarea name="command_or_screen" required rows="4"
                                  placeholder="実行したコマンド、操作手順、またはスクリーンショット情報を記録してください&#10;&#10;例:&#10;- PowerShell: Set-AzureADUser -ObjectId xxx -Department 'IT'&#10;- 管理センター: [ユーザー] > [詳細] > [部署] を変更&#10;- Graph API: PATCH /users/{id} { department: 'IT' }"></textarea>
                        <small>監査証跡として重要です。詳細に記録してください。</small>
                    </div>

                    <div class="form-group">
                        <label>結果 <span class="required">*</span></label>
                        <select name="result" required>
                            <option value="success">成功</option>
                            <option value="failure">失敗</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>結果詳細・エビデンス <span class="required">*</span></label>
                        <textarea name="result_details" required rows="3"
                                  placeholder="実行結果の詳細を記録してください&#10;&#10;成功時:&#10;- 設定が反映されたことを確認&#10;- ユーザーがログイン可能になったことを確認&#10;&#10;失敗時:&#10;- エラーメッセージ&#10;- 失敗の原因&#10;- 次回の対応方法"></textarea>
                    </div>

                    ${method !== 'graph_api' ? `
                        <div class="form-group">
                            <label>エビデンス添付</label>
                            <input type="file" name="evidence" accept="image/*,.pdf" multiple>
                            <small>スクリーンショットやログファイルを添付してください（任意）</small>
                        </div>
                    ` : ''}

                    <div class="audit-notice">
                        <i class="lucide-shield-check"></i>
                        <div>
                            <strong>監査証跡について</strong>
                            <p>この実施ログは監査証跡として記録され、変更・削除できません。正確な情報を入力してください。</p>
                        </div>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="execute-form" class="btn btn-primary">
                    <i class="lucide-save"></i> 記録
                </button>
            `,
            size: 'large'
        });

        document.getElementById('execute-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);

            try {
                await API.logExecution(taskId, {
                    method: method,
                    command_or_screen: fd.get('command_or_screen'),
                    result: fd.get('result'),
                    result_details: fd.get('result_details'),
                });

                Modal.hide();
                Toast.success('実施ログを記録しました');
                this.loadTasks();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    },

    getMethodLabel(method) {
        const labels = {
            'graph_api': 'Graph API',
            'admin_center': '管理センター',
            'powershell': 'PowerShell',
        };
        return labels[method] || method;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

window.M365TasksPage = M365TasksPage;
