/**
 * IT HelpDesk - Application JavaScript
 * IT Support Portal with AI-powered troubleshooting
 */

// ========================================
// State Management
// ========================================
const state = {
    isProcessing: false,
    selectedCategory: null,
    conversationHistory: [],
    currentSection: 'chat'
};

// ========================================
// IT Troubleshooting Knowledge Base
// ========================================
const troubleshootingDB = {
    wifi: {
        title: 'WiFi接続のトラブルシューティング',
        steps: [
            'WiFiがオンになっているか確認してください',
            'ネットワーク一覧から社内WiFi「CORP-WIFI」を選択',
            '接続できない場合は、一度WiFiをオフ→オンにしてください',
            '問題が続く場合は、PCを再起動してください'
        ],
        solutions: {
            '接続済みだがインターネットに繋がらない': [
                'DNSの問題の可能性があります',
                'コマンドプロンプトで `ipconfig /flushdns` を実行',
                'ネットワークアダプターをリセット'
            ],
            'パスワードを忘れた': [
                '社内WiFiパスワード: IT部門に問い合わせ（内線: 3456）',
                'ゲストWiFi: 受付で当日パスワードを取得'
            ]
        },
        escalation: 'ネットワーク障害の可能性があります。IT部門（内線: 3456）にお問い合わせください。'
    },
    vpn: {
        title: 'VPN接続ガイド',
        steps: [
            'FortiClient VPNアプリを起動',
            '接続先: vpn.company.co.jp を選択',
            'ユーザーID: 社員番号を入力',
            'パスワード: ADパスワードを入力',
            '二要素認証: Microsoft Authenticatorのコードを入力'
        ],
        solutions: {
            '認証エラー': [
                'パスワードが正しいか確認（Caps Lockに注意）',
                'ADパスワードの有効期限を確認',
                '認証アプリの時刻同期を確認'
            ],
            '接続タイムアウト': [
                'インターネット接続を確認',
                'ファイアウォール設定を確認',
                '別のネットワーク（モバイルテザリング等）で試す'
            ]
        },
        escalation: 'VPNサーバーの問題の可能性があります。IT部門（内線: 3456）にお問い合わせください。'
    },
    password: {
        title: 'パスワード関連サポート',
        steps: [
            'パスワードリセットポータル: https://passwordreset.company.co.jp にアクセス',
            '登録済みメールアドレスまたは電話番号で本人確認',
            '新しいパスワードを設定（8文字以上、大小英字+数字+記号）',
            'パスワード変更後、全デバイスで再ログインが必要'
        ],
        solutions: {
            'アカウントロック': [
                'パスワード5回連続失敗でロックされます',
                '30分後に自動解除されます',
                '急ぎの場合はIT部門に連絡'
            ],
            'パスワード期限切れ': [
                '90日ごとに変更が必要です',
                'パスワードリセットポータルから変更',
                '過去5回のパスワードは再利用不可'
            ]
        },
        escalation: 'アカウントに問題がある場合は、IT部門（内線: 3456）にお問い合わせください。'
    },
    printer: {
        title: 'プリンター設定・トラブル解決',
        steps: [
            '「設定」→「プリンターとスキャナー」を開く',
            '「プリンターまたはスキャナーを追加」をクリック',
            'ネットワークプリンター一覧から選択',
            'ドライバーが自動インストールされます'
        ],
        solutions: {
            '印刷できない': [
                'プリンターの電源とネットワーク接続を確認',
                '印刷キューに溜まっているジョブを削除',
                'プリンタードライバーを再インストール'
            ],
            '印刷が遅い': [
                '印刷品質を「標準」に下げる',
                '大きなファイルはPDF化してから印刷',
                '混雑時間を避ける（10時〜12時は混みやすい）'
            ]
        },
        escalation: 'プリンター故障の場合は、総務部（内線: 4567）にお問い合わせください。'
    },
    software: {
        title: 'ソフトウェアインストール・設定',
        steps: [
            '社内ソフトウェアポータル: https://software.company.co.jp にアクセス',
            '必要なソフトウェアを検索',
            '「インストール」ボタンをクリック',
            '管理者権限が必要な場合は申請フォームを提出'
        ],
        solutions: {
            'インストールエラー': [
                'PCの空き容量を確認（最低10GB推奨）',
                '他のアプリケーションを閉じて再試行',
                '管理者権限で実行してみる'
            ],
            '起動しない': [
                'PCを再起動して再試行',
                '互換モードで実行を試す',
                'アプリを再インストール'
            ]
        },
        escalation: 'ライセンスや特殊なソフトウェアについては、IT部門（内線: 3456）にお問い合わせください。'
    },
    email: {
        title: 'メール設定・トラブル解決',
        steps: [
            'Outlook / Microsoft 365にサインイン',
            '社員メール: firstname.lastname@company.co.jp',
            'パスワード: ADパスワードと同じ',
            '2段階認証が必要な場合はAuthenticatorアプリを使用'
        ],
        solutions: {
            '送受信できない': [
                'インターネット接続を確認',
                'Outlookをオフラインモードから解除',
                'メールボックスの容量を確認（上限50GB）'
            ],
            '添付ファイルが送れない': [
                '添付ファイルサイズ上限: 25MB',
                '大きなファイルはOneDriveリンクで共有',
                'zipファイルや.exeファイルはブロックされます'
            ]
        },
        escalation: 'メールサーバーの問題の場合は、IT部門（内線: 3456）にお問い合わせください。'
    }
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    aiProcessing: document.getElementById('aiProcessing'),
    processingText: document.getElementById('processingText'),
    stages: {
        analyze: document.getElementById('stageAnalyze'),
        search: document.getElementById('stageSearch'),
        generate: document.getElementById('stageGenerate')
    }
};

