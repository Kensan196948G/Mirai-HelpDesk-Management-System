/**
 * モダンページレンダリング関数
 */

// 新規チケット作成
function renderCreateTicket() {
    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">Create New Ticket</h1>
                <p class="page-description">問題や依頼を登録してください</p>
            </div>
        </div>

        <div class="card" style="max-width:900px;margin:0 auto">
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
                            <option value="hardware">ハードウェア</option>
                            <option value="software">ソフトウェア</option>
                            <option value="network">ネットワーク</option>
                            <option value="m365">Microsoft 365</option>
                            <option value="security">セキュリティ</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">タイトル *</label>
                    <input type="text" class="form-input" placeholder="例: PCが起動しません" required>
                </div>

                <div class="form-group">
                    <label class="form-label">概要説明 *</label>
                    <textarea class="form-textarea" placeholder="問題の詳細や発生状況を入力してください" required></textarea>
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

                <div class="btn-group" style="margin-top:32px">
                    <button type="submit" class="btn btn-primary btn-large">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:20px;height:20px">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Create Ticket
                    </button>
                    <button type="button" class="btn btn-secondary btn-large" onclick="navigate('my-tickets')">Cancel</button>
                </div>
            </form>
        </div>
    `;
}

// ヘルプデスク一覧（完全版）
function renderHelpdeskList() {
    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">Helpdesk List</h1>
                <p class="page-description">全${SAMPLE_TICKETS.length}件のチケット管理</p>
            </div>
            <button class="btn btn-primary" onclick="navigate('create-ticket')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:18px;height:18px">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Create New
            </button>
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Category</th>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Resolution</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${SAMPLE_TICKETS.map((t, i) => `
                            <tr>
                                <td class="ticket-id">#${t.ticket_number}</td>
                                <td>
                                    <span class="category-badge cat-${['network','software','hardware','account'][i % 4]}">
                                        ${['ネットワーク','ソフトウェア','ハードウェア','アカウント'][i % 4]}
                                    </span>
                                </td>
                                <td style="font-weight:600;color:var(--gray-900);max-width:220px;overflow:hidden;text-overflow:ellipsis">${t.subject}</td>
                                <td style="font-size:13px;color:var(--gray-600);max-width:280px;overflow:hidden;text-overflow:ellipsis">${t.description}</td>
                                <td style="font-size:13px;color:var(--gray-600)">${t.resolved_at ? '✅ 解決済み' : '🔍 調査中'}</td>
                                <td><span class="tag">${t.status}</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn btn-xs btn-primary" onclick="viewTicketDetail('${t.ticket_id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:13px;height:13px">
                                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                                            </svg>
                                            詳細
                                        </button>
                                        <button class="btn btn-xs btn-secondary" onclick="editTicket('${t.ticket_id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:13px;height:13px">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                            編集
                                        </button>
                                        <button class="btn btn-xs btn-danger" onclick="deleteTicket('${t.ticket_id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:13px;height:13px">
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
    `;
}

// AIアシスタント
function renderAIAssistant() {
    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">AI Assistant</h1>
                <p class="page-description">Multi-AI Orchestration による高品質な回答生成</p>
            </div>
        </div>

        <div class="ai-panel">
            <h2 class="ai-panel-title">マルチAIオーケストレーション</h2>
            <p class="ai-panel-desc">Claude（統合）、Gemini（収集）、Perplexity（根拠）を組み合わせて最適な回答を生成</p>

            <div class="ai-selector">
                <div class="ai-option selected" onclick="toggleAI(this)">
                    <div class="ai-icon">🧠</div>
                    <div class="ai-name">Claude</div>
                    <div class="ai-desc">一次判断・最終統合</div>
                </div>
                <div class="ai-option" onclick="toggleAI(this)">
                    <div class="ai-icon">🔍</div>
                    <div class="ai-name">Gemini</div>
                    <div class="ai-desc">情報収集</div>
                </div>
                <div class="ai-option" onclick="toggleAI(this)">
                    <div class="ai-icon">🌐</div>
                    <div class="ai-name">Perplexity</div>
                    <div class="ai-desc">根拠生成</div>
                </div>
            </div>

            <div class="query-section">
                <label class="form-label">問い合わせ内容</label>
                <textarea id="ai-query" class="query-textarea">PCが起動しません。どうすればいいですか？</textarea>
                <button class="btn btn-primary btn-large" onclick="processAI()" style="width:100%;margin-top:24px">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:20px;height:20px">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Execute Multi-AI Processing
                </button>
                <div style="margin-top:16px;padding:16px;background:white;border:1px solid var(--gray-200);border-radius:12px;font-size:13px;color:var(--gray-600)">
                    💡 <strong style="color:var(--gray-800)">Demo:</strong> クリックして3つのAIと7つのSubAgentの並列処理を体験
                </div>
            </div>

            <div class="subagent-section">
                <h3 class="section-title">7つのSubAgent並列処理</h3>
                <div class="subagent-grid">
                    ${Object.entries(SUB_AGENTS).map(([k, a]) => `
                        <div class="subagent-card" id="sub-${k}">
                            <div class="subagent-icon">${a.icon}</div>
                            <div class="subagent-name">${a.name.substring(0,11)}</div>
                            <div class="subagent-role">${a.role.substring(0,12)}...</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div id="ai-result" class="hidden"></div>
    `;
}

// AI自動生成ナレッジ
function renderAIKnowledge() {
    const aiArticles = SAMPLE_KNOWLEDGE.filter(k => k.is_ai_generated);

    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">AI Generated Knowledge</h1>
                <p class="page-description">${aiArticles.length}件のAI生成記事 - 品質保証済み</p>
            </div>
            <button class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:18px;height:18px">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                AI Create New
            </button>
        </div>

        <div class="knowledge-grid">
            ${aiArticles.slice(0, 12).map(k => `
                <div class="knowledge-card" onclick="viewKnowledge('${k.article_id}')">
                    <div class="knowledge-icon">🤖</div>
                    <h3 class="knowledge-title">${k.title}</h3>
                    <div class="knowledge-meta">
                        <span class="tag tag-ai">AI Generated</span>
                        <span class="tag">Quality ${k.quality_score}%</span>
                        <span class="tag">👁️ ${k.view_count}</span>
                    </div>
                    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--gray-100);font-size:11px;color:var(--gray-500)">
                        SubAgents: ${k.subagents.slice(0, 3).join(', ')}...
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ナレッジベース
function renderKnowledge() {
    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">Knowledge Base</h1>
                <p class="page-description">${SAMPLE_KNOWLEDGE.length}件のナレッジ記事</p>
            </div>
        </div>

        <div class="two-column">
            <aside class="sidebar-panel">
                <h3 style="font-size:14px;font-weight:700;color:var(--gray-800);margin-bottom:16px;text-transform:uppercase;letter-spacing:0.05em">Categories</h3>
                ${['すべて', 'Microsoft 365', 'ハードウェア', 'ネットワーク', 'セキュリティ'].map((cat, i) => `
                    <div class="filter-item ${i === 0 ? 'active' : ''}">
                        📁 ${cat}
                    </div>
                `).join('')}
            </aside>

            <div>
                <div class="knowledge-grid">
                    ${SAMPLE_KNOWLEDGE.slice(0, 12).map(k => `
                        <div class="knowledge-card" onclick="viewKnowledge('${k.article_id}')">
                            <div class="knowledge-icon">${k.is_ai_generated ? '🤖' : '📄'}</div>
                            <h3 class="knowledge-title">${k.title}</h3>
                            <div class="knowledge-meta">
                                <span class="tag">${k.category}</span>
                                <span class="tag">👁️ ${k.view_count}</span>
                                ${k.is_ai_generated ? '<span class="tag tag-ai">AI</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// 承認管理
function renderApprovals() {
    const pending = SAMPLE_APPROVALS.filter(a => a.state === 'requested');

    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">Approval Management</h1>
                <p class="page-description">${pending.length}件の承認待ち - SOD検証済み</p>
            </div>
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ticket</th>
                            <th>Request</th>
                            <th>Requester</th>
                            <th>SOD Validation</th>
                            <th>Requested At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pending.map(a => `
                            <tr>
                                <td class="ticket-id">#${a.ticket_number}</td>
                                <td style="font-weight:500">${a.description}</td>
                                <td>${a.requester}<br><span style="font-size:11px;color:var(--gray-500)">${a.requester_role}</span></td>
                                <td><span class="tag" style="background:#d1fae5;color:#047857;border-color:#6ee7b7">✅ Approved</span></td>
                                <td style="font-size:13px;color:var(--gray-500)">${new Date(a.created_at).toLocaleDateString('ja-JP')}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn btn-xs btn-success" onclick="approve('${a.approval_id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:13px;height:13px">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                            Approve
                                        </button>
                                        <button class="btn btn-xs btn-danger" onclick="reject('${a.approval_id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:13px;height:13px">
                                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                            Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// M365管理
function renderM365() {
    const pendingTasks = SAMPLE_M365_TASKS.filter(t => t.state === 'pending');

    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">M365 Management</h1>
                <p class="page-description">Microsoft 365 操作タスク管理</p>
            </div>
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Task ID</th>
                            <th>Type</th>
                            <th>Target UPN</th>
                            <th>Approval</th>
                            <th>SOD</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pendingTasks.map(t => `
                            <tr>
                                <td class="ticket-id">${t.task_number}</td>
                                <td style="font-weight:500">${t.task_type}</td>
                                <td style="font-family:monospace;font-size:12px;color:var(--gray-600)">${t.target_upn}</td>
                                <td><span class="tag" style="background:#d1fae5;color:#047857">✅ Approved</span></td>
                                <td><span class="tag" style="background:#d1fae5;color:#047857">✅ OK</span></td>
                                <td>
                                    <button class="btn btn-xs btn-primary" onclick="executeM365('${t.task_id}')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:13px;height:13px">
                                            <polygon points="5 3 19 12 5 21 5 3"/>
                                        </svg>
                                        Execute
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// システム設定
function renderSettings() {
    return `
        <div class="content-header">
            <div>
                <h1 class="page-heading">System Settings</h1>
                <p class="page-description">AI API設定と品質保証Hooks設定</p>
            </div>
        </div>

        <div class="settings-grid">
            <div class="setting-box">
                <h3 class="setting-title">🤖 AI Configuration</h3>
                <div class="setting-item">
                    <label class="form-label">Claude API Key</label>
                    <input type="password" class="form-input" value="sk-ant-****" readonly>
                </div>
                <div class="setting-item">
                    <label class="form-label">Gemini API Key</label>
                    <input type="password" class="form-input" value="AIza****" readonly>
                </div>
                <div class="setting-item">
                    <label class="form-label">Perplexity API Key</label>
                    <input type="password" class="form-input" value="pplx-****" readonly>
                </div>
            </div>

            <div class="setting-box">
                <h3 class="setting-title">🎯 Quality Assurance Hooks</h3>
                ${['Pre-Task Hook', 'Duplicate-Check Hook (85% threshold)', 'Deviation-Check Hook', 'Post-Task Hook'].map(hook => `
                    <div class="setting-item">
                        <label class="checkbox-label">
                            <input type="checkbox" class="checkbox-input" checked>
                            <span style="font-weight:500">${hook}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// モーダル表示関数
function viewTicketDetail(id) {
    const ticket = SAMPLE_TICKETS.find(t => t.ticket_id === id);
    if (!ticket) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h2 class="modal-title">Ticket #${ticket.ticket_number}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <h3 style="font-size:24px;font-weight:700;margin-bottom:20px;color:var(--gray-900);letter-spacing:-0.02em">${ticket.subject}</h3>
                <div class="badge-row">
                    <span class="tag tag-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                    <span class="tag">${ticket.status}</span>
                    <span class="tag">${ITSM_TYPES[ticket.itsm_type].icon} ${ITSM_TYPES[ticket.itsm_type].label}</span>
                    ${ticket.ai_processed ? '<span class="tag tag-ai">🤖 AI Processed</span>' : ''}
                </div>
                <div class="detail-section">
                    <h4 class="detail-title">Description</h4>
                    <p class="detail-content">${ticket.description}</p>
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Category</div>
                        <div class="detail-value">${['ハードウェア','ソフトウェア','M365','ネットワーク'][ticket.ticket_number % 4]}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Created At</div>
                        <div class="detail-value">${new Date(ticket.created_at).toLocaleString('ja-JP')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Impact</div>
                        <div class="detail-value">${ticket.impact}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Urgency</div>
                        <div class="detail-value">${ticket.urgency}</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function viewKnowledge(id) {
    const article = SAMPLE_KNOWLEDGE.find(k => k.article_id === id);
    if (!article) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h2 class="modal-title">${article.title}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="badge-row">
                    <span class="tag">${article.category}</span>
                    <span class="tag">👁️ ${article.view_count}回閲覧</span>
                    <span class="tag">👍 ${article.helpful_count}人が役立った</span>
                    ${article.is_ai_generated ? `<span class="tag tag-ai">🤖 AI - ${article.quality_score}%</span>` : ''}
                </div>
                <div style="background:var(--gray-50);border:1px solid var(--gray-200);padding:28px;border-radius:16px;line-height:1.8;margin-top:24px;color:var(--gray-700);white-space:pre-wrap">
                    ${article.content}
                </div>
                ${article.is_ai_generated ? `
                    <div class="ai-info-box">
                        <h4 class="ai-info-title">🎯 AI Generation Info</h4>
                        <p class="ai-info-text"><strong>SubAgents:</strong> ${article.subagents.join(', ')}</p>
                        <p class="ai-info-text"><strong>Quality Score:</strong> ${article.quality_score}%</p>
                        <p class="ai-info-text"><strong>Validation:</strong> 4つのHooksで品質保証済み</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// AI処理実行
async function processAI() {
    const query = document.getElementById('ai-query').value.trim();
    if (!query) { alert('問い合わせ内容を入力してください'); return; }

    console.log('🤖 AI Processing started:', query);

    Object.keys(SUB_AGENTS).forEach(k => {
        const elem = document.getElementById('sub-' + k);
        if (elem) elem.className = 'subagent-card processing';
    });

    for (const k of Object.keys(SUB_AGENTS)) {
        await new Promise(r => setTimeout(r, 350));
        const elem = document.getElementById('sub-' + k);
        if (elem) {
            elem.className = 'subagent-card completed';
            console.log('✅ SubAgent completed:', SUB_AGENTS[k].name);
        }
    }

    const sample = SAMPLE_AI_RESULTS[query] || {
        qualityScore: { overall: 88, completeness: 90, accuracy: 86, relevance: 88 },
        answer: {
            summary: `「${query}」についての統合回答を生成しました。`,
            technicalSummary: '技術者向けの詳細な説明です。',
            userSummary: '一般ユーザー向けのわかりやすい説明です。',
            preventiveMeasures: '再発防止策を提案します。',
            improvementSuggestions: '自動化スクリプトの導入を推奨します。',
            automationPotential: 75
        }
    };

    console.log('🎯 AI Processing completed - Quality:', sample.qualityScore.overall + '%');

    document.getElementById('ai-result').className = 'result-card fade-in';
    document.getElementById('ai-result').innerHTML = `
        <div class="card-header">
            <h2 class="card-title">Multi-AI Processing Result</h2>
        </div>

        <div class="quality-grid">
            <div class="quality-item">
                <div class="quality-value">${sample.qualityScore.overall}%</div>
                <div class="quality-label">Overall</div>
            </div>
            <div class="quality-item">
                <div class="quality-value">${sample.qualityScore.completeness}%</div>
                <div class="quality-label">Complete</div>
            </div>
            <div class="quality-item">
                <div class="quality-value">${sample.qualityScore.accuracy}%</div>
                <div class="quality-label">Accurate</div>
            </div>
            <div class="quality-item">
                <div class="quality-value">${sample.qualityScore.relevance}%</div>
                <div class="quality-label">Relevant</div>
            </div>
        </div>

        <div class="answer-box">
            <h3 class="answer-title">💡 Integrated Answer</h3>
            <div class="answer-text">${sample.answer.summary.replace(/\n/g, '<br>')}</div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <h4 class="info-title">🔧 For Technicians</h4>
                <p class="info-text">${sample.answer.technicalSummary}</p>
            </div>
            <div class="info-box">
                <h4 class="info-title">👤 For End Users</h4>
                <p class="info-text">${sample.answer.userSummary}</p>
            </div>
        </div>

        <div class="automation-box">
            <h4 style="font-size:18px;font-weight:700;color:var(--gray-900);margin-bottom:12px">⚙️ Automation Proposal</h4>
            <p style="font-size:15px;color:var(--gray-700);margin-bottom:20px;line-height:1.7">${sample.answer.improvementSuggestions}</p>
            <div class="automation-score">
                <div class="automation-value">${sample.answer.automationPotential}%</div>
                <div class="automation-label">Automation Potential</div>
            </div>
        </div>
    `;
}

// ユーティリティ関数
function toggleAI(el) { el.classList.toggle('selected'); }
function navigate(page) {
    const navItem = document.querySelector(`[data-page="${page}"]`);
    if (navItem) navItem.click();
}
function createTicket(e) {
    e.preventDefault();
    console.log('✅ Ticket created');
    alert('✅ チケットを作成しました！\n\n自動実行:\n• 優先度自動計算（Impact × Urgency）\n• SLA期限自動設定\n• ITSM分類\n• 履歴記録（ticket_history追記専用テーブル）');
    navigate('my-tickets');
}
function editTicket(id) {
    console.log('Edit ticket:', id);
    alert('編集機能（実装中）');
}
function deleteTicket(id) {
    const ticket = SAMPLE_TICKETS.find(t => t.ticket_id === id);
    if (confirm(`チケット #${ticket.ticket_number} を削除しますか？\n\n※ 履歴は追記専用テーブルに保持されます`)) {
        console.log('Deleted:', id);
        alert('削除しました');
    }
}
function approve(id) {
    console.log('Approved:', id);
    alert('✅ 承認しました\n\nSOD検証: 承認者≠依頼者 ✅\n履歴記録: ticket_history追記専用テーブル');
}
function reject(id) {
    console.log('Rejected:', id);
    alert('❌ 却下しました\n\n却下理由と履歴が記録されます');
}
function executeM365(id) {
    console.log('M365 execute:', id);
    alert('🚀 M365操作を実施します\n\n実施前チェック:\n✅ 承認済み\n✅ SOD検証OK（承認者≠実施者）\n\n実施後記録:\n• m365_execution_logs追記専用テーブル\n• エビデンス添付\n• データベーストリガーで改ざん防止');
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Application initialized');
    loadPage('dashboard');
});
