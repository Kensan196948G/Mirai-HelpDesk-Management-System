// ========================================
// メインアプリケーション
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSidebar();
    initSearch();
    initQuickActions();
    initTagInteractions();
    initAiChat();
    initAiSearch();
    initIncidentBoard();
    initKnowledgeActions();
    initCategoryActions();
    initTrendChart();
    initIncidentFilters();
});

function initIncidentFilters() {
    const filterButtons = document.querySelectorAll('.incident-filters .btn-filter');
    const incidentColumns = document.querySelectorAll('.incident-board .incident-column');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;

            // Update button active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show/hide columns
            incidentColumns.forEach(column => {
                if (filter === 'all' || column.dataset.status === filter) {
                    column.style.display = 'flex';
                } else {
                    column.style.display = 'none';
                }
            });
        });
    });
}

// ========================================
// ナビゲーション
// ========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-content');
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const targetPage = item.getAttribute('data-page');

            // アクティブ状態を更新
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // ページを切り替え
            pages.forEach(page => {
                if (page.id === `page-${targetPage}`) {
                    page.classList.remove('hidden');
                } else {
                    page.classList.add('hidden');
                }
            });

            // パンくずリストを更新
            const pageTitle = item.querySelector('.nav-label').textContent;
            if (breadcrumbCurrent) {
                breadcrumbCurrent.textContent = pageTitle;
            }

            // モバイルの場合はサイドバーを閉じる
            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('sidebar');
                sidebar.classList.remove('mobile-open');
            }

            // スムーズスクロールでトップへ
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });
}

// ========================================
// サイドバートグル
// ========================================
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileToggle = document.getElementById('mobileToggle');

    // デスクトップ版トグル
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // モバイル版トグル
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // サイドバー外をクリックしたら閉じる（モバイルのみ）
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });
}

// ========================================
// 検索機能
// ========================================
function initSearch() {
    const searchInput = document.querySelector('.search-input');

    if (searchInput) {
        // Ctrl+K または Cmd+K でフォーカス
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });

        // Enter キーで検索実行
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }
}

function performSearch(query) {
    if (!query.trim()) return;

    console.log('検索実行:', query);

    // ここに実際の検索ロジックを実装
    // 例: AIアシスタントページに移動して検索を実行

    // デモ用のアラート
    alert(`検索: "${query}"\n\n実際の検索機能は実装中です。`);
}

// ========================================
// クイックアクション
// ========================================
function initQuickActions() {
    // クイックアクションボタン
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');

    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const label = btn.querySelector('.qa-label').textContent;
            handleQuickAction(label);
        });
    });

    // アクションボタン（ヘッダー）
    const pageActionBtns = document.querySelectorAll('.page-actions .btn');

    pageActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.textContent.trim();
            handlePageAction(text);
        });
    });

    // インシデントアイテム
    const incidentItems = document.querySelectorAll('.incident-item');

    incidentItems.forEach(item => {
        item.addEventListener('click', () => {
            const title = item.querySelector('.incident-title').textContent;
            const id = item.querySelector('.incident-id').textContent;
            showIncidentDetails(title, id);
        });
    });

    // ナレッジカード
    const knowledgeCards = document.querySelectorAll('.knowledge-card');

    knowledgeCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('[data-knowledge-action]')) return;
            const title = card.querySelector('.knowledge-title').textContent;
            showKnowledgeDetails(title);
        });
    });
}

