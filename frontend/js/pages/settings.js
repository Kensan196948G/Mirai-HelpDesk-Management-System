/**
 * Mirai HelpDesk - Settings Page
 *
 * System settings for administrators.
 */

const SettingsPage = {
    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '設定';

        content.innerHTML = `
            <div class="settings-layout">
                <!-- Sidebar Navigation -->
                <div class="settings-nav">
                    <button class="settings-nav-item active" data-section="general">
                        <i class="lucide-settings"></i>
                        <span>一般設定</span>
                    </button>
                    <button class="settings-nav-item" data-section="sla">
                        <i class="lucide-clock"></i>
                        <span>SLA設定</span>
                    </button>
                    <button class="settings-nav-item" data-section="notifications">
                        <i class="lucide-bell"></i>
                        <span>通知設定</span>
                    </button>
                    <button class="settings-nav-item" data-section="m365">
                        <i class="lucide-cloud"></i>
                        <span>M365連携</span>
                    </button>
                    <button class="settings-nav-item" data-section="audit">
                        <i class="lucide-shield"></i>
                        <span>監査ログ</span>
                    </button>
                </div>

                <!-- Settings Content -->
                <div class="settings-content">
                    <div id="settings-section"></div>
                </div>
            </div>
        `;

        // Navigation event listeners
        document.querySelectorAll('.settings-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderSection(btn.dataset.section);
            });
        });

        // Load initial section
        this.renderSection('general');
    },

    renderSection(section) {
        const container = document.getElementById('settings-section');

        switch (section) {
            case 'general':
                this.renderGeneralSettings(container);
                break;
            case 'sla':
                this.renderSLASettings(container);
                break;
            case 'notifications':
                this.renderNotificationSettings(container);
                break;
            case 'm365':
                this.renderM365Settings(container);
                break;
            case 'audit':
                this.renderAuditSettings(container);
                break;
        }
    },

    renderGeneralSettings(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">一般設定</h3>
                </div>
                <div class="card-body">
                    <form id="general-settings-form">
                        <div class="form-group">
                            <label>システム名</label>
                            <input type="text" name="system_name" value="Mirai HelpDesk" placeholder="システム名">
                        </div>
                        <div class="form-group">
                            <label>組織名</label>
                            <input type="text" name="organization" placeholder="株式会社サンプル">
                        </div>
                        <div class="form-group">
                            <label>タイムゾーン</label>
                            <select name="timezone">
                                <option value="Asia/Tokyo" selected>Asia/Tokyo (JST)</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>言語</label>
                            <select name="language">
                                <option value="ja" selected>日本語</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="auto_close" checked>
                                <span>チケット自動クローズ（解決後7日経過）</span>
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('general-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            Toast.success('設定を保存しました');
        });
    },

    renderSLASettings(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">SLA ポリシー設定</h3>
                </div>
                <div class="card-body">
                    <div class="sla-table">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>優先度</th>
                                    <th>初動対応時間</th>
                                    <th>解決目標時間</th>
                                    <th>営業時間のみ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span class="badge badge-p1">P1 - 緊急</span></td>
                                    <td><input type="text" class="input-sm" value="15分" style="width: 80px;"></td>
                                    <td><input type="text" class="input-sm" value="2時間" style="width: 80px;"></td>
                                    <td><input type="checkbox"></td>
                                </tr>
                                <tr>
                                    <td><span class="badge badge-p2">P2 - 高</span></td>
                                    <td><input type="text" class="input-sm" value="1時間" style="width: 80px;"></td>
                                    <td><input type="text" class="input-sm" value="8時間" style="width: 80px;"></td>
                                    <td><input type="checkbox" checked></td>
                                </tr>
                                <tr>
                                    <td><span class="badge badge-p3">P3 - 中</span></td>
                                    <td><input type="text" class="input-sm" value="4時間" style="width: 80px;"></td>
                                    <td><input type="text" class="input-sm" value="3営業日" style="width: 80px;"></td>
                                    <td><input type="checkbox" checked></td>
                                </tr>
                                <tr>
                                    <td><span class="badge badge-p4">P4 - 低</span></td>
                                    <td><input type="text" class="input-sm" value="1営業日" style="width: 80px;"></td>
                                    <td><input type="text" class="input-sm" value="5営業日" style="width: 80px;"></td>
                                    <td><input type="checkbox" checked></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="form-actions" style="margin-top: var(--spacing-lg);">
                        <button class="btn btn-primary" onclick="Toast.success('SLA設定を保存しました')">保存</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">営業時間設定</h3>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>開始時刻</label>
                            <input type="time" value="09:00">
                        </div>
                        <div class="form-group">
                            <label>終了時刻</label>
                            <input type="time" value="18:00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>営業日</label>
                        <div class="checkbox-group">
                            <label class="checkbox-label"><input type="checkbox"><span>日</span></label>
                            <label class="checkbox-label"><input type="checkbox" checked><span>月</span></label>
                            <label class="checkbox-label"><input type="checkbox" checked><span>火</span></label>
                            <label class="checkbox-label"><input type="checkbox" checked><span>水</span></label>
                            <label class="checkbox-label"><input type="checkbox" checked><span>木</span></label>
                            <label class="checkbox-label"><input type="checkbox" checked><span>金</span></label>
                            <label class="checkbox-label"><input type="checkbox"><span>土</span></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderNotificationSettings(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">通知設定</h3>
                </div>
                <div class="card-body">
                    <form id="notification-settings-form">
                        <h4 style="margin-bottom: var(--spacing-md);">メール通知</h4>
                        <div class="notification-options">
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>新規チケット作成時</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>チケット割り当て時</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>チケットコメント追加時</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>チケット解決時</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>SLA期限接近時（1時間前）</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>承認リクエスト受信時</span>
                            </label>
                        </div>

                        <h4 style="margin: var(--spacing-lg) 0 var(--spacing-md);">SMTPサーバー設定</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>SMTPホスト</label>
                                <input type="text" name="smtp_host" placeholder="smtp.example.com">
                            </div>
                            <div class="form-group">
                                <label>ポート</label>
                                <input type="number" name="smtp_port" value="587" style="width: 100px;">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ユーザー名</label>
                                <input type="text" name="smtp_user" placeholder="user@example.com">
                            </div>
                            <div class="form-group">
                                <label>パスワード</label>
                                <input type="password" name="smtp_password" placeholder="••••••••">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>送信元アドレス</label>
                            <input type="email" name="from_email" placeholder="helpdesk@example.com">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="Toast.info('テストメールを送信しました')">テスト送信</button>
                            <button type="submit" class="btn btn-primary">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('notification-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            Toast.success('通知設定を保存しました');
        });
    },

    renderM365Settings(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Microsoft 365 連携設定</h3>
                </div>
                <div class="card-body">
                    <div class="alert alert-info" style="margin-bottom: var(--spacing-lg);">
                        <i class="lucide-info"></i>
                        <span>Microsoft Graph API を使用してM365と連携します。Azure AD でアプリ登録が必要です。</span>
                    </div>

                    <form id="m365-settings-form">
                        <div class="form-group">
                            <label>テナントID <span class="required">*</span></label>
                            <input type="text" name="tenant_id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                        </div>
                        <div class="form-group">
                            <label>クライアントID <span class="required">*</span></label>
                            <input type="text" name="client_id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                        </div>
                        <div class="form-group">
                            <label>クライアントシークレット <span class="required">*</span></label>
                            <input type="password" name="client_secret" placeholder="••••••••">
                        </div>

                        <h4 style="margin: var(--spacing-lg) 0 var(--spacing-md);">必要なAPI権限</h4>
                        <div class="permission-list">
                            <div class="permission-item">
                                <i class="lucide-check-circle text-success"></i>
                                <span>User.ReadWrite.All</span>
                            </div>
                            <div class="permission-item">
                                <i class="lucide-check-circle text-success"></i>
                                <span>Directory.ReadWrite.All</span>
                            </div>
                            <div class="permission-item">
                                <i class="lucide-check-circle text-success"></i>
                                <span>Group.ReadWrite.All</span>
                            </div>
                            <div class="permission-item">
                                <i class="lucide-check-circle text-success"></i>
                                <span>Mail.ReadWrite</span>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="Toast.info('接続テストを実行しました')">接続テスト</button>
                            <button type="submit" class="btn btn-primary">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('m365-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            Toast.success('M365設定を保存しました');
        });
    },

    renderAuditSettings(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">監査ログ設定</h3>
                </div>
                <div class="card-body">
                    <form id="audit-settings-form">
                        <div class="form-group">
                            <label>ログ保持期間</label>
                            <select name="retention_days">
                                <option value="365">1年</option>
                                <option value="730" selected>2年</option>
                                <option value="1095">3年</option>
                                <option value="1825">5年</option>
                            </select>
                        </div>

                        <h4 style="margin: var(--spacing-lg) 0 var(--spacing-md);">記録する操作</h4>
                        <div class="notification-options">
                            <label class="checkbox-label">
                                <input type="checkbox" checked disabled>
                                <span>ログイン/ログアウト（必須）</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked disabled>
                                <span>チケット操作（必須）</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked disabled>
                                <span>M365操作実施（必須）</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked disabled>
                                <span>承認操作（必須）</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>ナレッジ記事編集</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>ユーザー管理操作</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>設定変更</span>
                            </label>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="Toast.info('監査ログのエクスポート機能は開発中です')">
                                <i class="lucide-download"></i> エクスポート
                            </button>
                            <button type="submit" class="btn btn-primary">保存</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card" style="margin-top: var(--spacing-lg);">
                <div class="card-header">
                    <h3 class="card-title">監査ログ統計</h3>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">12,450</div>
                                <div class="stat-label">総ログ数</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">1,234</div>
                                <div class="stat-label">今月のログ</div>
                            </div>
                        </div>
                        <div class="stat-card compact">
                            <div class="stat-content">
                                <div class="stat-value">256 MB</div>
                                <div class="stat-label">ストレージ使用量</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('audit-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            Toast.success('監査設定を保存しました');
        });
    },
};

window.SettingsPage = SettingsPage;
