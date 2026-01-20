// Mirai ヘルプデスク管理システム - メインアプリケーション

// ユーザーロール定義
const USER_ROLES = {
  USER: 'user',
  AGENT: 'agent',
  M365_OPERATOR: 'm365_operator',
  MANAGER: 'manager'
};

// 現在のユーザーロール（デモ用）
let currentUserRole = USER_ROLES.USER;

// メニュー構造定義
const menuStructure = {
  [USER_ROLES.USER]: [
    {
      title: 'メインメニュー',
      items: [
        { id: 'dashboard', icon: '📊', label: 'ダッシュボード' },
        { id: 'my-tickets', icon: '📋', label: 'マイチケット' },
        { id: 'create-ticket', icon: '➕', label: '新規チケット作成' },
        { id: 'helpdesk-list', icon: '💻', label: 'PCヘルプデスク一覧' }
      ]
    },
    {
      title: 'サポート',
      items: [
        { id: 'knowledge', icon: '📚', label: 'ナレッジベース' },
        { id: 'faq', icon: '❓', label: 'よくある質問' },
        { id: 'contact', icon: '📞', label: 'お問い合わせ' }
      ]
    },
    {
      title: 'クイックアクセス',
      items: [
        { id: 'urgent', icon: '🔴', label: '緊急の問い合わせ' },
        { id: 'draft', icon: '📝', label: '下書き' },
        { id: 'favorites', icon: '⭐', label: 'お気に入り' }
      ]
    },
    {
      title: '設定',
      items: [
        { id: 'profile', icon: '👤', label: 'プロフィール' },
        { id: 'notifications', icon: '🔔', label: '通知設定' }
      ]
    }
  ],
  [USER_ROLES.AGENT]: [
    {
      title: 'エージェントメニュー',
      items: [
        { id: 'agent-console', icon: '📋', label: 'チケット管理' },
        { id: 'agent-inbox', icon: '📥', label: '受信トレイ' },
        { id: 'agent-assigned', icon: '👤', label: '担当チケット' },
        { id: 'agent-deadline', icon: '⏰', label: '期限管理' }
      ]
    },
    {
      title: 'サポート',
      items: [
        { id: 'helpdesk-list', icon: '💻', label: 'PCヘルプデスク一覧' },
        { id: 'knowledge', icon: '📚', label: 'ナレッジベース' },
        { id: 'templates', icon: '📝', label: 'テンプレート' },
        { id: 'categories', icon: '🏷️', label: 'カテゴリ管理' }
      ]
    },
    {
      title: 'クイックフィルタ',
      collapsed: false,
      items: [
        { id: 'filter-new', icon: '🆕', label: '新規 (1)' },
        { id: 'filter-p1', icon: '🔴', label: 'P1 (1)' },
        { id: 'filter-approval', icon: '⏳', label: '承認待ち (2)' },
        { id: 'filter-overdue', icon: '⚠️', label: '期限超過 (0)' }
      ]
    },
    {
      title: 'レポート',
      items: [
        { id: 'agent-performance', icon: '📊', label: 'パフォーマンス' },
        { id: 'agent-stats', icon: '📈', label: '統計情報' }
      ]
    }
  ],
  [USER_ROLES.M365_OPERATOR]: [
    {
      title: 'M365オペレーターメニュー',
      items: [
        { id: 'm365-tasks', icon: '⚙️', label: '作業タスク' },
        { id: 'm365-history', icon: '📜', label: '実施履歴' },
        { id: 'm365-schedule', icon: '📋', label: '作業予定' },
        { id: 'm365-recurring', icon: '🔄', label: '繰り返し作業' }
      ]
    },
    {
      title: 'リファレンス',
      items: [
        { id: 'helpdesk-list', icon: '💻', label: 'PCヘルプデスク一覧' },
        { id: 'knowledge', icon: '📚', label: 'ナレッジベース' }
      ]
    },
    {
      title: '作業種別',
      items: [
        { id: 'm365-license', icon: '🎫', label: 'ライセンス管理' },
        { id: 'm365-account', icon: '👤', label: 'アカウント管理' },
        { id: 'm365-mailbox', icon: '📧', label: 'メールボックス設定' },
        { id: 'm365-teams', icon: '👥', label: 'Teams管理' },
        { id: 'm365-onedrive', icon: '☁️', label: 'OneDrive/SharePoint' }
      ]
    },
    {
      title: 'ステータス',
      collapsed: false,
      items: [
        { id: 'm365-pending', icon: '⏳', label: '承認待ち (2)' },
        { id: 'm365-ready', icon: '✅', label: '実施可能 (0)' },
        { id: 'm365-scheduled', icon: '⏰', label: 'スケジュール済み (3)' },
        { id: 'm365-completed', icon: '✔️', label: '完了 (24)' }
      ]
    },
    {
      title: 'ツール',
      items: [
        { id: 'm365-stats', icon: '📊', label: '作業統計' },
        { id: 'm365-procedures', icon: '📖', label: '手順書' }
      ]
    }
  ],
  [USER_ROLES.MANAGER]: [
    {
      title: '管理者メニュー',
      items: [
        { id: 'manager-dashboard', icon: '📊', label: 'KPIダッシュボード' },
        { id: 'manager-reports', icon: '📈', label: '分析レポート' },
        { id: 'manager-sla', icon: '⏱️', label: 'SLA管理' },
        { id: 'manager-goals', icon: '🎯', label: '目標管理' }
      ]
    },
    {
      title: 'チーム管理',
      items: [
        { id: 'manager-team', icon: '👥', label: '担当者管理' },
        { id: 'manager-performance', icon: '🏆', label: 'パフォーマンス評価' },
        { id: 'manager-shift', icon: '📅', label: 'シフト管理' },
        { id: 'manager-training', icon: '🎓', label: 'トレーニング' }
      ]
    },
    {
      title: 'リファレンス',
      items: [
        { id: 'helpdesk-list', icon: '💻', label: 'PCヘルプデスク一覧' },
        { id: 'knowledge', icon: '📚', label: 'ナレッジベース' }
      ]
    },
    {
      title: 'システム',
      items: [
        { id: 'manager-audit', icon: '🔍', label: '監査ログ' },
        { id: 'manager-config', icon: '⚙️', label: 'システム設定' },
        { id: 'manager-categories', icon: '🏷️', label: 'カテゴリ設定' },
        { id: 'manager-templates', icon: '📝', label: 'テンプレート管理' }
      ]
    },
    {
      title: 'レポート',
      items: [
        { id: 'manager-monthly', icon: '📄', label: '月次レポート' },
        { id: 'manager-export', icon: '💾', label: 'データエクスポート' },
        { id: 'manager-auto-report', icon: '📧', label: '自動レポート設定' }
      ]
    }
  ]
};