// ========================================
// タグやページネーション
// ========================================
function initTagInteractions() {
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
        });
    });

    const paginationButtons = document.querySelectorAll('.pagination-btn');
    paginationButtons.forEach(button => {
        button.addEventListener('click', () => {
            paginationButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

// ========================================
// AI対話・AI検索
// ========================================
const aiChatResponses = {
    '有給休暇': {
        claude: {
            response: '有給休暇の申請は、勤怠管理システムから行います。',
            confidence: 0.86,
            details: ['申請期限は3営業日前まで', '上長承認が必要']
        },
        gemini: {
            additions: '半日・時間単位の取得も可能です。',
            verified: true
        },
        perplexity: {
            updates: '2024年4月から計画年休制度が導入されています。',
            sources: ['人事部通達', '社内規定 第3章']
        },
        finalAnswer: `有給休暇の申請方法をご案内します。

**申請手順:**
1. 社内ポータルにログイン
2. 「勤怠管理システム」を選択
3. 「休暇申請」→「有給休暇」を選択
4. 希望日と理由を入力して申請

**注意事項:**
- 申請は希望日の3営業日前まで
- 上長承認後に確定
- 半日・時間単位の取得も可能`
    },
    '経費精算': {
        claude: {
            response: '経費精算は経費精算システム「ExpenseHub」から申請します。',
            confidence: 0.9,
            details: ['領収書の添付が必須', '上長→経理の承認フロー']
        },
        gemini: {
            additions: '交通費はICカード履歴のアップロードが利用できます。',
            verified: true
        },
        perplexity: {
            updates: '電子帳簿保存法対応でスマホ撮影が推奨されています。',
            sources: ['経理部ガイド', '電子帳簿保存法対応マニュアル']
        },
        finalAnswer: `経費精算の手順をご案内します。

**申請手順:**
1. ExpenseHubへログイン
2. 「新規精算申請」をクリック
3. 種別・金額・日付を入力
4. 領収書を添付して申請

**ポイント:**
- ICカード履歴の自動取込が可能
- 上長承認→経理承認の2段階`
    },
    'VPN': {
        claude: {
            response: 'VPN接続はFortiClient VPNを使用します。',
            confidence: 0.88,
            details: ['二要素認証が必要', '同時接続は1デバイス']
        },
        gemini: {
            additions: 'iOS/Androidでも専用アプリで接続可能です。',
            verified: true
        },
        perplexity: {
            updates: 'ゼロトラスト移行により一部はVPN不要でアクセス可能です。',
            sources: ['情報システム部 NEWS', 'セキュリティポリシー v3.2']
        },
        finalAnswer: `VPN接続の対処ガイドです。

**確認ポイント:**
1. ネットワーク接続の確認
2. FortiClientの接続先設定
3. ID/パスワードの再確認
4. 二要素認証の状態確認

**補足:**
- モバイル端末も接続可能
- 一部システムはVPN不要化が進行中`
    },
    'default': {
        claude: {
            response: '内容を確認し、関連情報を検索しています。',
            confidence: 0.76,
            details: ['関連ナレッジを検索中']
        },
        gemini: {
            additions: '必要に応じて追加情報を補足します。',
            verified: true
        },
        perplexity: {
            updates: '最新の社内通達を確認しました。',
            sources: ['社内ポータル', 'FAQ']
        },
        finalAnswer: `ご質問ありがとうございます。

担当部門や対象システムを教えていただけると、より具体的な手順をご案内できます。`
    }
};

const aiSearchResults = {
    'VPN': [
        {
            title: 'VPN接続トラブルシューティングガイド',
            relevance: 95,
            category: 'ネットワーク',
            views: 245,
            rating: 4.8,
            date: '2日前',
            excerpt: 'VPN接続時の一般的なエラーと解決方法をまとめたガイドです。'
        },
        {
            title: 'リモートアクセス設定手順書',
            relevance: 87,
            category: 'セキュリティ',
            views: 198,
            rating: 4.6,
            date: '1週間前',
            excerpt: 'Windows/Mac/モバイルの設定方法を画面キャプチャ付きで説明します。'
        }
    ],
    'データベース': [
        {
            title: 'SQL Server パフォーマンスチューニング',
            relevance: 92,
            category: 'データベース',
            views: 189,
            rating: 4.6,
            date: '5日前',
            excerpt: 'インデックス最適化、クエリ改善、統計情報更新のベストプラクティス。'
        },
        {
            title: 'DB遅延の原因切り分けチェックリスト',
            relevance: 84,
            category: '運用',
            views: 142,
            rating: 4.4,
            date: '2週間前',
            excerpt: 'CPU/IO/ロック待ちなどの観点で原因を整理したチェックリスト。'
        }
    ],
    'default': [
        {
            title: 'ナレッジ検索の使い方',
            relevance: 78,
            category: 'ガイド',
            views: 120,
            rating: 4.2,
            date: '3週間前',
            excerpt: '検索演算子やタグの使い分けなど、効率的な検索方法を解説します。'
        }
    ]
};

function initAiChat() {
    const chatMessages = document.getElementById('aiChatMessages');
    const chatInput = document.getElementById('aiChatInput');
    const chatSendBtn = document.getElementById('aiChatSendBtn');
    const chatHistoryList = document.getElementById('chatHistoryList');
    const newChatBtn = document.getElementById('newChatBtn');
    const reloadChatBtn = document.getElementById('reloadChatBtn');
    const exportChatBtn = document.getElementById('exportChatBtn');
    const importChatBtn = document.getElementById('importChatBtn');
    const importInput = document.getElementById('chatImportInput');
    const toolbarTitle = document.querySelector('.chat-toolbar-title');
    const processing = document.getElementById('aiChatProcessing');
    const processingMessage = document.getElementById('chatProcessingMessage');
    const detailPanel = document.getElementById('chatDetailPanel');
    const detailContent = document.getElementById('chatDetailContent');
    const closeDetail = document.getElementById('closeChatDetail');
    const stages = {
        1: document.getElementById('chatStage1'),
        2: document.getElementById('chatStage2'),
        3: document.getElementById('chatStage3')
    };

    if (!chatMessages || !chatInput || !chatSendBtn) return;

    const storageKey = 'mirai-helpdesk-chat-sessions';
    const activeKey = 'mirai-helpdesk-chat-active';
    let isProcessing = false;
    let sessions = [];
    let activeSessionId = null;

    function loadSessions() {
        try {
            const stored = localStorage.getItem(storageKey);
            const parsed = stored ? JSON.parse(stored) : [];
            sessions = Array.isArray(parsed) ? parsed : [];
            activeSessionId = localStorage.getItem(activeKey);
        } catch (err) {
            sessions = [];
            activeSessionId = null;
        }
    }

    function saveSessions() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(sessions));
            if (activeSessionId) {
                localStorage.setItem(activeKey, activeSessionId);
            }
        } catch (err) {
            console.warn('ローカル保存に失敗しました', err);
        }
    }

    function createSession(title = '新しい質問') {
        const session = {
            id: `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title,
            messages: [],
            updatedAt: new Date()
        };
        sessions.unshift(session);
        activeSessionId = session.id;
        renderHistory();
        renderSession(session);
        saveSessions();
    }

    function getActiveSession() {
        return sessions.find(session => session.id === activeSessionId);
    }

    function formatSessionTime(date) {
        const parsed = date instanceof Date ? date : new Date(date);
        return parsed.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }

    function renderHistory() {
        if (!chatHistoryList) return;
        chatHistoryList.innerHTML = sessions.map(session => `
            <div class="chat-history-item ${session.id === activeSessionId ? 'active' : ''}" data-session-id="${session.id}">
                <div class="chat-history-title">${escapeHtml(session.title)}</div>
                <div class="chat-history-time">${formatSessionTime(session.updatedAt)}</div>
            </div>
        `).join('');
    }

    function renderSystemMessage() {
        chatMessages.insertAdjacentHTML('beforeend', `
            <div class="chat-system-message">
                <div class="system-title">👋 こんにちは！</div>
                <p class="system-text">社内の手順やトラブル対応について何でも質問してください。</p>
                <div class="quick-questions">
                    <span class="quick-label">よくある質問:</span>
                    <div class="quick-buttons">
                        <button class="quick-btn" data-question="VPN接続ができない時の対処方法を教えてください">VPN接続</button>
                        <button class="quick-btn" data-question="メール送信が遅い時の確認手順を教えてください">メール遅延</button>
                        <button class="quick-btn" data-question="経費精算の手順を教えてください">経費精算</button>
                        <button class="quick-btn" data-question="有給休暇の申請方法を教えてください">有給休暇</button>
                    </div>
                </div>
            </div>
        `);
        attachQuickButtons();
    }

    function renderSession(session) {
        chatMessages.innerHTML = '';
        renderSystemMessage();
        session.messages.forEach(message => {
            addChatMessage(message.role, message.content, message.responseData, false);
        });
        setToolbarTitle(session.title);
    }

    function setToolbarTitle(title) {
        if (toolbarTitle) {
            toolbarTitle.textContent = title || '新しい質問';
        }
    }

    function attachQuickButtons() {
        const quickButtons = chatMessages.querySelectorAll('.quick-btn');
        quickButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.getAttribute('data-question');
                if (question) {
                    chatInput.value = question;
                    autoResizeTextarea(chatInput);
                    chatInput.focus();
                }
            });
        });
    }

    chatSendBtn.addEventListener('click', () => {
        submitChatQuestion();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitChatQuestion();
        }
    });

    chatInput.addEventListener('input', () => {
        autoResizeTextarea(chatInput);
    });

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            createSession();
        });
    }

    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', () => {
            const payload = {
                version: 1,
                exportedAt: new Date().toISOString(),
                activeSessionId,
                sessions
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mirai-chat-history-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        });
    }

    if (importChatBtn && importInput) {
        importChatBtn.addEventListener('click', () => {
            importInput.click();
        });

        importInput.addEventListener('change', (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    if (!parsed || !Array.isArray(parsed.sessions)) {
                        alert('読み込み形式が正しくありません。');
                        return;
                    }
                    sessions = parsed.sessions;
                    activeSessionId = parsed.activeSessionId || (sessions[0] ? sessions[0].id : null);
                    if (!activeSessionId && sessions.length) {
                        activeSessionId = sessions[0].id;
                    }
                    saveSessions();
                    renderHistory();
                    const active = getActiveSession();
                    if (active) {
                        renderSession(active);
                    } else {
                        createSession();
                    }
                } catch (err) {
                    alert('インポートに失敗しました。');
                } finally {
                    importInput.value = '';
                }
            };
            reader.readAsText(file);
        });
    }

    if (reloadChatBtn) {
        reloadChatBtn.addEventListener('click', () => {
            if (isProcessing) return;
            const session = getActiveSession();
            if (!session) return;
            session.messages = [];
            session.title = '新しい質問';
            session.updatedAt = new Date();
            renderHistory();
            renderSession(session);
            if (detailPanel) detailPanel.classList.remove('open');
            if (processing) processing.style.display = 'none';
            saveSessions();
        });
    }

    if (chatHistoryList) {
        chatHistoryList.addEventListener('click', (e) => {
            const item = e.target.closest('.chat-history-item');
            if (!item) return;
            const sessionId = item.dataset.sessionId;
            const session = sessions.find(s => s.id === sessionId);
            if (!session) return;
            activeSessionId = sessionId;
            renderHistory();
            renderSession(session);
            saveSessions();
        });
    }

    chatMessages.addEventListener('click', (e) => {
        const detailBtn = e.target.closest('[data-chat-action="detail"]');
        const copyBtn = e.target.closest('[data-chat-action="copy"]');
        if (detailBtn) {
            const message = detailBtn.closest('.chat-message');
            showChatDetail(message);
        }
        if (copyBtn) {
            const message = copyBtn.closest('.chat-message');
            const text = message.querySelector('.message-text').textContent;
            navigator.clipboard.writeText(text);
            copyBtn.textContent = 'コピー完了';
            setTimeout(() => {
                copyBtn.textContent = 'コピー';
            }, 1500);
        }
    });

    if (closeDetail) {
        closeDetail.addEventListener('click', () => {
            detailPanel.classList.remove('open');
        });
    }

    function resetStages() {
        Object.values(stages).forEach(stage => {
            stage.classList.remove('active', 'completed');
            const indicator = stage.querySelector('.pipeline-indicator');
            indicator.className = 'pipeline-indicator waiting';
        });
    }

    function updateStage(step, status) {
        const stage = stages[step];
        if (!stage) return;
        stage.classList.remove('active', 'completed');
        const indicator = stage.querySelector('.pipeline-indicator');
        indicator.className = `pipeline-indicator ${status}`;
        if (status === 'processing') stage.classList.add('active');
        if (status === 'completed') stage.classList.add('completed');
    }

    function showProcessing(text) {
        processing.style.display = 'block';
        resetStages();
        processingMessage.textContent = text;
        scrollChatToBottom(chatMessages);
    }

    function hideProcessing() {
        processing.style.display = 'none';
    }

    function getResponse(question) {
        const keys = Object.keys(aiChatResponses).filter(key => key !== 'default');
        for (const key of keys) {
            if (question.includes(key)) {
                return aiChatResponses[key];
            }
        }
        return aiChatResponses.default;
    }

    function addChatMessage(type, content, responseData, shouldPersist = true) {
        const message = document.createElement('div');
        message.className = `chat-message ${type}`;

        if (type === 'user') {
            message.innerHTML = `
                <div class="message-content">
                    <div class="message-header">あなた</div>
                    <div class="message-text">${escapeHtml(content)}</div>
                </div>
                <div class="message-avatar">👤</div>
            `;
        } else {
            message.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-header">AI アシスタント</div>
                    <div class="message-text">${formatMarkdown(content)}</div>
                    <div class="chat-message-actions">
                        <button class="btn-text" data-chat-action="detail">詳細を見る</button>
                        <button class="btn-text" data-chat-action="copy">コピー</button>
                    </div>
                </div>
            `;
            message.dataset.response = JSON.stringify(responseData || {});
        }

        chatMessages.appendChild(message);
        scrollChatToBottom(chatMessages);

        if (shouldPersist) {
            const session = getActiveSession();
            if (session) {
                session.messages.push({
                    role: type,
                    content,
                    responseData: responseData || null
                });
                session.updatedAt = new Date();
                if (type === 'user' && session.title === '新しい質問') {
                    session.title = content.length > 14 ? `${content.slice(0, 14)}...` : content;
                    setToolbarTitle(session.title);
                }
                renderHistory();
                saveSessions();
            }
        }
        return message;
    }

    async function submitChatQuestion() {
        const question = chatInput.value.trim();
        if (!question || isProcessing) return;

        isProcessing = true;
        chatSendBtn.disabled = true;
        chatInput.value = '';
        autoResizeTextarea(chatInput);

        addChatMessage('user', question);
        const response = getResponse(question);

        showProcessing('準備中...');

        updateStage(1, 'processing');
        processingMessage.textContent = '🧠 Claude が初期回答を生成中...';
        await sleep(1200);
        updateStage(1, 'completed');

        updateStage(2, 'processing');
        processingMessage.textContent = '🔮 Gemini が内容を検証中...';
        await sleep(1400);
        updateStage(2, 'completed');

        updateStage(3, 'processing');
        processingMessage.textContent = '🌐 Perplexity が最新情報を補完中...';
        await sleep(1100);
        updateStage(3, 'completed');

        await sleep(400);
        hideProcessing();

        addChatMessage('assistant', response.finalAnswer, response);

        isProcessing = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }

    function showChatDetail(message) {
        const responseData = JSON.parse(message.dataset.response || '{}');
        if (!detailContent) return;

        detailContent.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Claude 確信度</span>
                    <span class="detail-value">${Math.round((responseData.claude?.confidence || 0.8) * 100)}%</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">検証結果</span>
                    <span class="detail-value">Gemini OK</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">更新情報</span>
                    <span class="detail-value">Perplexity 参照</span>
                </div>
            </div>
            <p><strong>Claude:</strong> ${responseData.claude?.response || ''}</p>
            <p><strong>Gemini:</strong> ${responseData.gemini?.additions || ''}</p>
            <p><strong>Perplexity:</strong> ${responseData.perplexity?.updates || ''}</p>
        `;
        if (detailPanel) {
            detailPanel.classList.add('open');
        }
    }

    loadSessions();
    if (!sessions.length) {
        createSession();
    } else {
        if (!activeSessionId || !sessions.find(s => s.id === activeSessionId)) {
            activeSessionId = sessions[0].id;
        }
        renderHistory();
        const active = getActiveSession();
        if (active) {
            renderSession(active);
        }
    }
}

function initAiSearch() {
    const searchInput = document.getElementById('aiSearchInput');
    const searchBtn = document.getElementById('aiSearchBtn');
    const processing = document.getElementById('aiSearchProcessing');
    const processingMessage = document.getElementById('searchProcessingMessage');
    const resultList = document.getElementById('aiSearchList');
    const resultCount = document.getElementById('aiSearchCount');
    const stages = {
        1: document.getElementById('searchStage1'),
        2: document.getElementById('searchStage2'),
        3: document.getElementById('searchStage3')
    };

    if (!searchInput || !searchBtn || !resultList || !resultCount) return;

    const suggestionTags = document.querySelectorAll('.suggestion-tag');
    suggestionTags.forEach(tag => {
        tag.addEventListener('click', () => {
            searchInput.value = tag.textContent.trim();
            triggerSearch();
        });
    });

    searchBtn.addEventListener('click', () => {
        triggerSearch();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            triggerSearch();
        }
    });

    function resetStages() {
        Object.values(stages).forEach(stage => {
            stage.classList.remove('active', 'completed');
            const indicator = stage.querySelector('.pipeline-indicator');
            indicator.className = 'pipeline-indicator waiting';
        });
    }

    function updateStage(step, status) {
        const stage = stages[step];
        if (!stage) return;
        stage.classList.remove('active', 'completed');
        const indicator = stage.querySelector('.pipeline-indicator');
        indicator.className = `pipeline-indicator ${status}`;
        if (status === 'processing') stage.classList.add('active');
        if (status === 'completed') stage.classList.add('completed');
    }

    function getResults(query) {
        if (query.includes('VPN')) return aiSearchResults.VPN;
        if (query.includes('データベース') || query.includes('DB')) return aiSearchResults['データベース'];
        return aiSearchResults.default;
    }

    async function triggerSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        processing.style.display = 'block';
        resetStages();
        resultCount.textContent = '検索中...';

        updateStage(1, 'processing');
        processingMessage.textContent = '🧠 Claude が候補を抽出中...';
        await sleep(900);
        updateStage(1, 'completed');

        updateStage(2, 'processing');
        processingMessage.textContent = '🔮 Gemini が関連性を評価中...';
        await sleep(1100);
        updateStage(2, 'completed');

        updateStage(3, 'processing');
        processingMessage.textContent = '🌐 Perplexity が最新情報を補完中...';
        await sleep(900);
        updateStage(3, 'completed');

        const results = getResults(query);
        processing.style.display = 'none';
        renderSearchResults(results);
    }

    function renderSearchResults(results) {
        if (!results.length) {
            resultCount.textContent = '該当するナレッジがありません';
            resultList.innerHTML = '<div class="empty-state">検索条件に一致する結果がありませんでした。</div>';
            return;
        }

        resultCount.textContent = `${results.length}件の関連ナレッジが見つかりました`;
        resultList.innerHTML = results.map(item => `
            <div class="search-result-item">
                <div class="result-relevance">関連度: ${item.relevance}%</div>
                <h4 class="result-title">${item.title}</h4>
                <p class="result-excerpt">${item.excerpt}</p>
                <div class="result-meta">
                    <span class="meta-badge">${item.category}</span>
                    <span class="meta-item">👁️ ${item.views} views</span>
                    <span class="meta-item">⭐ ${item.rating}</span>
                    <span class="meta-item">📅 ${item.date}</span>
                </div>
            </div>
        `).join('');
    }
}

function initIncidentBoard() {
    const board = document.querySelector('.incident-board');
    const detailModal = document.getElementById('incidentDetailModal');
    const editModal = document.getElementById('incidentEditModal');
    const deleteModal = document.getElementById('incidentDeleteModal');
    const detailBody = document.getElementById('incidentDetailBody');
    const deleteBody = document.getElementById('incidentDeleteBody');
    const saveBtn = document.getElementById('saveIncidentBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteIncident');

    if (!board) return;

    let activeCard = null;

    board.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        const card = actionBtn.closest('.incident-card');
        if (!card) return;

        const action = actionBtn.dataset.action;
        if (action === 'detail') {
            openDetail(card);
        } else if (action === 'edit') {
            openEdit(card);
        } else if (action === 'delete') {
            openDelete(card);
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-modal-close')) {
            closeModals();
        }
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (!activeCard) return;
            const title = document.getElementById('editIncidentTitle').value.trim();
            const owner = document.getElementById('editIncidentOwner').value.trim();
            const priority = document.getElementById('editIncidentPriority').value;
            const status = document.getElementById('editIncidentStatus').value;
            const impact = document.getElementById('editIncidentImpact').value.trim();
            const desc = document.getElementById('editIncidentDesc').value.trim();

            activeCard.dataset.title = title;
            activeCard.dataset.owner = owner;
            activeCard.dataset.priority = priority;
            activeCard.dataset.status = status;
            activeCard.dataset.impact = impact;
            activeCard.dataset.desc = desc;

            activeCard.querySelector('.incident-card-title').textContent = title;
            activeCard.querySelector('.incident-card-desc').textContent = desc;
            const meta = activeCard.querySelector('.incident-card-meta');
            meta.textContent = `${activeCard.dataset.id} • ${owner} • ${timeLabel(activeCard.dataset.elapsed)}`;

            const badge = activeCard.querySelector('.priority-badge');
            badge.classList.remove('high', 'medium', 'low');
            badge.classList.add(priority);

            moveCardIfNeeded(activeCard, status);
            updateColumnCounts();
            closeModals();
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (activeCard) {
                activeCard.remove();
                updateColumnCounts();
            }
            closeModals();
        });
    }

    function openDetail(card) {
        const data = card.dataset;
        detailBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">ID</span>
                    <span class="detail-value">${data.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">担当者</span>
                    <span class="detail-value">${data.owner}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">優先度</span>
                    <span class="detail-value">${priorityLabel(data.priority)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">ステータス</span>
                    <span class="detail-value">${statusLabel(data.status)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">登録日時</span>
                    <span class="detail-value">${data.time}</span>
                </div>
            </div>
            <p><strong>影響範囲:</strong> ${data.impact || '未設定'}</p>
            <p><strong>概要:</strong> ${data.desc || ''}</p>
        `;
        detailModal.classList.add('open');
    }

    function openEdit(card) {
        activeCard = card;
        document.getElementById('editIncidentTitle').value = card.dataset.title || '';
        document.getElementById('editIncidentOwner').value = card.dataset.owner || '';
        document.getElementById('editIncidentPriority').value = card.dataset.priority || 'medium';
        document.getElementById('editIncidentStatus').value = card.dataset.status || 'in-progress';
        document.getElementById('editIncidentImpact').value = card.dataset.impact || '';
        document.getElementById('editIncidentDesc').value = card.dataset.desc || '';
        editModal.classList.add('open');
    }

    function openDelete(card) {
        activeCard = card;
        deleteBody.innerHTML = `
            <p><strong>${card.dataset.id}</strong> を削除しますか？</p>
            <p>タイトル: ${card.dataset.title}</p>
        `;
        deleteModal.classList.add('open');
    }

    function closeModals() {
        [detailModal, editModal, deleteModal].forEach(modal => {
            if (modal) modal.classList.remove('open');
        });
        activeCard = null;
    }

    function moveCardIfNeeded(card, status) {
        const currentColumn = card.closest('.incident-column');
        if (!currentColumn || currentColumn.dataset.status === status) return;
        const newColumn = board.querySelector(`.incident-column[data-status="${status}"]`);
        if (newColumn) {
            newColumn.appendChild(card);
        }
    }

    function updateColumnCounts() {
        const columns = board.querySelectorAll('.incident-column');
        columns.forEach(column => {
            const count = column.querySelectorAll('.incident-card').length;
            const countEl = column.querySelector('.column-count');
            if (countEl) countEl.textContent = count;
        });
    }

    function priorityLabel(value) {
        return value === 'high' ? '高' : value === 'low' ? '低' : '中';
    }

    function statusLabel(value) {
        return value === 'in-progress' ? '対応中' : value === 'investigating' ? '調査中' : '待機中';
    }

    function timeLabel(elapsed) {
        return elapsed ? elapsed : '更新済み';
    }

    updateColumnCounts();
}

function initKnowledgeActions() {
    const grid = document.querySelector('#page-knowledge-browse .knowledge-grid');
    const searchInput = document.getElementById('knowledgeSearchInput');
    const sortSelect = document.getElementById('knowledgeSortSelect');
    const categoryFilter = document.getElementById('knowledgeCategoryFilter');
    const detailModal = document.getElementById('knowledgeDetailModal');
    const editModal = document.getElementById('knowledgeEditModal');
    const deleteModal = document.getElementById('knowledgeDeleteModal');
    const detailBody = document.getElementById('knowledgeDetailBody');
    const deleteBody = document.getElementById('knowledgeDeleteBody');
    const saveBtn = document.getElementById('saveKnowledgeBtn');
    const confirmDeleteBtn = document.getElementById('confirmKnowledgeDelete');

    if (!grid || !detailModal || !editModal || !deleteModal) return;

    let activeCard = null;

    function applyFilters() {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const selectedCategory = categoryFilter ? categoryFilter.value : '全カテゴリ';
        const sortValue = sortSelect ? sortSelect.value : 'views';
        const cards = Array.from(grid.querySelectorAll('.knowledge-card'));

        const matches = (card) => {
            const title = (card.dataset.title || '').toLowerCase();
            const category = (card.dataset.category || '').toLowerCase();
            const tags = (card.dataset.tags || '').toLowerCase();
            const matchQuery = !query || title.includes(query) || category.includes(query) || tags.includes(query);
            const matchCategory = selectedCategory === '全カテゴリ' || (card.dataset.category === selectedCategory);
            return matchQuery && matchCategory;
        };

        const visibleCards = cards.filter(matches);
        const hiddenCards = cards.filter(card => !matches(card));

        visibleCards.sort((a, b) => {
            if (sortValue === 'rating') {
                return parseFloat(b.dataset.rating || '0') - parseFloat(a.dataset.rating || '0');
            }
            if (sortValue === 'updated') {
                return parseRelativeDays(a.dataset.date) - parseRelativeDays(b.dataset.date);
            }
            if (sortValue === 'title') {
                return (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ja');
            }
            return parseInt(b.dataset.views || '0', 10) - parseInt(a.dataset.views || '0', 10);
        });

        [...visibleCards, ...hiddenCards].forEach(card => {
            card.style.display = visibleCards.includes(card) ? 'block' : 'none';
            grid.appendChild(card);
        });
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);

    grid.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-knowledge-action]');
        if (!actionBtn) return;
        const card = actionBtn.closest('.knowledge-card');
        if (!card) return;

        const action = actionBtn.dataset.knowledgeAction;
        if (action === 'detail') {
            openDetail(card);
        } else if (action === 'edit') {
            openEdit(card);
        } else if (action === 'delete') {
            openDelete(card);
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-modal-close') || e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (!activeCard) return;
            const title = document.getElementById('editKnowledgeTitle').value.trim();
            const category = document.getElementById('editKnowledgeCategory').value.trim();
            const tags = document.getElementById('editKnowledgeTags').value.trim();
            const excerpt = document.getElementById('editKnowledgeExcerpt').value.trim();
            const content = document.getElementById('editKnowledgeContent').value.trim();

            activeCard.dataset.title = title;
            activeCard.dataset.category = category;
            activeCard.dataset.tags = tags;
            activeCard.dataset.excerpt = excerpt;
            activeCard.dataset.content = content;

            activeCard.querySelector('.knowledge-category').textContent = category;
            activeCard.querySelector('.knowledge-title').textContent = title;
            activeCard.querySelector('.knowledge-excerpt').textContent = `${excerpt}...`;

            closeModals();
            applyFilters();
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (activeCard) {
                activeCard.remove();
            }
            closeModals();
            applyFilters();
        });
    }

    function openDetail(card) {
        const data = card.dataset;
        detailBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">カテゴリ</span>
                    <span class="detail-value">${data.category}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">閲覧数</span>
                    <span class="detail-value">${data.views} views</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">評価</span>
                    <span class="detail-value">⭐ ${data.rating}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">更新日</span>
                    <span class="detail-value">${data.date}</span>
                </div>
            </div>
            <p><strong>タイトル:</strong> ${data.title}</p>
            <p><strong>タグ:</strong> ${data.tags}</p>
            <p><strong>概要:</strong> ${data.excerpt}</p>
            <p><strong>詳細:</strong> ${data.content}</p>
        `;
        detailModal.classList.add('open');
    }

    function openEdit(card) {
        activeCard = card;
        document.getElementById('editKnowledgeTitle').value = card.dataset.title || '';
        document.getElementById('editKnowledgeCategory').value = card.dataset.category || '';
        document.getElementById('editKnowledgeTags').value = card.dataset.tags || '';
        document.getElementById('editKnowledgeExcerpt').value = card.dataset.excerpt || '';
        document.getElementById('editKnowledgeContent').value = card.dataset.content || '';
        editModal.classList.add('open');
    }

    function openDelete(card) {
        activeCard = card;
        deleteBody.innerHTML = `
            <p><strong>${card.dataset.title}</strong> を削除しますか？</p>
            <p>カテゴリ: ${card.dataset.category}</p>
        `;
        deleteModal.classList.add('open');
    }

    function closeModals() {
        [detailModal, editModal, deleteModal].forEach(modal => {
            modal.classList.remove('open');
        });
        activeCard = null;
    }

    applyFilters();
}

function initCategoryActions() {
    const grid = document.querySelector('#page-knowledge-category .category-grid');
    const searchInput = document.getElementById('categorySearchInput');
    const sortSelect = document.getElementById('categorySortSelect');
    const countText = document.getElementById('categoryCountText');
    const detailModal = document.getElementById('categoryDetailModal');
    const editModal = document.getElementById('categoryEditModal');
    const deleteModal = document.getElementById('categoryDeleteModal');
    const detailBody = document.getElementById('categoryDetailBody');
    const deleteBody = document.getElementById('categoryDeleteBody');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const confirmDeleteBtn = document.getElementById('confirmCategoryDelete');

    if (!grid || !detailModal || !editModal || !deleteModal) return;

    let activeCard = null;

    function applyFilters() {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const sortValue = sortSelect ? sortSelect.value : 'count';
        const cards = Array.from(grid.querySelectorAll('.category-card'));

        const matches = (card) => {
            const name = (card.dataset.name || '').toLowerCase();
            const desc = (card.dataset.desc || '').toLowerCase();
            const owner = (card.dataset.owner || '').toLowerCase();
            return !query || name.includes(query) || desc.includes(query) || owner.includes(query);
        };

        const visibleCards = cards.filter(matches);
        const hiddenCards = cards.filter(card => !matches(card));

        visibleCards.sort((a, b) => {
            if (sortValue === 'name') {
                return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'ja');
            }
            if (sortValue === 'update') {
                return parseRelativeDays(a.dataset.update) - parseRelativeDays(b.dataset.update);
            }
            return parseInt(b.dataset.count || '0', 10) - parseInt(a.dataset.count || '0', 10);
        });

        [...visibleCards, ...hiddenCards].forEach(card => {
            card.style.display = visibleCards.includes(card) ? 'block' : 'none';
            grid.appendChild(card);
        });

        if (countText) {
            countText.textContent = `${visibleCards.length}件表示`;
        }
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);

    grid.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-category-action]');
        if (!actionBtn) return;
        const card = actionBtn.closest('.category-card');
        if (!card) return;
        const action = actionBtn.dataset.categoryAction;
        if (action === 'detail') {
            openDetail(card);
        } else if (action === 'edit') {
            openEdit(card);
        } else if (action === 'delete') {
            openDelete(card);
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-modal-close') || e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (!activeCard) return;
            const name = document.getElementById('editCategoryName').value.trim();
            const owner = document.getElementById('editCategoryOwner').value.trim();
            const status = document.getElementById('editCategoryStatus').value.trim();
            const rating = document.getElementById('editCategoryRating').value.trim();
            const desc = document.getElementById('editCategoryDesc').value.trim();

            activeCard.dataset.name = name;
            activeCard.dataset.owner = owner;
            activeCard.dataset.status = status;
            activeCard.dataset.rating = rating;
            activeCard.dataset.desc = desc;

            activeCard.querySelector('.category-name').textContent = name;
            activeCard.querySelector('.category-desc').textContent = desc;
            const metaItems = activeCard.querySelectorAll('.category-meta span');
            if (metaItems.length >= 2) {
                metaItems[0].textContent = `最終更新: 今日`;
                metaItems[1].textContent = `平均評価: ${rating}`;
            }
            closeModals();
            applyFilters();
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (activeCard) {
                activeCard.remove();
            }
            closeModals();
            applyFilters();
        });
    }

    function openDetail(card) {
        const data = card.dataset;
        detailBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">カテゴリ名</span>
                    <span class="detail-value">${data.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">件数</span>
                    <span class="detail-value">${data.count}件</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">担当チーム</span>
                    <span class="detail-value">${data.owner}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">公開設定</span>
                    <span class="detail-value">${data.status}</span>
                </div>
            </div>
            <p><strong>説明:</strong> ${data.desc}</p>
            <p><strong>最終更新:</strong> ${data.update}</p>
            <p><strong>平均評価:</strong> ${data.rating}</p>
        `;
        detailModal.classList.add('open');
    }

    function openEdit(card) {
        activeCard = card;
        document.getElementById('editCategoryName').value = card.dataset.name || '';
        document.getElementById('editCategoryOwner').value = card.dataset.owner || '';
        document.getElementById('editCategoryStatus').value = card.dataset.status || '公開';
        document.getElementById('editCategoryRating').value = card.dataset.rating || '';
        document.getElementById('editCategoryDesc').value = card.dataset.desc || '';
        editModal.classList.add('open');
    }

    function openDelete(card) {
        activeCard = card;
        deleteBody.innerHTML = `
            <p><strong>${card.dataset.name}</strong> を削除しますか？</p>
            <p>ナレッジ件数: ${card.dataset.count}件</p>
        `;
        deleteModal.classList.add('open');
    }

    function closeModals() {
        [detailModal, editModal, deleteModal].forEach(modal => {
            modal.classList.remove('open');
        });
        activeCard = null;
    }

    applyFilters();
}

