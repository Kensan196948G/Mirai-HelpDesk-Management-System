/**
 * メインアプリケーションロジック
 */

// 現在のページ
let currentPage = 'dashboard';

// ページナビゲーション
async function navigateTo(page) {
    currentPage = page;

    // ナビゲーションのアクティブ状態を更新
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // ページタイトルを更新
    const pageTitles = {
        'dashboard': 'ダッシュボード',
        'tickets': 'チケット管理',
        'ai-assistant': 'AIアシスタント',
        'knowledge': 'ナレッジベース',
        'ai-knowledge': 'AI自動生成ナレッジ',
        'approvals': '承認管理',
        'm365': 'M365操作',
    };
    document.getElementById('page-title').textContent = pageTitles[page] || page;

    // コンテンツを読み込み
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div></div>';

    try {
        const content = await pages[page]();
        contentDiv.innerHTML = content;
    } catch (error) {
        contentDiv.innerHTML = `<div class="card"><p style="color: var(--error);">ページの読み込みに失敗しました: ${error.message}</p></div>`;
    }
}

// AI選択トグル
function toggleAI(aiKey) {
    aiOrchestrator.selectAI(aiKey);

    const option = document.querySelector(`.ai-option[data-ai="${aiKey}"]`);
    if (option) {
        option.classList.toggle('selected');
    }
}

// AI処理実行
async function processAIQuery() {
    const query = document.getElementById('ai-query').value.trim();

    if (!query) {
        alert('問い合わせ内容を入力してください');
        return;
    }

    // SubAgentの状態をリセット
    Object.keys(SUB_AGENTS).forEach(key => {
        const elem = document.getElementById(`subagent-${key}`);
        if (elem) {
            elem.className = 'subagent-item processing';
        }
    });

    // AI処理を実行
    try {
        const result = await aiOrchestrator.processQuery(query);

        // SubAgentを完了状態に
        Object.keys(SUB_AGENTS).forEach(key => {
            const elem = document.getElementById(`subagent-${key}`);
            if (elem) {
                elem.className = 'subagent-item completed';
            }
        });

        // 結果を表示
        displayAIResult(result);
    } catch (error) {
        alert(`AI処理エラー: ${error.message}`);
    }
}

