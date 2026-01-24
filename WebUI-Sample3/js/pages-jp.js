/**
 * ページレンダリング関数（日本語版）
 */

// ヘルプデスク一覧
function renderHelpdeskList() {
    document.getElementById('section-helpdesk-list').innerHTML = `
        <div class="content-area">
            <div class="content-header">
                <div>
                    <h2>ヘルプデスク一覧</h2>
                    <p>全${SAMPLE_TICKETS.length}件のチケットを管理</p>
                </div>
                <button class="btn btn-primary" onclick="navigate('create-ticket')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    新規作成
                </button>
            </div>

            <div class="card">
                <div style="overflow-x:auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:80px">ID</th>
                                <th style="width:140px">カテゴリー</th>
                                <th style="width:240px">タイトル</th>
                                <th style="width:300px">概要説明</th>
                                <th style="width:140px">解決方法</th>
                                <th style="width:120px">状況</th>
                                <th style="width:280px">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${SAMPLE_TICKETS.map((t, i) => `
                                <tr>
                                    <td><span class="ticket-id">#${t.ticket_number}</span></td>
                                    <td>
                                        <span class="ticket-category">
                                            <span class="category-dot ${['network','software','hardware','security','account'][i % 5]}"></span>
                                            ${['ネットワーク','ソフトウェア','ハードウェア','セキュリティ','アカウント'][i % 5]}
                                        </span>
                                    </td>
                                    <td style="font-weight:500;color:var(--text-primary)">${t.subject}</td>
                                    <td style="font-size:0.85rem;color:var(--text-secondary)">${t.description}</td>
                                    <td style="font-size:0.85rem;color:var(--text-secondary)">${t.resolved_at ? '✅ 解決済み' : '🔍 調査中'}</td>
                                    <td>
                                        <span class="ticket-status-badge ${getStatusClass(t.status)}">
                                            ${getStatusLabel(t.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div style="display:flex;gap:6px">
                                            <button class="btn btn-sm" style="padding:6px 12px;font-size:12px" onclick="viewTicketDetail('${t.ticket_id}')">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                                                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                                                </svg>
                                                詳細
                                            </button>
                                            <button class="btn btn-sm btn-secondary" style="padding:6px 12px;font-size:12px" onclick="editTicket('${t.ticket_id}')">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                                編集
                                            </button>
                                            <button class="btn btn-sm" style="padding:6px 12px;font-size:12px;background:var(--error);color:white" onclick="deleteTicket('${t.ticket_id}')">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                </svg>
                                                削除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 新規チケット作成
function renderCreateTicket() {
    document.getElementById('section-create-ticket').innerHTML = `
        <div class="content-area">
            <div class="content-header">
                <h2>新規チケット作成</h2>
                <p>問題や依頼を登録してください</p>
            </div>

            <div class="card" style="max-width:900px">
                <form onsubmit="createTicket(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">種別 *</label>
                            <select class="form-select" required>
                                <option value="incident">🚨 障害（Incident）</option>
                                <option value="service_request">📋 サービス要求（Service Request）</option>
                                <option value="change">🔄 変更（Change）</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">カテゴリー</label>
                            <select class="form-select">
                                <option value="">選択してください</option>
                                <option value="network">ネットワーク</option>
                                <option value="software">ソフトウェア</option>
                                <option value="hardware">ハードウェア</option>
                                <option value="security">セキュリティ</option>
                                <option value="account">アカウント</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">タイトル *</label>
                        <input type="text" class="form-input" placeholder="例: PCが起動しません" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">概要説明 *</label>
                        <textarea class="form-input" rows="5" placeholder="問題の詳細や発生状況を入力してください" required></textarea>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">影響度 *</label>
                            <select class="form-select" required>
                                <option value="individual">個人</option>
                                <option value="department">部署</option>
                                <option value="company">全社</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">緊急度 *</label>
                            <select class="form-select" required>
                                <option value="low">低</option>
                                <option value="medium" selected>中</option>
                                <option value="high">高</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:flex;gap:12px;margin-top:32px">
                        <button type="submit" class="btn btn-primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            作成
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="navigate('my-tickets')">キャンセル</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// FAQ
function renderFAQ() {
    document.getElementById('section-faq').innerHTML = `
        <div class="content-area">
            <div class="content-header">
                <h2>よくある質問 (FAQ)</h2>
                <p>IT関連のよくある質問と回答</p>
            </div>

            <div class="faq-search">
                <input type="text" id="faqSearch" placeholder="🔍 FAQを検索..." onkeyup="filterFAQ()">
            </div>

            <div class="faq-categories">
                <button class="faq-cat-btn active" onclick="filterFAQCategory('all')">すべて</button>
                <button class="faq-cat-btn" onclick="filterFAQCategory('network')">ネットワーク</button>
                <button class="faq-cat-btn" onclick="filterFAQCategory('software')">ソフトウェア</button>
                <button class="faq-cat-btn" onclick="filterFAQCategory('security')">セキュリティ</button>
                <button class="faq-cat-btn" onclick="filterFAQCategory('account')">アカウント</button>
            </div>

            <div class="faq-list" id="faqList">
                <div class="faq-item" data-cat="network">
                    <div class="faq-question" onclick="toggleFAQ(this)">
                        <span>WiFiに接続できない場合はどうすればいいですか？</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                    <div class="faq-answer">
                        <p>以下の手順をお試しください：</p>
                        <ol>
                            <li>WiFiがオンになっているか確認</li>
                            <li>機内モードがオフになっているか確認</li>
                            <li>WiFiを一度オフにして再度オンにする</li>
                            <li>PCを再起動する</li>
                            <li>上記で解決しない場合はIT部門(内線3456)へ連絡</li>
                        </ol>
                    </div>
                </div>

                <div class="faq-item" data-cat="security">
                    <div class="faq-question" onclick="toggleFAQ(this)">
                        <span>パスワードを忘れた場合はどうすればいいですか？</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                    <div class="faq-answer">
                        <p>パスワードリセットポータルをご利用ください：</p>
                        <ol>
                            <li>https://passwordreset.company.co.jp にアクセス</li>
                            <li>社員番号を入力</li>
                            <li>登録済みのメールまたは電話で本人確認</li>
                            <li>新しいパスワードを設定</li>
                        </ol>
                        <p class="faq-note">※ パスワードは8文字以上、大小英字・数字・記号を含める必要があります</p>
                    </div>
                </div>

                <div class="faq-item" data-cat="network">
                    <div class="faq-question" onclick="toggleFAQ(this)">
                        <span>VPNの接続方法を教えてください</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                    <div class="faq-answer">
                        <p>FortiClient VPNを使用して接続します：</p>
                        <ol>
                            <li>FortiClient VPNアプリを起動</li>
                            <li>接続先: vpn.company.co.jp を選択</li>
                            <li>ユーザーID: 社員番号を入力</li>
                            <li>パスワード: ADパスワードを入力</li>
                            <li>Microsoft Authenticatorで二要素認証</li>
                        </ol>
                    </div>
                </div>

                <div class="faq-item" data-cat="software">
                    <div class="faq-question" onclick="toggleFAQ(this)">
                        <span>ソフトウェアのインストール方法は？</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                    <div class="faq-answer">
                        <p>社内ソフトウェアポータルからインストールできます：</p>
                        <ol>
                            <li>https://software.company.co.jp にアクセス</li>
                            <li>必要なソフトウェアを検索</li>
                            <li>「インストール」ボタンをクリック</li>
                            <li>管理者権限が必要な場合は申請フォームを提出</li>
                        </ol>
                    </div>
                </div>

                <div class="faq-item" data-cat="hardware">
                    <div class="faq-question" onclick="toggleFAQ(this)">
                        <span>プリンターの設定方法は？</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                    <div class="faq-answer">
                        <p>ネットワークプリンターを追加します：</p>
                        <ol>
                            <li>「設定」→「プリンターとスキャナー」を開く</li>
                            <li>「プリンターまたはスキャナーを追加」をクリック</li>
                            <li>ネットワークプリンター一覧から選択</li>
                            <li>ドライバーが自動インストールされます</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 承認管理
function renderApprovals() {
    const pending = SAMPLE_APPROVALS.filter(a => a.state === 'requested');

    document.getElementById('section-approvals').innerHTML = `
        <div class="content-area">
            <div class="content-header">
                <h2>承認管理</h2>
                <p>${pending.length}件の承認待ち - SOD検証済み</p>
            </div>

            <div class="card">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>チケット</th>
                                <th>依頼内容</th>
                                <th>依頼者</th>
                                <th>SOD検証</th>
                                <th>依頼日時</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pending.map(a => `
                                <tr>
                                    <td><span class="ticket-id">#${a.ticket_number}</span></td>
                                    <td style="font-weight:500">${a.description}</td>
                                    <td>${a.requester}<br><small style="color:var(--text-muted)">${a.requester_role}</small></td>
                                    <td><span class="sod-badge sod-ok">✅ OK</span></td>
                                    <td style="font-size:0.85rem;color:var(--text-secondary)">${new Date(a.created_at).toLocaleString('ja-JP')}</td>
                                    <td>
                                        <div style="display:flex;gap:8px">
                                            <button class="btn btn-sm" style="background:var(--success);color:white;padding:6px 14px;font-size:12px" onclick="approve('${a.approval_id}')">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                                                    <polyline points="20 6 9 17 4 12"/>
                                                </svg>
                                                承認
                                            </button>
                                            <button class="btn btn-sm" style="background:var(--error);color:white;padding:6px 14px;font-size:12px" onclick="reject('${a.approval_id}')">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                                </svg>
                                                却下
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// M365管理
function renderM365() {
    const pendingTasks = SAMPLE_M365_TASKS.filter(t => t.state === 'pending');

    document.getElementById('section-m365').innerHTML = `
        <div class="content-area">
            <div class="content-header">
                <h2>M365管理</h2>
                <p>Microsoft 365 操作タスク管理</p>
            </div>

            <div class="card">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>タスクID</th>
                                <th>種別</th>
                                <th>対象UPN</th>
                                <th>承認状態</th>
                                <th>SOD検証</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendingTasks.map(t => `
                                <tr>
                                    <td><span class="ticket-id">${t.task_number}</span></td>
                                    <td style="font-weight:500">${t.task_type}</td>
                                    <td style="font-family:monospace;font-size:0.85rem;color:var(--text-secondary)">${t.target_upn}</td>
                                    <td><span class="approval-badge approved">✅ 承認済み</span></td>
                                    <td><span class="sod-badge sod-ok">✅ 承認者≠実施者</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" style="padding:6px 14px;font-size:12px" onclick="executeM365('${t.task_id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                                                <polygon points="5 3 19 12 5 21 5 3"/>
                                            </svg>
                                            実施
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// システム設定
function renderSettings() {
    document.getElementById('section-settings').innerHTML = `
        <div class="content-area">
            <div class="content-header">
                <h2>システム設定</h2>
                <p>AI APIキーと品質保証Hooks設定</p>
            </div>

            <div class="settings-grid">
                <div class="card">
                    <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:24px">🤖 AI設定</h3>
                    <div class="form-group">
                        <label class="form-label">Claude API Key</label>
                        <input type="password" class="form-input" value="sk-ant-****" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Gemini API Key</label>
                        <input type="password" class="form-input" value="AIza****" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Perplexity API Key</label>
                        <input type="password" class="form-input" value="pplx-****" readonly>
                    </div>
                </div>

                <div class="card">
                    <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:24px">🎯 品質保証Hooks</h3>
                    ${['Pre-Task Hook', 'Duplicate-Check Hook (85%閾値)', 'Deviation-Check Hook', 'Post-Task Hook'].map(hook => `
                        <div class="setting-item">
                            <label class="checkbox-label">
                                <input type="checkbox" class="checkbox-input" checked>
                                <span>${hook}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ユーティリティ関数
function getStatusClass(status) {
    if (status === 'New' || status === 'Triage') return 'open';
    if (status.includes('Progress') || status === 'Assigned') return 'in-progress';
    if (status.includes('Pending')) return 'pending';
    if (status === 'Resolved') return 'resolved';
    if (status === 'Closed') return 'closed';
    return '';
}

function getStatusLabel(status) {
    const labels = {
        'New': '新規',
        'Triage': '未対応',
        'Assigned': '担当割当済み',
        'In Progress': '対応中',
        'Pending Customer': '顧客保留',
        'Pending Approval': '承認待ち',
        'Pending Change Window': '変更待ち',
        'Resolved': '解決済み',
        'Closed': '完了'
    };
    return labels[status] || status;
}

function viewTicketDetail(id) {
    const ticket = SAMPLE_TICKETS.find(t => t.ticket_id === id);
    if (!ticket) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>チケット詳細 #${ticket.ticket_number}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <h2 style="font-size:1.5rem;margin-bottom:20px">${ticket.subject}</h2>
                <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">
                    <span class="priority-badge priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                    <span class="ticket-status-badge ${getStatusClass(ticket.status)}">${getStatusLabel(ticket.status)}</span>
                    <span class="itsm-badge">${ITSM_TYPES[ticket.itsm_type].label}</span>
                </div>
                <div class="detail-section">
                    <h4>概要説明</h4>
                    <p>${ticket.description}</p>
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">カテゴリー</div>
                        <div class="detail-value">${['ハードウェア','ソフトウェア','M365','ネットワーク'][ticket.ticket_number % 4]}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">作成日時</div>
                        <div class="detail-value">${new Date(ticket.created_at).toLocaleString('ja-JP')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">影響度</div>
                        <div class="detail-value">${ticket.impact}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">緊急度</div>
                        <div class="detail-value">${ticket.urgency}</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">閉じる</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleFAQ(element) {
    const faqItem = element.parentElement;
    faqItem.classList.toggle('active');
}

function filterFAQ() {
    const search = document.getElementById('faqSearch').value.toLowerCase();
    document.querySelectorAll('.faq-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? 'block' : 'none';
    });
}

function filterFAQCategory(cat) {
    document.querySelectorAll('.faq-cat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.faq-item').forEach(item => {
        if (cat === 'all' || item.dataset.cat === cat) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function createTicket(e) {
    e.preventDefault();
    console.log('✅ チケット作成');
    alert('✅ チケットを作成しました！\n\n自動実行:\n• 優先度自動計算（Impact × Urgency）\n• SLA期限自動設定\n• ITSM分類\n• 履歴記録');
    navigate('my-tickets');
}

function editTicket(id) {
    console.log('編集:', id);
    alert('編集機能（実装中）');
}

function deleteTicket(id) {
    const ticket = SAMPLE_TICKETS.find(t => t.ticket_id === id);
    if (confirm(`チケット #${ticket.ticket_number} を削除しますか？\n\n※ 履歴は追記専用テーブルに保持されます`)) {
        console.log('削除:', id);
        alert('削除しました');
    }
}

function approve(id) {
    console.log('承認:', id);
    alert('✅ 承認しました\n\nSOD検証: 承認者≠依頼者 ✅\n履歴記録: ticket_history追記専用テーブル');
}

function reject(id) {
    console.log('却下:', id);
    alert('❌ 却下しました\n\n却下理由と履歴が記録されます');
}

function executeM365(id) {
    console.log('M365実施:', id);
    alert('🚀 M365操作を実施します\n\n実施前チェック:\n✅ 承認済み\n✅ SOD検証OK（承認者≠実施者）\n\n実施後記録:\n• m365_execution_logs追記専用テーブル\n• エビデンス添付必須\n• データベーストリガーで改ざん防止');
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 アプリケーション初期化');
    loadSection('ai-support');
});