function parseRelativeDays(label) {
    if (!label) return 9999;
    if (label.includes('今日')) return 0;
    if (label.includes('昨日')) return 1;
    const dayMatch = label.match(/(\d+)\s*日前/);
    if (dayMatch) return parseInt(dayMatch[1], 10);
    const weekMatch = label.match(/(\d+)\s*週間前/);
    if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
    const monthMatch = label.match(/(\d+)\s*ヶ月前/);
    if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
    const hourMatch = label.match(/(\d+)\s*時間前/);
    if (hourMatch) return 0;
    const minuteMatch = label.match(/(\d+)\s*分前/);
    if (minuteMatch) return 0;
    return 9999;
}

function initTrendChart() {
    const line = document.getElementById('incidentTrendLine');
    const deltaLabel = document.getElementById('trendDeltaLabel');
    if (!line) return;

    let lastValue = 70;
    const basePoints = 8;

    function generateValues() {
        const values = [];
        let current = lastValue;
        for (let i = 0; i < basePoints; i++) {
            const change = Math.floor(Math.random() * 16) - 8;
            current = Math.max(20, Math.min(160, current + change));
            values.push(current);
        }
        lastValue = values[values.length - 1];
        return values;
    }

    function updateChart() {
        const values = generateValues();
        const points = values.map((value, index) => {
            const x = 20 + index * 70;
            const y = 160 - value;
            return `${x},${y}`;
        }).join(' ');
        line.setAttribute('points', points);

        if (deltaLabel) {
            const delta = values[values.length - 1] - values[values.length - 2];
            const sign = delta >= 0 ? '+' : '';
            deltaLabel.textContent = `最新週 ${sign}${Math.round((delta / 10) * 10)}%`;
        }
    }

    updateChart();
    setInterval(updateChart, 7000);
}