// AI処理結果を表示
function displayAIResult(result) {
    const container = document.getElementById('ai-result-container');
    container.className = 'result-container';

    container.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">🎯 AI処理結果</h3>
            <div style="display: flex; gap: 12px;">
                <span class="tag tag-${result.queryType === 'FAQ' ? 'p3' : 'p2'}">${result.queryType}</span>
                <span class="tag">${ITSM_TYPES[result.itsmType].icon} ${ITSM_TYPES[result.itsmType].label}</span>
                <span class="tag tag-auto">⏱️ ${(result.processingTime / 1000).toFixed(1)}秒</span>
            </div>
        </div>

        <div class="quality-score">
            <div class="score-item">
                <div class="score-value">${result.qualityScore.overall}%</div>
                <div class="score-label">総合品質</div>
            </div>
            <div class="score-item">
                <div class="score-value">${result.qualityScore.completeness}%</div>
                <div class="score-label">完全性</div>
            </div>
            <div class="score-item">
                <div class="score-value">${result.qualityScore.accuracy}%</div>
                <div class="score-label">正確性</div>
            </div>
            <div class="score-item">
                <div class="score-value">${result.qualityScore.relevance}%</div>
                <div class="score-label">関連性</div>
            </div>
        </div>

        <div class="result-tabs">
            <button class="result-tab active" onclick="switchResultTab('summary')">📝 統合回答</button>
            <button class="result-tab" onclick="switchResultTab('technical')">🔧 技術者向け</button>
            <button class="result-tab" onclick="switchResultTab('user')">👤 ユーザー向け</button>
            <button class="result-tab" onclick="switchResultTab('evidence')">📚 根拠・エビデンス</button>
            <button class="result-tab" onclick="switchResultTab('ai-details')">🤖 AI詳細</button>
        </div>

        <div id="tab-summary" class="result-content active">
            <div class="answer-section">
                <h4 style="margin-bottom: 12px;">💡 回答</h4>
                <p>${result.answer.summary}</p>
            </div>
            <div style="background: var(--gray-50); padding: 16px; border-radius: var(--radius); margin-bottom: 16px;">
                <h4 style="margin-bottom: 8px;">🛡️ 再発防止策</h4>
                <p>${result.answer.preventiveMeasures}</p>
            </div>
            <div style="background: var(--gray-50); padding: 16px; border-radius: var(--radius);">
                <h4 style="margin-bottom: 8px;">💡 改善提案</h4>
                <p>${result.answer.improvementSuggestions}</p>
                <div style="margin-top: 12px;">
                    <span class="tag tag-auto">🤖 自動化可能性: ${result.answer.automationPotential}%</span>
                </div>
            </div>
        </div>

        <div id="tab-technical" class="result-content">
            <div class="answer-section">
                <h4 style="margin-bottom: 12px;">🔧 技術者向け詳細</h4>
                <p>${result.answer.technicalSummary}</p>
            </div>
        </div>

        <div id="tab-user" class="result-content">
            <div class="answer-section">
                <h4 style="margin-bottom: 12px;">👤 一般ユーザー向け説明</h4>
                <p>${result.answer.userSummary}</p>
            </div>
        </div>

        <div id="tab-evidence" class="result-content">
            <h4 style="margin-bottom: 16px;">📚 参照元・エビデンス</h4>
            <ul class="evidence-list">
                ${result.answer.sources.map(source => `
                    <li class="evidence-item">
                        <span class="evidence-icon">🔗</span>
                        <div>
                            <div style="font-weight: 600;">${source.title}</div>
                            <div style="font-size: 12px; color: var(--gray-500);">
                                <a href="${source.url}" target="_blank" style="color: var(--primary);">${source.url}</a>
                            </div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div id="tab-ai-details" class="result-content">
            <h4 style="margin-bottom: 16px;">🤖 AI処理詳細</h4>
            ${Object.entries(result.aiResponses).map(([aiKey, response]) => `
                <div style="background: var(--gray-50); padding: 16px; border-radius: var(--radius); margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span style="font-size: 24px;">${AI_MODELS[aiKey].icon}</span>
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">${AI_MODELS[aiKey].name}</div>
                            <div style="font-size: 12px; color: var(--gray-500);">${AI_MODELS[aiKey].role}</div>
                        </div>
                        <span class="tag" style="margin-left: auto;">信頼度: ${response.confidence.toFixed(1)}%</span>
                    </div>
                    <p>${response.answer}</p>
                </div>
            `).join('')}

            <h4 style="margin-top: 24px; margin-bottom: 16px;">🎯 SubAgent処理結果</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                ${Object.entries(SUB_AGENTS).map(([key, agent]) => `
                    <div style="background: var(--gray-50); padding: 12px; border-radius: var(--radius); display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 24px;">${agent.icon}</span>
                        <div>
                            <div style="font-weight: 600;">${agent.name}</div>
                            <div style="font-size: 12px; color: var(--gray-500);">${agent.role}</div>
                        </div>
                        <span class="tag tag-auto" style="margin-left: auto;">✅ 完了</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// タブ切り替え
function switchResultTab(tabName) {
    document.querySelectorAll('.result-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.result-content').forEach(content => {
        content.classList.remove('active');
    });

    event.target.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// クエリクリア
function clearAIQuery() {
    document.getElementById('ai-query').value = '';
    document.getElementById('ai-result-container').className = 'hidden';

    // SubAgentをリセット
    Object.keys(SUB_AGENTS).forEach(key => {
        const elem = document.getElementById(`subagent-${key}`);
        if (elem) {
            elem.className = 'subagent-item';
        }
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    // ナビゲーションイベント設定
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // ユーザー情報を表示
    const user = authAPI.getCurrentUser();
    if (user) {
        document.querySelector('.user-name').textContent = user.display_name;
        document.querySelector('.user-role').textContent = user.role;
        document.querySelector('.user-avatar').textContent = user.display_name[0];
    }

    // 初期ページを読み込み
    await navigateTo('dashboard');

    // AIオーケストレーターのイベントリスナー登録
    aiOrchestrator.on('query-classified', (queryType) => {
        console.log('クエリ分類:', queryType);
    });

    aiOrchestrator.on('subagent-processing', (agent) => {
        console.log('SubAgent処理中:', agent);
    });

    aiOrchestrator.on('subagent-completed', (agent) => {
        console.log('SubAgent完了:', agent);
    });
});