// ========================================
// Utility Functions
// ========================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatResponse(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// ========================================
// Topic Selection
// ========================================
function selectTopic(topic) {
    const topicMessages = {
        wifi: 'WiFiに接続できません',
        vpn: 'VPNの設定方法を教えてください',
        password: 'パスワードを変更したいです',
        printer: 'プリンターの設定方法を教えてください',
        software: 'ソフトウェアのインストール方法を知りたいです',
        email: 'メールの設定で困っています'
    };

    const message = topicMessages[topic];
    if (message) {
        elements.messageInput.value = message;
        sendMessage();
    }
}

function selectCategory(category) {
    state.selectedCategory = category;
    const categoryMessages = {
        network: 'ネットワーク関連で困っています',
        software: 'ソフトウェアについて質問があります',
        hardware: 'ハードウェアの問題があります',
        security: 'セキュリティに関する質問です',
        account: 'アカウント関連の問題です'
    };

    elements.messageInput.value = categoryMessages[category] || '';
    elements.messageInput.focus();
}

// ========================================
// Message Functions
// ========================================
function clearWelcomeCard() {
    const welcomeCard = document.querySelector('.welcome-card');
    if (welcomeCard) {
        welcomeCard.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => welcomeCard.remove(), 300);
    }
}

function addMessage(type, content, options = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-wrapper">
                <div class="message-avatar">👤</div>
                <div class="message-bubble">
                    <p>${escapeHtml(content)}</p>
                </div>
            </div>
        `;
    } else if (type === 'ai') {
        const actionsHtml = options.showActions ? `
            <div class="message-actions">
                <button class="msg-action-btn" onclick="createTicket()">📋 チケット作成</button>
                <button class="msg-action-btn" onclick="copyResponse(this)">📄 コピー</button>
                <button class="msg-action-btn" onclick="rateResponse('helpful')">👍 役立った</button>
                <button class="msg-action-btn" onclick="rateResponse('not-helpful')">👎 解決しない</button>
            </div>
        ` : '';

        messageDiv.innerHTML = `
            <div class="message-wrapper">
                <div class="message-avatar">🤖</div>
                <div class="message-bubble">
                    <div class="message-content">
                        ${content}
                    </div>
                    ${actionsHtml}
                </div>
            </div>
        `;
    }

    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    // Add fade-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);

    return messageDiv;
}

function generateAIResponse(userMessage) {
    const message = userMessage.toLowerCase();

    // Detect topic from message
    let topic = null;
    if (message.includes('wifi') || message.includes('ワイファイ') || message.includes('無線')) {
        topic = 'wifi';
    } else if (message.includes('vpn')) {
        topic = 'vpn';
    } else if (message.includes('パスワード') || message.includes('password') || message.includes('ログイン')) {
        topic = 'password';
    } else if (message.includes('プリンター') || message.includes('印刷') || message.includes('プリント')) {
        topic = 'printer';
    } else if (message.includes('ソフトウェア') || message.includes('インストール') || message.includes('アプリ')) {
        topic = 'software';
    } else if (message.includes('メール') || message.includes('outlook') || message.includes('email')) {
        topic = 'email';
    }

    if (topic && troubleshootingDB[topic]) {
        const kb = troubleshootingDB[topic];
        let html = `<h4>📘 ${kb.title}</h4>`;

        html += '<p><strong>基本的な手順:</strong></p><ol>';
        kb.steps.forEach(step => {
            html += `<li>${step}</li>`;
        });
        html += '</ol>';

        // Add common solutions
        const solutionKeys = Object.keys(kb.solutions);
        if (solutionKeys.length > 0) {
            html += '<p><strong>よくある問題と解決策:</strong></p>';
            solutionKeys.forEach(key => {
                html += `<p>🔹 <strong>${key}</strong></p><ul>`;
                kb.solutions[key].forEach(sol => {
                    html += `<li>${sol}</li>`;
                });
                html += '</ul>';
            });
        }

        html += `<p style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.85rem;">
            ⚠️ ${kb.escalation}
        </p>`;

        return html;
    }

    // Default response for unrecognized topics
    return `
        <h4>🔍 お問い合わせを承りました</h4>
        <p>ご質問の内容を確認しました。より正確なサポートを提供するため、以下の情報をお知らせください：</p>
        <ul>
            <li>発生している問題の詳細</li>
            <li>エラーメッセージがあれば、その内容</li>
            <li>問題が発生した日時</li>
            <li>すでに試した対処法</li>
        </ul>
        <p>または、以下のカテゴリから選択してください：</p>
        <ul>
            <li>🌐 ネットワーク（WiFi、VPN、接続問題）</li>
            <li>💻 ソフトウェア（インストール、起動、エラー）</li>
            <li>🖨️ ハードウェア（PC、プリンター、周辺機器）</li>
            <li>🔐 セキュリティ（パスワード、アクセス権限）</li>
            <li>👤 アカウント（ログイン、権限、設定）</li>
        </ul>
        <p style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.85rem;">
            ⚡ 緊急の場合は、IT部門（内線: 3456）に直接お電話ください。
        </p>
    `;
}

// ========================================
// Processing Animation
// ========================================
function showProcessing() {
    elements.aiProcessing.style.display = 'block';
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    resetStages();
}

function hideProcessing() {
    elements.aiProcessing.style.display = 'none';
}

function resetStages() {
    Object.values(elements.stages).forEach(stage => {
        stage.classList.remove('active', 'completed');
    });
}

function updateStage(stageName, status) {
    const stage = elements.stages[stageName];
    if (!stage) return;

    stage.classList.remove('active', 'completed');
    if (status === 'active') {
        stage.classList.add('active');
    } else if (status === 'completed') {
        stage.classList.add('completed');
    }
}

function updateProcessingText(text) {
    elements.processingText.textContent = text;
}

// ========================================
// Send Message
// ========================================
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || state.isProcessing) return;

    state.isProcessing = true;
    elements.sendBtn.disabled = true;
    elements.messageInput.value = '';

    // Clear welcome card if exists
    clearWelcomeCard();

    // Add user message
    addMessage('user', message);

    // Show processing
    showProcessing();

    try {
        // Stage 1: Analyze
        updateStage('analyze', 'active');
        updateProcessingText('問題を分析しています...');
        await sleep(1000);
        updateStage('analyze', 'completed');

        // Stage 2: Search KB
        updateStage('search', 'active');
        updateProcessingText('ナレッジベースを検索しています...');
        await sleep(1200);
        updateStage('search', 'completed');

        // Stage 3: Generate
        updateStage('generate', 'active');
        updateProcessingText('回答を生成しています...');
        await sleep(1000);
        updateStage('generate', 'completed');

        await sleep(500);

        // Hide processing and show response
        hideProcessing();

        const response = generateAIResponse(message);
        addMessage('ai', response, { showActions: true });

    } catch (error) {
        console.error('Error:', error);
        hideProcessing();
        addMessage('ai', '<p>申し訳ございません。エラーが発生しました。もう一度お試しください。</p>');
    }

    state.isProcessing = false;
    elements.sendBtn.disabled = false;
    elements.messageInput.focus();
}

// ========================================
// Action Functions
// ========================================
function createTicket() {
    alert('チケット作成画面を開きます...\n（デモのため実際の画面遷移はありません）');
}

function copyResponse(button) {
    const bubble = button.closest('.message-bubble');
    const content = bubble.querySelector('.message-content').textContent;

    navigator.clipboard.writeText(content).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ コピー完了';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

function rateResponse(rating) {
    const emoji = rating === 'helpful' ? '👍' : '👎';
    alert(`フィードバック（${emoji}）を送信しました。\nご意見ありがとうございます！`);
}

function toggleInfoPanel() {
    const panel = document.getElementById('infoPanel');
    panel.classList.toggle('hidden');
}

// ========================================
// Event Handlers
// ========================================
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Auto-resize textarea
elements.messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// ========================================
// Section Navigation
// ========================================
function switchSection(sectionName) {
    // Update state
    state.currentSection = sectionName;

    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.style.display = 'flex';
    }

    // Update nav items
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Update header
    updateHeader(sectionName);
}

function updateHeader(sectionName) {
    const headerTitle = document.querySelector('.header-left h1');
    const breadcrumbCurrent = document.querySelector('.breadcrumb .current');

    const titles = {
        chat: 'AIサポートチャット',
        tickets: 'マイチケット',
        faq: 'よくある質問 (FAQ)'
    };

    if (headerTitle) {
        headerTitle.textContent = titles[sectionName] || 'IT HelpDesk';
    }
    if (breadcrumbCurrent) {
        breadcrumbCurrent.textContent = titles[sectionName] || sectionName;
    }
}

// ========================================
// FAQ Functions
// ========================================
function toggleFAQ(element) {
    const faqItem = element.closest('.faq-item');
    faqItem.classList.toggle('open');
}

function filterFAQ() {
    const searchTerm = document.getElementById('faqSearch').value.toLowerCase();
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question span').textContent.toLowerCase();
        const answer = item.querySelector('.faq-answer').textContent.toLowerCase();

        if (question.includes(searchTerm) || answer.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterFAQByCategory(category) {
    const faqItems = document.querySelectorAll('.faq-item');

    // Update active button
    document.querySelectorAll('.faq-cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.cat === category) {
            btn.classList.add('active');
        }
    });

    faqItems.forEach(item => {
        if (category === 'all' || item.dataset.cat === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// ========================================
// Ticket Functions
// ========================================
function filterTickets(status) {
    const tickets = document.querySelectorAll('.ticket-card');

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === status) {
            btn.classList.add('active');
        }
    });

    tickets.forEach(ticket => {
        if (status === 'all' || ticket.dataset.status === status) {
            ticket.style.display = 'block';
        } else {
            ticket.style.display = 'none';
        }
    });
}

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize message input if exists
    if (elements.messageInput) {
        elements.messageInput.focus();
    }

    // Setup navigation click handlers
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            switchSection(section);
        });
    });

    // Setup FAQ category buttons
    document.querySelectorAll('.faq-cat-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            filterFAQByCategory(this.dataset.cat);
        });
    });

    // Setup ticket filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            filterTickets(this.dataset.filter);
        });
    });

    console.log('IT HelpDesk initialized');
});