function handleQuickAction(label) {
    console.log('クイックアクション:', label);

    // 実際のアクションに応じてページ遷移や処理を実行
    const actionMap = {
        'ナレッジ作成': 'knowledge-create',
        'AI対話': 'ai-chat',
        'AI検索': 'ai-search',
        'インシデント登録': 'incident-active',
        'レポート作成': 'analytics',
        '設定変更': 'settings-general'
    };

    const targetPage = actionMap[label];

    if (targetPage) {
        // 対応するナビゲーションアイテムをクリック
        const navItem = document.querySelector(`[data-page="${targetPage}"]`);
        if (navItem) {
            navItem.click();
        }
    } else {
        alert(`"${label}" 機能は実装中です。`);
    }
}

function handlePageAction(text) {
    console.log('ページアクション:', text);

    if (text.includes('新規作成')) {
        alert('新規作成ダイアログを表示します（実装中）');
    } else if (text.includes('エクスポート')) {
        alert('データをエクスポートします（実装中）');
    }
}

function showIncidentDetails(title, id) {
    console.log('インシデント詳細:', title, id);

    alert(`インシデント詳細\n\nID: ${id}\nタイトル: ${title}\n\n詳細ビューは実装中です。`);
}

function showKnowledgeDetails(title) {
    console.log('ナレッジ詳細:', title);

    alert(`ナレッジ詳細\n\nタイトル: ${title}\n\n詳細ビューは実装中です。`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
}

function scrollChatToBottom(container) {
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarkdown(text) {
    const escaped = escapeHtml(text);
    return escaped
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

// ========================================
// ユーティリティ関数
// ========================================

// 数値のフォーマット
function formatNumber(num) {
    return new Intl.NumberFormat('ja-JP').format(num);
}

// 日付のフォーマット
function formatDate(date) {
    return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// 相対時間のフォーマット
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
        return `${minutes}分前`;
    } else if (hours < 24) {
        return `${hours}時間前`;
    } else {
        return `${days}日前`;
    }
}

// トーストメッセージを表示
function showToast(message, type = 'info') {
    // トーストメッセージの実装（オプション）
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ローディング状態を表示
function showLoading(element, show = true) {
    if (show) {
        element.classList.add('loading');
        element.setAttribute('disabled', 'disabled');
    } else {
        element.classList.remove('loading');
        element.removeAttribute('disabled');
    }
}

// アニメーション付きカウントアップ
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

// ========================================
// デモデータ生成（開発用）
// ========================================

// デモ用の統計データを更新
function updateDemoStats() {
    const statValues = document.querySelectorAll('.stat-value');

    statValues.forEach((stat, index) => {
        const currentValue = parseInt(stat.textContent);
        const newValue = currentValue + Math.floor(Math.random() * 10);
        animateValue(stat, currentValue, newValue, 1000);
    });
}

// デモ用のリアルタイム更新
function startDemoUpdates() {
    // 30秒ごとに統計を更新
    setInterval(() => {
        updateDemoStats();
    }, 30000);

    // 新しい通知をシミュレート
    setInterval(() => {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const current = parseInt(badge.textContent);
            badge.textContent = current + 1;
        }
    }, 60000);
}

// ページ読み込み時にデモ更新を開始（オプション）
// startDemoUpdates();

// ========================================
// エクスポート
// ========================================
window.miraiApp = {
    formatNumber,
    formatDate,
    formatRelativeTime,
    showToast,
    showLoading,
    animateValue,
    performSearch,
    showIncidentDetails,
    showKnowledgeDetails
};