// ページ定義
const pages = {
  'dashboard': { title: 'ダッシュボード', render: renderDashboard },
  'my-tickets': { title: 'マイチケット', render: renderMyTickets },
  'create-ticket': { title: '新規チケット作成', render: renderCreateTicket },
  'knowledge': { title: 'ナレッジベース', render: renderKnowledge },
  'faq': { title: 'よくある質問', render: renderFAQ },
  'contact': { title: 'お問い合わせ', render: renderContact },
  'urgent': { title: '緊急の問い合わせ', render: renderUrgent },
  'draft': { title: '下書き', render: renderDraft },
  'favorites': { title: 'お気に入り', render: renderFavorites },
  'profile': { title: 'プロフィール', render: renderProfile },
  'notifications': { title: '通知設定', render: renderNotifications },
  'helpdesk-list': { title: 'PCヘルプデスク一覧', render: renderHelpdeskList },
  'agent-console': { title: 'エージェントコンソール', render: renderAgentConsole },
  'm365-tasks': { title: 'M365作業タスク', render: renderM365Tasks },
  'manager-dashboard': { title: '管理者ダッシュボード', render: renderManagerDashboard }
};

// サイドメニュー生成
function renderSidebarMenu() {
  const nav = document.getElementById('sidebar-nav');
  const menu = menuStructure[currentUserRole];

  let html = '';
  menu.forEach((section, index) => {
    const collapsed = section.collapsed === true ? 'collapsed' : '';
    html += `
      <div class="nav-section ${collapsed}" data-section="${index}">
        <div class="nav-section-title">${section.title}</div>
        <div class="nav-section-content">
    `;

    section.items.forEach(item => {
      html += `
        <a href="#" class="nav-link" data-page="${item.id}">
          <span class="nav-link-icon">${item.icon}</span>
          ${item.label}
        </a>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  nav.innerHTML = html;

  // アコーディオン機能
  document.querySelectorAll('.nav-section-title').forEach(title => {
    title.addEventListener('click', function() {
      const section = this.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  // ページ切り替えイベント
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const pageId = this.getAttribute('data-page');
      navigateTo(pageId);
    });
  });
}

// ページ切り替え
function navigateTo(pageId) {
  // アクティブなナビゲーションを更新
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

  // ページ情報取得
  const page = pages[pageId];
  if (!page) {
    console.warn('Page not found:', pageId);
    return;
  }

  // タイトル更新
  document.getElementById('page-title').textContent = page.title;

  // ページレンダリング
  const content = document.getElementById('main-content');
  page.render(content);
}

// ユーザーロール切り替え
function switchUserRole(role) {
  currentUserRole = role;

  // ユーザー情報更新
  const roleLabels = {
    [USER_ROLES.USER]: { name: '山田太郎', avatar: '山', label: '一般ユーザー' },
    [USER_ROLES.AGENT]: { name: '佐藤花子', avatar: '佐', label: 'Agent' },
    [USER_ROLES.M365_OPERATOR]: { name: '田中次郎', avatar: '田', label: 'M365 Operator' },
    [USER_ROLES.MANAGER]: { name: '中村マネージャー', avatar: '中', label: 'Manager' }
  };

  const userInfo = roleLabels[role];
  document.getElementById('user-name').textContent = userInfo.name;
  document.getElementById('user-avatar').textContent = userInfo.avatar;
  document.getElementById('user-role').textContent = userInfo.label;

  // メニュー再生成
  renderSidebarMenu();

  // デフォルトページに遷移
  const defaultPages = {
    [USER_ROLES.USER]: 'dashboard',
    [USER_ROLES.AGENT]: 'agent-console',
    [USER_ROLES.M365_OPERATOR]: 'm365-tasks',
    [USER_ROLES.MANAGER]: 'manager-dashboard'
  };
  navigateTo(defaultPages[role]);
}

// ページレンダリング関数

function renderDashboard(container) {
  container.innerHTML = `
    <div class="alert alert-info">
      ℹ️ 問い合わせの前に<a href="#" onclick="navigateTo('helpdesk-list'); return false;" style="text-decoration: underline; font-weight: 600;">PCヘルプデスク一覧</a>または<a href="#" onclick="navigateTo('knowledge'); return false;" style="text-decoration: underline; font-weight: 600;">ナレッジベース</a>で解決方法を検索してみましょう。
    </div>

    <div class="grid grid-cols-4 mb-3">
      <div class="stat-card">
        <div class="stat-label">対応中のチケット</div>
        <div class="stat-value">3</div>
        <div class="stat-change positive">↑ 先週より1件増加</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">承認待ち</div>
        <div class="stat-value">1</div>
        <div class="stat-change">変更なし</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">今月の問い合わせ</div>
        <div class="stat-value">8</div>
        <div class="stat-change positive">↑ 先月より2件増加</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均解決時間</div>
        <div class="stat-value">4.2h</div>
        <div class="stat-change negative">↓ 改善中</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">マイチケット</h3>
        <a href="#" onclick="navigateTo('create-ticket'); return false;" class="btn btn-primary">+ 新規作成</a>
      </div>
      <div class="card-body">
        <div id="dashboard-tickets"></div>
      </div>
    </div>

    <div class="grid grid-cols-2 mb-3">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">PCヘルプデスク一覧</h3>
          <a href="#" onclick="navigateTo('helpdesk-list'); return false;" class="btn btn-secondary btn-sm">すべて見る</a>
        </div>
        <div class="card-body">
          <p class="text-sm text-muted mb-2">よくある問い合わせと解決方法を確認できます</p>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <span class="badge badge-info">PC問題 (8)</span>
            <span class="badge badge-info">M365 (28)</span>
            <span class="badge badge-info">ネットワーク (5)</span>
            <span class="badge badge-info">全${helpdeskItems.length}件</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">よく見られているナレッジ</h3>
          <a href="#" onclick="navigateTo('knowledge'); return false;" class="btn btn-secondary btn-sm">すべて見る</a>
        </div>
        <div class="card-body">
          <div id="dashboard-knowledge"></div>
        </div>
      </div>
    </div>

    <div style="margin-top: 2rem; padding: 1rem; background: #fff; border-radius: 8px; text-align: center;">
      <p style="margin-bottom: 1rem; font-weight: 600;">デモ: ユーザーロール切り替え</p>
      <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" onclick="switchUserRole('user')">一般ユーザー</button>
        <button class="btn btn-secondary btn-sm" onclick="switchUserRole('agent')">エージェント</button>
        <button class="btn btn-secondary btn-sm" onclick="switchUserRole('m365_operator')">M365オペレーター</button>
        <button class="btn btn-secondary btn-sm" onclick="switchUserRole('manager')">管理者</button>
      </div>
    </div>
  `;

  const myTickets = sampleTickets.filter(t => t.requester === '山田太郎');
  renderTicketTable(myTickets, 'dashboard-tickets');
  renderKnowledgeList('dashboard-knowledge');
}

function renderMyTickets(container) {
  container.innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="grid grid-cols-4">
          <div class="form-group">
            <label class="form-label">ステータス</label>
            <select class="form-control" id="filter-status">
              <option value="">すべて</option>
              <option value="New">New</option>
              <option value="In Progress">対応中</option>
              <option value="Pending Approval">承認待ち</option>
              <option value="Resolved">解決済み</option>
              <option value="Closed">クローズ済み</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">優先度</label>
            <select class="form-control" id="filter-priority">
              <option value="">すべて</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">期間</label>
            <select class="form-control">
              <option value="all">すべて</option>
              <option value="week">今週</option>
              <option value="month" selected>今月</option>
              <option value="quarter">3ヶ月</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">検索</label>
            <input type="text" class="form-control" id="filter-search" placeholder="件名で検索">
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">チケット一覧 (<span id="ticket-count">0</span>件)</h3>
        <a href="#" onclick="navigateTo('create-ticket'); return false;" class="btn btn-primary">+ 新規作成</a>
      </div>
      <div class="card-body">
        <div id="my-tickets-list"></div>
      </div>
    </div>
  `;

  const myTickets = sampleTickets.filter(t => t.requester === '山田太郎');
  renderTicketTable(myTickets, 'my-tickets-list');
  document.getElementById('ticket-count').textContent = myTickets.length;
}

function renderCreateTicket(container) {
  container.innerHTML = `
    <div class="alert alert-info">
      ℹ️ 問い合わせの前に<a href="#" onclick="navigateTo('knowledge'); return false;" style="text-decoration: underline; font-weight: 600;">ナレッジベース</a>で解決方法があるか確認してください。
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">チケット情報</h3>
      </div>
      <div class="card-body">
        <form id="ticket-form">
          <div class="form-group">
            <label class="form-label required">件名</label>
            <input type="text" class="form-control" id="subject" required placeholder="問題や依頼内容を簡潔に入力してください">
          </div>

          <div class="form-group">
            <label class="form-label required">問い合わせ種別</label>
            <select class="form-control" id="type" required>
              <option value="">選択してください</option>
              <option value="インシデント">インシデント（障害・不具合）</option>
              <option value="サービス要求">サービス要求（依頼・申請）</option>
              <option value="問い合わせ">問い合わせ</option>
            </select>
            <div class="form-help">インシデント：業務に支障がある場合、サービス要求：新規設定や変更の依頼</div>
          </div>

          <div class="form-group">
            <label class="form-label required">カテゴリ</label>
            <select class="form-control" id="category" required>
              <option value="">選択してください</option>
              <optgroup label="Microsoft 365">
                <option value="M365/Exchange">メール（Exchange Online）</option>
                <option value="M365/Teams">Teams</option>
                <option value="M365/OneDrive">OneDrive / SharePoint</option>
                <option value="M365/ライセンス">ライセンス管理</option>
                <option value="M365/アカウント">アカウント・権限</option>
              </optgroup>
              <optgroup label="その他">
                <option value="PC">PC・端末</option>
                <option value="ネットワーク">ネットワーク</option>
                <option value="アプリケーション">アプリケーション</option>
                <option value="その他">その他</option>
              </optgroup>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">影響範囲</label>
            <select class="form-control" id="impact" required>
              <option value="">選択してください</option>
              <option value="個人">個人（自分のみ）</option>
              <option value="部署">部署（複数名）</option>
              <option value="全社">全社</option>
              <option value="対外">対外影響あり</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">緊急度</label>
            <select class="form-control" id="urgency" required>
              <option value="">選択してください</option>
              <option value="即時">即時（業務が完全に停止している）</option>
              <option value="高">高（業務に大きな支障がある）</option>
              <option value="中">中（業務に支障があるが回避策あり）</option>
              <option value="低">低（急ぎではない）</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">詳細</label>
            <textarea class="form-control" id="description" required placeholder="問題の詳細や発生状況、エラーメッセージなどを入力してください"></textarea>
            <div class="form-help">できるだけ詳しく記載してください。エラーメッセージがある場合は全文をコピーして貼り付けてください。</div>
          </div>

          <div class="flex flex-gap-2">
            <button type="submit" class="btn btn-primary btn-lg">チケットを作成</button>
            <a href="#" onclick="navigateTo('dashboard'); return false;" class="btn btn-secondary btn-lg">キャンセル</a>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('ticket-form').addEventListener('submit', function(e) {
    e.preventDefault();
    utils.showNotification('チケットを作成しました。チケットID: TKT-2024-006', 'success');
    setTimeout(() => {
      navigateTo('dashboard');
    }, 1500);
  });
}

function renderKnowledge(container) {
  container.innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="form-group" style="margin-bottom: 0;">
          <input type="text" class="form-control" id="search-keyword" placeholder="🔍 キーワードで検索（例：メール送信、Teams、パスワード）" style="font-size: 1.1rem; padding: 1rem;">
        </div>
      </div>
    </div>

    <div class="alert alert-info">
      💡 問題が解決しない場合は、<a href="#" onclick="navigateTo('create-ticket'); return false;" style="text-decoration: underline; font-weight: 600;">新規チケットを作成</a>してください。
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">ナレッジ記事一覧</h3>
      </div>
      <div class="card-body">
        <div id="knowledge-list-full"></div>
      </div>
    </div>
  `;

  renderKnowledgeList('knowledge-list-full');
}

function renderAgentConsole(container) {
  container.innerHTML = `
    <div class="grid grid-cols-4 mb-3">
      <div class="stat-card">
        <div class="stat-label">未割当チケット</div>
        <div class="stat-value">1</div>
        <div class="stat-change">対応が必要</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">担当中</div>
        <div class="stat-value">2</div>
        <div class="stat-change">進行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">期限超過</div>
        <div class="stat-value" style="color: var(--danger-color);">0</div>
        <div class="stat-change positive">問題なし</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">今日の完了数</div>
        <div class="stat-value">5</div>
        <div class="stat-change positive">目標達成</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">チケット一覧 (5件)</h3>
      </div>
      <div class="card-body">
        <div id="agent-tickets"></div>
      </div>
    </div>
  `;

  renderTicketTable(sampleTickets, 'agent-tickets');
}

function renderM365Tasks(container) {
  container.innerHTML = `
    <div class="alert alert-warning">
      ⚠️ すべての作業は承認済みチケットに紐付けられ、実施ログが記録されます。職務分離（SOD）原則により、自分が承認したチケットの作業は実施できません。
    </div>

    <div class="grid grid-cols-4 mb-3">
      <div class="stat-card">
        <div class="stat-label">承認待ち</div>
        <div class="stat-value">2</div>
        <div class="stat-change">作業不可</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">実施可能</div>
        <div class="stat-value">0</div>
        <div class="stat-change">実施待ち</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">今日の作業</div>
        <div class="stat-value">3</div>
        <div class="stat-change positive">完了</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">今月の作業</div>
        <div class="stat-value">24</div>
        <div class="stat-change">進行中</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">M365作業タスク</h3>
      </div>
      <div class="card-body">
        <div id="m365-tasks-list"></div>
      </div>
    </div>
  `;

  renderM365TasksTable('m365-tasks-list');
}

function renderManagerDashboard(container) {
  container.innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="flex flex-between flex-center">
          <div>
            <select class="form-control">
              <option value="today">今日</option>
              <option value="week">今週</option>
              <option value="month" selected>今月</option>
              <option value="quarter">四半期</option>
            </select>
          </div>
          <div class="text-sm text-muted">
            最終更新: 2024-01-15 15:30
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-4 mb-3">
      <div class="stat-card">
        <div class="stat-label">総チケット数</div>
        <div class="stat-value">156</div>
        <div class="stat-change positive">↑ 先月比 +12%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均初動時間</div>
        <div class="stat-value">1.2h</div>
        <div class="stat-change positive">↓ 目標達成</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均解決時間</div>
        <div class="stat-value">4.5h</div>
        <div class="stat-change positive">↓ 改善中</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">SLA達成率</div>
        <div class="stat-value">94.2%</div>
        <div class="stat-change positive">↑ 目標: 90%</div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">優先度別 SLA達成率</h3>
      </div>
      <div class="card-body">
        <div id="manager-sla-table"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Microsoft 365 操作統計</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-4 mb-3">
          <div class="stat-card">
            <div class="stat-label">総操作数</div>
            <div class="stat-value">84</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">承認待ち</div>
            <div class="stat-value">6</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">成功率</div>
            <div class="stat-value">98.8%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">SOD違反検知</div>
            <div class="stat-value" style="color: var(--success-color);">0</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderManagerSLATable('manager-sla-table');
}

// ヘルパー関数

function renderKnowledgeList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '<div class="table-container"><table><thead><tr><th>タイトル</th><th>カテゴリ</th><th>閲覧数</th><th>役に立った</th></tr></thead><tbody>';

  sampleKnowledge.forEach(kb => {
    html += `
      <tr>
        <td style="font-weight: 500; color: var(--primary-color);">${kb.title}</td>
        <td><span class="badge badge-secondary">${kb.category}</span></td>
        <td>${kb.views}</td>
        <td>${kb.helpful} 👍</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderM365TasksTable(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '<div class="table-container"><table><thead><tr><th>タスクID</th><th>チケットID</th><th>作業種別</th><th>対象</th><th>状態</th><th>承認状態</th></tr></thead><tbody>';

  sampleM365Tasks.forEach(task => {
    html += `
      <tr>
        <td><strong>${task.id}</strong></td>
        <td>${task.ticket_id}</td>
        <td><span class="badge badge-info">${task.task_type}</span></td>
        <td>
          <div class="text-sm">${task.target_upn}</div>
          <div class="text-xs text-muted">${task.target_resource}</div>
        </td>
        <td><span class="badge ${task.state === 'Pending Approval' ? 'badge-warning' : 'badge-success'}">${task.state}</span></td>
        <td><span class="badge ${task.approval_status === 'Requested' ? 'badge-warning' : 'badge-success'}">${task.approval_status}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderManagerSLATable(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = [
    { priority: 'P1', total: 8, achieved: 7, failed: 1, rate: 87.5, response: '12分', resolution: '1.8h' },
    { priority: 'P2', total: 32, achieved: 30, failed: 2, rate: 93.8, response: '45分', resolution: '6.2h' },
    { priority: 'P3', total: 78, achieved: 75, failed: 3, rate: 96.2, response: '2.1h', resolution: '1.8日' },
    { priority: 'P4', total: 38, achieved: 37, failed: 1, rate: 97.4, response: '4.5h', resolution: '3.2日' }
  ];

  let html = '<div class="table-container"><table><thead><tr><th>優先度</th><th>総チケット数</th><th>SLA達成</th><th>SLA未達</th><th>達成率</th><th>平均初動時間</th><th>平均解決時間</th></tr></thead><tbody>';

  data.forEach(row => {
    html += `
      <tr>
        <td><span class="badge badge-${row.priority.toLowerCase()}">${row.priority}</span></td>
        <td>${row.total}</td>
        <td style="color: var(--success-color);">${row.achieved}</td>
        <td style="color: var(--danger-color);">${row.failed}</td>
        <td><strong>${row.rate}%</strong></td>
        <td>${row.response}</td>
        <td>${row.resolution}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// 不足しているページのrender関数

function renderFAQ(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">よくある質問（FAQ）</h3>
      </div>
      <div class="card-body">
        <div class="alert alert-info">
          💡 問題が解決しない場合は、<a href="#" onclick="navigateTo('create-ticket'); return false;" style="text-decoration: underline; font-weight: 600;">新規チケットを作成</a>してください。
        </div>

        <div style="margin-top: 2rem;">
          <h4 style="margin-bottom: 1rem; font-weight: 600;">一般的な質問</h4>
          <div class="card" style="margin-bottom: 1rem; cursor: pointer;" onclick="this.querySelector('.faq-answer').style.display = this.querySelector('.faq-answer').style.display === 'none' ? 'block' : 'none'">
            <div class="card-body">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">Q: パスワードを忘れた場合はどうすればいいですか？</div>
              <div class="faq-answer" style="display: none; color: var(--gray-600);">A: セルフサービスパスワードリセット機能を使用するか、ヘルプデスクに問い合わせてください。</div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 1rem; cursor: pointer;" onclick="this.querySelector('.faq-answer').style.display = this.querySelector('.faq-answer').style.display === 'none' ? 'block' : 'none'">
            <div class="card-body">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">Q: 新しいソフトウェアをインストールしたい</div>
              <div class="faq-answer" style="display: none; color: var(--gray-600);">A: ソフトウェアライセンス購入依頼をチケットで申請してください。</div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 1rem; cursor: pointer;" onclick="this.querySelector('.faq-answer').style.display = this.querySelector('.faq-answer').style.display === 'none' ? 'block' : 'none'">
            <div class="card-body">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">Q: チケットの対応状況を確認したい</div>
              <div class="faq-answer" style="display: none; color: var(--gray-600);">A: マイチケットページから対応状況を確認できます。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderContact(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">お問い合わせ</h3>
      </div>
      <div class="card-body">
        <h4 style="margin-bottom: 1rem;">ITヘルプデスク 連絡先</h4>
        <div class="grid grid-cols-2 mb-3">
          <div class="card">
            <div class="card-body">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">📧 メール</div>
              <div>helpdesk@company.com</div>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">📞 電話</div>
              <div>内線: 1234</div>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">🕐 受付時間</div>
              <div>平日 9:00 - 18:00</div>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">📍 場所</div>
              <div>本社ビル 3F ITサポートデスク</div>
            </div>
          </div>
        </div>
        <div class="alert alert-info">
          💡 緊急の場合を除き、<a href="#" onclick="navigateTo('create-ticket'); return false;" style="text-decoration: underline; font-weight: 600;">チケットシステム</a>からのお問い合わせをお願いします。
        </div>
      </div>
    </div>
  `;
}

function renderUrgent(container) {
  container.innerHTML = `
    <div class="alert alert-danger">
      🚨 緊急の問い合わせは、影響範囲「全社」または「対外影響あり」、緊急度「即時」を選択してチケットを作成してください。
    </div>
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">緊急チケット作成</h3>
      </div>
      <div class="card-body">
        <div style="margin-bottom: 1rem;">
          <h4>緊急の場合の対応</h4>
          <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
            <li>影響範囲と緊急度を正しく設定してください</li>
            <li>優先度が自動でP1またはP2に設定されます</li>
            <li>15分以内に初動対応が開始されます</li>
          </ul>
        </div>
        <a href="#" onclick="navigateTo('create-ticket'); return false;" class="btn btn-danger btn-lg">緊急チケットを作成</a>
      </div>
    </div>
  `;
}

function renderDraft(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">下書き</h3>
      </div>
      <div class="card-body">
        <p class="text-center text-muted">保存された下書きはありません</p>
        <div class="text-center" style="margin-top: 2rem;">
          <a href="#" onclick="navigateTo('create-ticket'); return false;" class="btn btn-primary">新規チケット作成</a>
        </div>
      </div>
    </div>
  `;
}

function renderFavorites(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">お気に入り</h3>
      </div>
      <div class="card-body">
        <p class="text-center text-muted">お気に入りに登録されたチケットやナレッジはありません</p>
      </div>
    </div>
  `;
}

function renderProfile(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">プロフィール設定</h3>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">表示名</label>
          <input type="text" class="form-control" value="山田太郎" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">メールアドレス</label>
          <input type="email" class="form-control" value="yamada.taro@company.com" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">部署</label>
          <input type="text" class="form-control" value="営業部" readonly>
        </div>
        <div class="alert alert-info">
          プロフィール情報の変更は人事部にお問い合わせください。
        </div>
      </div>
    </div>
  `;
}

function renderNotifications(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">通知設定</h3>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="flex flex-center">
            <input type="checkbox" checked style="margin-right: 0.5rem;">
            チケット更新時にメール通知を受け取る
          </label>
        </div>
        <div class="form-group">
          <label class="flex flex-center">
            <input type="checkbox" checked style="margin-right: 0.5rem;">
            担当者が割り当てられた時に通知
          </label>
        </div>
        <div class="form-group">
          <label class="flex flex-center">
            <input type="checkbox" style="margin-right: 0.5rem;">
            コメントが追加された時に通知
          </label>
        </div>
        <div class="form-group">
          <label class="flex flex-center">
            <input type="checkbox" checked style="margin-right: 0.5rem;">
            チケットが解決された時に通知
          </label>
        </div>
        <button class="btn btn-primary" onclick="utils.showNotification('設定を保存しました', 'success')">保存</button>
      </div>
    </div>
  `;
}

function renderHelpdeskList(container) {
  container.innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="form-group" style="margin-bottom: 0;">
          <input type="text" class="form-control" id="helpdesk-search" placeholder="🔍 キーワードで検索（例：メール、PC、Teams、パスワード）" oninput="filterHelpdeskItems()" style="font-size: 1.1rem; padding: 1rem;">
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary" onclick="filterHelpdeskByCategory('all')">すべて (${helpdeskItems.length})</button>
          <button class="btn btn-sm btn-secondary" onclick="filterHelpdeskByCategory('M365/Exchange')">Exchange (8)</button>
          <button class="btn btn-sm btn-secondary" onclick="filterHelpdeskByCategory('M365/Teams')">Teams (7)</button>
          <button class="btn btn-sm btn-secondary" onclick="filterHelpdeskByCategory('M365/OneDrive')">OneDrive (5)</button>
          <button class="btn btn-sm btn-secondary" onclick="filterHelpdeskByCategory('PC/ハードウェア')">PC (8)</button>
          <button class="btn btn-sm btn-secondary" onclick="filterHelpdeskByCategory('ネットワーク')">ネットワーク (5)</button>
          <button class="btn btn-sm btn-secondary" onclick="filterHelpdeskByCategory('アプリケーション')">アプリ (5)</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">ヘルプデスク項目一覧 (<span id="helpdesk-count">${helpdeskItems.length}</span>件)</h3>
      </div>
      <div class="card-body">
        <div id="helpdesk-items-table"></div>
      </div>
    </div>
  `;

  displayHelpdeskItems(helpdeskItems);
}

function displayHelpdeskItems(items) {
  const container = document.getElementById('helpdesk-items-table');
  if (!container) return;

  document.getElementById('helpdesk-count').textContent = items.length;

  if (items.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">該当する項目が見つかりませんでした</p>';
    return;
  }

  let html = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>カテゴリ</th>
            <th>タイトル</th>
            <th>説明</th>
            <th>解決方法</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(item => {
    html += `
      <tr>
        <td><strong>${item.id}</strong></td>
        <td><span class="badge badge-secondary">${item.category}</span></td>
        <td style="font-weight: 500;">${item.title}</td>
        <td class="text-sm">${item.description}</td>
        <td class="text-sm" style="color: var(--success-color);">${item.solution}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function filterHelpdeskItems() {
  const keyword = document.getElementById('helpdesk-search').value.toLowerCase();
  const filtered = helpdeskItems.filter(item =>
    item.title.toLowerCase().includes(keyword) ||
    item.description.toLowerCase().includes(keyword) ||
    item.solution.toLowerCase().includes(keyword) ||
    item.keywords.toLowerCase().includes(keyword)
  );
  displayHelpdeskItems(filtered);
}

function filterHelpdeskByCategory(category) {
  if (category === 'all') {
    displayHelpdeskItems(helpdeskItems);
  } else {
    const filtered = helpdeskItems.filter(item => item.category === category);
    displayHelpdeskItems(filtered);
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
  renderSidebarMenu();
  navigateTo('dashboard');
});
