/**
 * Mirai HelpDesk - M365 Licenses Page
 *
 * Microsoft 365 license management and monitoring interface.
 * Displays available licenses, usage, and assigned users.
 */

const M365LicensesPage = {
    licenses: [],
    selectedLicense: null,

    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'M365 ライセンス管理';

        content.innerHTML = `
            <div class="m365-licenses-container">
                <div class="toolbar">
                    <div class="toolbar-left">
                        <h2>ライセンス利用状況</h2>
                    </div>
                    <div class="toolbar-right">
                        <button id="refresh-licenses-btn" class="btn btn-secondary">
                            <i class="lucide-refresh-cw"></i>
                            <span>更新</span>
                        </button>
                    </div>
                </div>

                <div id="licenses-grid" class="licenses-grid">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>ライセンス情報を読み込み中...</p>
                    </div>
                </div>

                <div id="license-detail-section" style="display: none;">
                    <div class="card">
                        <div class="card-header">
                            <h3 id="license-detail-title"></h3>
                            <button id="close-detail-btn" class="btn btn-ghost btn-sm">
                                <i class="lucide-x"></i>
                            </button>
                        </div>
                        <div id="license-detail-content"></div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('refresh-licenses-btn').addEventListener('click', () => this.loadLicenses());

        await this.loadLicenses();
    },

    async loadLicenses() {
        const grid = document.getElementById('licenses-grid');

        try {
            const data = await API.getM365Licenses();
            this.licenses = data.value || data;

            if (this.licenses.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="lucide-key-off"></i>
                        <h3>ライセンス情報がありません</h3>
                        <p>M365ライセンスが見つかりませんでした</p>
                    </div>
                `;
                return;
            }

            this.renderLicenses();
        } catch (error) {
            console.error('License loading error:', error);
            grid.innerHTML = `
                <div class="empty-state error">
                    <i class="lucide-alert-circle"></i>
                    <h3>エラーが発生しました</h3>
                    <p>${error.message || 'ライセンス情報の取得に失敗しました'}</p>
                </div>
            `;
        }
    },

    renderLicenses() {
        const grid = document.getElementById('licenses-grid');

        grid.innerHTML = this.licenses.map(license => {
            const consumed = license.consumedUnits || 0;
            const enabled = license.prepaidUnits?.enabled || 0;
            const warning = license.prepaidUnits?.warning || 0;
            const suspended = license.prepaidUnits?.suspended || 0;
            const total = enabled + warning;
            const available = total - consumed;
            const usagePercent = total > 0 ? Math.round((consumed / total) * 100) : 0;

            const statusClass =
                usagePercent >= 95 ? 'critical' :
                usagePercent >= 80 ? 'warning' :
                'normal';

            return `
                <div class="license-card" data-sku-id="${license.skuId}">
                    <div class="license-card-header">
                        <div class="license-icon">
                            <i class="lucide-key"></i>
                        </div>
                        <div class="license-name">
                            <h4>${this.escapeHtml(license.skuPartNumber)}</h4>
                            <p class="text-muted">${this.getLicenseDisplayName(license.skuPartNumber)}</p>
                        </div>
                    </div>

                    <div class="license-usage">
                        <div class="usage-stats">
                            <div class="stat">
                                <span class="stat-value">${consumed}</span>
                                <span class="stat-label">使用中</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${available}</span>
                                <span class="stat-label">利用可能</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${total}</span>
                                <span class="stat-label">合計</span>
                            </div>
                        </div>

                        <div class="usage-bar-container">
                            <div class="usage-bar ${statusClass}">
                                <div class="usage-bar-fill" style="width: ${usagePercent}%"></div>
                            </div>
                            <div class="usage-percent">
                                <span>${usagePercent}%</span>
                                ${statusClass === 'critical' ? '<span class="badge badge-error">残りわずか</span>' : ''}
                                ${statusClass === 'warning' ? '<span class="badge badge-warning">注意</span>' : ''}
                            </div>
                        </div>

                        ${suspended > 0 ? `
                            <div class="license-warning">
                                <i class="lucide-alert-triangle"></i>
                                <span>${suspended}ライセンスが停止中</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="license-card-footer">
                        <button class="btn btn-ghost btn-sm view-users-btn" data-sku-id="${license.skuId}">
                            <i class="lucide-users"></i>
                            <span>割り当て済みユーザー</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners
        grid.querySelectorAll('.view-users-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showLicenseUsers(btn.dataset.skuId));
        });
    },

    async showLicenseUsers(skuId) {
        const license = this.licenses.find(l => l.skuId === skuId);
        if (!license) return;

        const detailSection = document.getElementById('license-detail-section');
        const detailTitle = document.getElementById('license-detail-title');
        const detailContent = document.getElementById('license-detail-content');

        detailTitle.textContent = `${license.skuPartNumber} - 割り当て済みユーザー`;
        detailContent.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        detailSection.style.display = 'block';

        document.getElementById('close-detail-btn').onclick = () => {
            detailSection.style.display = 'none';
        };

        try {
            const users = await API.getM365LicenseUsers(skuId);

            if (!users || users.length === 0) {
                detailContent.innerHTML = `
                    <div class="empty-state">
                        <i class="lucide-users"></i>
                        <p>このライセンスが割り当てられているユーザーはいません</p>
                    </div>
                `;
                return;
            }

            detailContent.innerHTML = `
                <div class="license-users-list">
                    <div class="list-header">
                        <span>${users.length}人のユーザーに割り当て済み</span>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ユーザー名</th>
                                <th>メールアドレス</th>
                                <th>部署</th>
                                <th>状態</th>
                                <th>割り当て日</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar-sm">
                                                ${this.getUserInitials(user.displayName)}
                                            </div>
                                            <span>${this.escapeHtml(user.displayName)}</span>
                                        </div>
                                    </td>
                                    <td>${this.escapeHtml(user.userPrincipalName)}</td>
                                    <td>${this.escapeHtml(user.department || '-')}</td>
                                    <td>
                                        <span class="badge badge-${user.accountEnabled ? 'success' : 'error'}">
                                            ${user.accountEnabled ? '有効' : '無効'}
                                        </span>
                                    </td>
                                    <td>${user.assignedDate ? this.formatDate(user.assignedDate) : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Failed to load license users:', error);
            detailContent.innerHTML = `
                <div class="empty-state error">
                    <i class="lucide-alert-circle"></i>
                    <p>${error.message || 'ユーザー一覧の取得に失敗しました'}</p>
                </div>
            `;
        }
    },

    getLicenseDisplayName(skuPartNumber) {
        const displayNames = {
            'SPE_E3': 'Microsoft 365 E3 - フル機能のエンタープライズスイート',
            'SPE_E5': 'Microsoft 365 E5 - 高度なセキュリティとコンプライアンス',
            'ENTERPRISEPACK': 'Office 365 E3 - オフィスアプリとクラウドサービス',
            'ENTERPRISEPREMIUM': 'Office 365 E5 - エンタープライズ向けプレミアムプラン',
            'FLOW_FREE': 'Power Automate Free - 無料プラン',
            'POWER_BI_STANDARD': 'Power BI Free - 無料プラン',
            'TEAMS_EXPLORATORY': 'Microsoft Teams Exploratory - 試用ライセンス',
            'EMS': 'Enterprise Mobility + Security - セキュリティとモビリティ',
            'PROJECTPROFESSIONAL': 'Project Professional - プロジェクト管理',
            'VISIOCLIENT': 'Visio Professional - 図表作成ツール',
        };

        return displayNames[skuPartNumber] || 'Microsoft 365 ライセンス';
    },

    getUserInitials(displayName) {
        if (!displayName) return '??';
        const parts = displayName.split(' ').filter(p => p);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return displayName.substring(0, 2).toUpperCase();
    },

    formatDate(isoString) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.M365LicensesPage = M365LicensesPage;
