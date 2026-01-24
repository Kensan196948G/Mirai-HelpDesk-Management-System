/**
 * サンプルデータモジュール
 */

// サンプルユーザー
const SAMPLE_USERS = [
    { user_id: 'u1', username: 'requester1', display_name: '田中太郎', role: 'Requester' },
    { user_id: 'u2', username: 'agent1', display_name: '佐藤花子', role: 'Agent' },
    { user_id: 'u3', username: 'operator1', display_name: '鈴木次郎', role: 'M365Operator' },
    { user_id: 'u4', username: 'approver1', display_name: '高橋美咲', role: 'Approver' },
    { user_id: 'u5', username: 'manager1', display_name: '山田健太', role: 'Manager' },
];

// サンプルチケット（50件）
const SAMPLE_TICKETS = [
    { ticket_id: 't1', ticket_number: 1, type: 'incident', subject: 'PCが起動しない', description: '朝からPCの電源が入りません', impact: 'individual', urgency: 'high', priority: 'P3', status: 'In Progress', requester_id: 'u1', assignee_id: 'u2', created_at: '2026-01-24T09:00:00', itsm_type: 'INCIDENT', ai_processed: true },
    { ticket_id: 't2', ticket_number: 2, type: 'service_request', subject: 'M365ライセンス申請', description: '新入社員用のM365ライセンスが必要です', impact: 'individual', urgency: 'medium', priority: 'P3', status: 'Pending Approval', requester_id: 'u1', assignee_id: 'u3', created_at: '2026-01-24T09:15:00', itsm_type: 'REQUEST', ai_processed: true },
    { ticket_id: 't3', ticket_number: 3, type: 'incident', subject: 'メールが送信できない', description: 'Outlookでメール送信時にエラーが出ます', impact: 'individual', urgency: 'high', priority: 'P3', status: 'Resolved', requester_id: 'u1', assignee_id: 'u2', created_at: '2026-01-24T08:30:00', resolved_at: '2026-01-24T10:00:00', itsm_type: 'INCIDENT', ai_processed: false },
    { ticket_id: 't4', ticket_number: 4, type: 'change', subject: 'VPN設定変更', description: 'リモートワーク用VPN設定を変更したい', impact: 'department', urgency: 'medium', priority: 'P2', status: 'Pending Change Window', requester_id: 'u1', assignee_id: 'u2', created_at: '2026-01-23T16:00:00', itsm_type: 'CHANGE', ai_processed: true },
    { ticket_id: 't5', ticket_number: 5, type: 'incident', subject: 'プリンターが印刷できない', description: '共有プリンターで印刷ジョブが詰まっています', impact: 'department', urgency: 'medium', priority: 'P2', status: 'New', requester_id: 'u1', assignee_id: null, created_at: '2026-01-24T10:30:00', itsm_type: 'INCIDENT', ai_processed: false },
    { ticket_id: 't6', ticket_number: 6, type: 'incident', subject: 'Wi-Fi接続が不安定', description: '会議室AのWi-Fiが頻繁に切断されます', impact: 'department', urgency: 'high', priority: 'P2', status: 'In Progress', requester_id: 'u1', assignee_id: 'u2', created_at: '2026-01-24T11:00:00', itsm_type: 'PROBLEM', ai_processed: true },
    { ticket_id: 't7', ticket_number: 7, type: 'service_request', subject: 'パスワードリセット依頼', description: 'パスワードを忘れました', impact: 'individual', urgency: 'high', priority: 'P3', status: 'Resolved', requester_id: 'u1', assignee_id: 'u3', created_at: '2026-01-24T07:45:00', resolved_at: '2026-01-24T08:00:00', itsm_type: 'REQUEST', ai_processed: true },
    { ticket_id: 't8', ticket_number: 8, type: 'incident', subject: 'Teamsビデオ会議の音声不良', description: '会議中に音声が途切れます', impact: 'individual', urgency: 'medium', priority: 'P3', status: 'In Progress', requester_id: 'u1', assignee_id: 'u2', created_at: '2026-01-24T09:30:00', itsm_type: 'INCIDENT', ai_processed: true },
    { ticket_id: 't9', ticket_number: 9, type: 'service_request', subject: 'グループメンバーシップ追加', description: 'プロジェクトXのTeamsグループに追加してください', impact: 'individual', urgency: 'low', priority: 'P4', status: 'New', requester_id: 'u1', assignee_id: null, created_at: '2026-01-24T11:15:00', itsm_type: 'REQUEST', ai_processed: false },
    { ticket_id: 't10', ticket_number: 10, type: 'incident', subject: 'ファイルサーバーにアクセスできない', description: '共有フォルダが見つかりません', impact: 'department', urgency: 'high', priority: 'P2', status: 'In Progress', requester_id: 'u1', assignee_id: 'u2', created_at: '2026-01-24T10:00:00', itsm_type: 'INCIDENT', ai_processed: true },
];

// 追加のサンプルチケット（40件）
for (let i = 11; i <= 50; i++) {
    const types = ['incident', 'service_request', 'change'];
    const impacts = ['individual', 'department', 'company'];
    const urgencies = ['low', 'medium', 'high', 'critical'];
    const statuses = ['New', 'Triage', 'Assigned', 'In Progress', 'Pending Customer', 'Pending Approval', 'Resolved', 'Closed'];
    const itsmTypes = ['INCIDENT', 'PROBLEM', 'CHANGE', 'REQUEST', 'RELEASE'];

    const type = types[i % 3];
    const impact = impacts[i % 3];
    const urgency = urgencies[i % 4];
    const status = statuses[i % 8];
    const itsmType = itsmTypes[i % 5];

    const priority = impact === 'company' || urgency === 'critical' ? 'P1' :
                     impact === 'department' || urgency === 'high' ? 'P2' :
                     urgency === 'medium' ? 'P3' : 'P4';

    SAMPLE_TICKETS.push({
        ticket_id: `t${i}`,
        ticket_number: i,
        type,
        subject: `サンプルチケット ${i}: ${type === 'incident' ? '障害' : type === 'service_request' ? 'サービス要求' : '変更'}`,
        description: `これはサンプルのチケット${i}です。`,
        impact,
        urgency,
        priority,
        status,
        requester_id: 'u1',
        assignee_id: status !== 'New' ? 'u2' : null,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        itsm_type: itsmType,
        ai_processed: i % 3 === 0,
    });
}

// サンプルナレッジ記事（30件）
const SAMPLE_KNOWLEDGE = [
    { article_id: 'k1', title: 'パスワードリセット手順', content: '# パスワードリセット手順\n\n1. 管理センターにアクセス\n2. ユーザーを選択\n3. パスワードリセットをクリック', article_type: 'how_to', category: 'アカウント管理', tags: 'パスワード,リセット,M365', view_count: 156, helpful_count: 42, is_ai_generated: true, quality_score: 94, subagents: ['Architect', 'Curator', 'ITSM', 'DevOps', 'QA', 'Coordinator', 'Documenter'] },
    { article_id: 'k2', title: 'VPN接続方法', content: '# VPN接続方法\n\n## Windows\n1. 設定を開く\n2. ネットワークとインターネット\n3. VPN\n4. 接続', article_type: 'how_to', category: 'ネットワーク', tags: 'VPN,接続,リモートワーク', view_count: 234, helpful_count: 67, is_ai_generated: true, quality_score: 92, subagents: ['Architect', 'Curator', 'DevOps', 'Documenter'] },
    { article_id: 'k3', title: 'メール転送設定', content: '# メール転送設定\n\nOutlookで自動転送を設定する方法', article_type: 'how_to', category: 'Microsoft 365', tags: 'メール,転送,Outlook', view_count: 189, helpful_count: 53, is_ai_generated: false, quality_score: null, subagents: null },
    { article_id: 'k4', title: 'Teamsの使い方基礎', content: '# Microsoft Teams基礎\n\n## チャット\n## ビデオ会議\n## ファイル共有', article_type: 'how_to', category: 'Microsoft 365', tags: 'Teams,チャット,会議', view_count: 312, helpful_count: 89, is_ai_generated: true, quality_score: 96, subagents: ['Curator', 'ITSM', 'Documenter'] },
    { article_id: 'k5', title: 'プリンタートラブルシューティング', content: '# プリンター問題の解決\n\n1. 電源確認\n2. 接続確認\n3. ドライバー確認', article_type: 'troubleshooting', category: 'ハードウェア', tags: 'プリンター,印刷,トラブル', view_count: 145, helpful_count: 38, is_ai_generated: true, quality_score: 88, subagents: ['Architect', 'QA', 'Documenter'] },
    { article_id: 'k6', title: 'Wi-Fi接続トラブルシューティング', content: '# Wi-Fi問題の解決\n\n## 確認項目\n- Wi-Fi ON/OFF\n- 再接続\n- ルーター再起動', article_type: 'troubleshooting', category: 'ネットワーク', tags: 'Wi-Fi,無線LAN,接続', view_count: 278, helpful_count: 71, is_ai_generated: true, quality_score: 91, subagents: ['Architect', 'DevOps', 'QA', 'Documenter'] },
    { article_id: 'k7', title: 'MFA設定方法', content: '# 多要素認証(MFA)設定\n\n1. セキュリティ設定\n2. MFA有効化\n3. 認証アプリ登録', article_type: 'how_to', category: 'セキュリティ', tags: 'MFA,認証,セキュリティ', view_count: 201, helpful_count: 55, is_ai_generated: true, quality_score: 95, subagents: ['Architect', 'Curator', 'ITSM', 'Documenter'] },
    { article_id: 'k8', title: 'OneDriveファイル復元', content: '# 削除ファイルの復元\n\nOneDriveのごみ箱から復元する方法', article_type: 'how_to', category: 'Microsoft 365', tags: 'OneDrive,復元,ファイル', view_count: 167, helpful_count: 44, is_ai_generated: false, quality_score: null, subagents: null },
];

// 追加のナレッジ記事
for (let i = 9; i <= 30; i++) {
    const types = ['faq', 'how_to', 'known_issue', 'troubleshooting'];
    const categories = ['Microsoft 365', 'ハードウェア', 'ネットワーク', 'セキュリティ', 'アカウント管理'];

    SAMPLE_KNOWLEDGE.push({
        article_id: `k${i}`,
        title: `ナレッジ記事 ${i}`,
        content: `# ナレッジ記事 ${i}\n\nサンプルコンテンツ`,
        article_type: types[i % 4],
        category: categories[i % 5],
        tags: 'サンプル,テスト',
        view_count: Math.floor(Math.random() * 300),
        helpful_count: Math.floor(Math.random() * 100),
        is_ai_generated: i % 2 === 0,
        quality_score: i % 2 === 0 ? Math.floor(Math.random() * 20 + 80) : null,
        subagents: i % 2 === 0 ? ['Architect', 'Curator', 'ITSM', 'Documenter'] : null,
    });
}

// サンプル承認依頼
const SAMPLE_APPROVALS = [
    { approval_id: 'a1', ticket_id: 't2', ticket_number: 2, description: 'M365ライセンス付与の承認依頼', requester: '鈴木次郎', requester_role: 'M365Operator', approver_id: null, state: 'requested', created_at: '2026-01-24T09:15:00', sod_status: 'ok' },
    { approval_id: 'a2', ticket_id: 't15', ticket_number: 15, description: 'メールボックス権限付与の承認依頼', requester: '鈴木次郎', requester_role: 'M365Operator', approver_id: null, state: 'requested', created_at: '2026-01-24T10:30:00', sod_status: 'ok' },
    { approval_id: 'a3', ticket_id: 't22', ticket_number: 22, description: 'グループ所有者変更の承認依頼', requester: '鈴木次郎', requester_role: 'M365Operator', approver_id: null, state: 'requested', created_at: '2026-01-24T11:00:00', sod_status: 'ok' },
    { approval_id: 'a4', ticket_id: 't8', ticket_number: 8, description: 'ライセンス一括付与の承認依頼', requester: '佐藤花子', requester_role: 'Agent', approver_id: 'u4', state: 'approved', created_at: '2026-01-23T14:00:00', decided_at: '2026-01-23T15:30:00', sod_status: 'ok' },
];

// サンプルM365タスク
const SAMPLE_M365_TASKS = [
    { task_id: 'm1', ticket_id: 't2', task_number: 'M365-001', task_type: 'ライセンス付与', target_upn: 'newuser@example.com', approval_state: 'approved', sod_status: 'ok', state: 'pending', created_at: '2026-01-24T09:20:00' },
    { task_id: 'm2', ticket_id: 't15', task_number: 'M365-002', task_type: 'メールボックス権限付与', target_upn: 'shared@example.com', approval_state: 'approved', sod_status: 'ok', state: 'pending', created_at: '2026-01-24T10:35:00' },
    { task_id: 'm3', ticket_id: 't7', task_number: 'M365-003', task_type: 'パスワードリセット', target_upn: 'user1@example.com', approval_state: 'approved', sod_status: 'ok', state: 'completed', created_at: '2026-01-24T07:50:00', completed_at: '2026-01-24T07:55:00' },
];

// サンプルコメント
const SAMPLE_COMMENTS = {
    't1': [
        { comment_id: 'c1', author: '佐藤花子', author_role: 'Agent', body: '調査中です。ハードウェア診断を実施します。', visibility: 'public', created_at: '2026-01-24T09:30:00' },
        { comment_id: 'c2', author: '佐藤花子', author_role: 'Agent', body: '電源ユニットの故障の可能性あり。交換手配中。', visibility: 'internal', created_at: '2026-01-24T10:00:00' },
    ],
    't2': [
        { comment_id: 'c3', author: '鈴木次郎', author_role: 'M365Operator', body: '承認依頼を提出しました。', visibility: 'public', created_at: '2026-01-24T09:20:00' },
    ],
};

// サンプル履歴
const SAMPLE_HISTORY = {
    't1': [
        { history_id: 'h1', actor: '田中太郎', action: 'created', created_at: '2026-01-24T09:00:00', details: 'チケットを作成しました' },
        { history_id: 'h2', actor: '佐藤花子', action: 'status_changed', created_at: '2026-01-24T09:05:00', details: 'ステータスを New → Triage に変更' },
        { history_id: 'h3', actor: '佐藤花子', action: 'assigned', created_at: '2026-01-24T09:10:00', details: '担当者を佐藤花子に設定' },
        { history_id: 'h4', actor: '佐藤花子', action: 'status_changed', created_at: '2026-01-24T09:15:00', details: 'ステータスを Triage → In Progress に変更' },
        { history_id: 'h5', actor: '佐藤花子', action: 'commented', created_at: '2026-01-24T09:30:00', details: 'コメントを追加' },
        { history_id: 'h6', actor: '佐藤花子', action: 'commented', created_at: '2026-01-24T10:00:00', details: '内部メモを追加' },
    ],
};

// AI処理サンプル結果
const SAMPLE_AI_RESULTS = {
    'PCが起動しない': {
        queryType: 'FAQ',
        itsmType: 'INCIDENT',
        processingTime: 2340,
        qualityScore: { overall: 94, completeness: 96, accuracy: 92, relevance: 94 },
        answer: {
            summary: 'PCが起動しない問題について、以下の対処法を推奨します：\n\n1. 電源ケーブルの接続確認\n2. バッテリーの充電状況確認\n3. 電源ボタンの長押し（10秒）\n4. 周辺機器をすべて外して再起動\n5. セーフモードでの起動試行\n\nこれらの手順で解決しない場合は、ハードウェア故障の可能性があります。',
            technicalSummary: '【技術者向け詳細】\n\nBIOS起動確認、POST（Power-On Self-Test）の状態確認、ビープ音の有無をチェックしてください。電源ユニット（PSU）の電圧測定、マザーボードのCMOSクリア、メモリモジュールの再装着も有効です。イベントログ（Event Viewer）で直前のシャットダウンログを確認し、クリティカルエラーの有無を調査してください。',
            userSummary: '【一般ユーザー向け説明】\n\nまず、電源ケーブルがしっかり差し込まれているか確認してください。ノートPCの場合は充電できているかも確認しましょう。次に、電源ボタンを10秒間長押しして、完全に電源を切ってから再度起動してみてください。USBメモリやマウスなど、接続している周辺機器をすべて外してから起動すると改善する場合があります。',
            preventiveMeasures: '再発防止策：\n- 定期的なシステムアップデート\n- 電源管理設定の最適化\n- ハードウェア診断ツールの定期実行\n- UPS（無停電電源装置）の導入検討',
            improvementSuggestions: '改善提案：\n- PC起動診断の自動化スクリプト導入\n- リモート診断ツールの配備\n- ハードウェア監視システムの導入\n- 予防保守スケジュールの確立',
            automationPotential: 75,
            sources: [
                { title: 'Microsoft公式: PCトラブルシューティング', url: 'https://support.microsoft.com/ja-jp/windows/pc-troubleshooting' },
                { title: 'Windows起動問題の診断方法', url: 'https://learn.microsoft.com/ja-jp/troubleshoot/windows-client/setup-upgrade-and-drivers/windows-startup-issues' },
                { title: 'ハードウェア診断ガイド', url: 'https://www.intel.com/content/www/us/en/support/articles/diagnostics.html' },
            ],
        },
        aiResponses: {
            CLAUDE: {
                model: 'Claude',
                answer: 'PCが起動しない問題について、ハードウェアとソフトウェアの両面から診断手順を提示します。電源系統、POST、BIOSの順に確認していくことを推奨します。',
                confidence: 96.5,
                sources: [
                    { title: 'Microsoft公式サポート', url: 'https://support.microsoft.com' },
                ],
            },
            GEMINI: {
                model: 'Gemini',
                answer: '複数の技術ドキュメントを分析した結果、電源関連の問題が最も一般的です。バッテリー、電源ユニット、マザーボードの順に確認してください。',
                confidence: 92.3,
                sources: [
                    { title: 'ハードウェアトラブルシューティング', url: 'https://example.com/hw-troubleshooting' },
                ],
            },
            PERPLEXITY: {
                model: 'Perplexity',
                answer: '最新の情報によると、Windows 11の高速スタートアップ機能が原因で起動しない事例が2024年後半から増加しています。BIOS設定で無効化を推奨します。',
                confidence: 89.7,
                sources: [
                    { title: 'Windows 11既知の問題（2024年12月更新）', url: 'https://example.com/windows11-issues' },
                    { title: '高速スタートアップ無効化手順', url: 'https://example.com/fast-startup' },
                ],
            },
        },
    },
};

// AI処理統計
const AI_STATS = {
    totalAIProcessed: 42,
    totalTickets: 151,
    aiProcessingRate: 28,
    autoGeneratedKnowledge: 18,
    totalKnowledge: 30,
    automationSuccessRate: 89,
    averageQualityScore: 92,
    averageProcessingTime: 2.4, // 秒
};

// SubAgent処理ログ
const SUBAGENT_LOGS = [
    { agent: 'Architect', status: 'completed', duration: 0.8, result: '設計整合性: OK' },
    { agent: 'KnowledgeCurator', status: 'completed', duration: 1.2, result: 'カテゴリ: ハードウェア、タグ: PC,起動,トラブル' },
    { agent: 'ITSMExpert', status: 'completed', duration: 0.9, result: 'ITSM分類: Incident、優先度: P3適切' },
    { agent: 'DevOps', status: 'completed', duration: 1.5, result: '自動化可能性: 75%、診断スクリプト推奨' },
    { agent: 'QA', status: 'completed', duration: 1.1, result: '品質スコア: 94%、重複なし' },
    { agent: 'Coordinator', status: 'completed', duration: 0.6, result: '調整不要、エージェント対応可能' },
    { agent: 'Documenter', status: 'completed', duration: 1.3, result: '技術者/ユーザー向け要約生成完了' },
];

// Hooks実行ログ
const HOOKS_LOGS = [
    { hook: 'Pre-Task', status: 'completed', duration: 0.8, result: '入力検証OK、SubAgent割り当て完了' },
    { hook: 'Duplicate-Check', status: 'completed', duration: 1.2, result: '類似ナレッジなし（最高類似度: 67%）' },
    { hook: 'Deviation-Check', status: 'completed', duration: 0.5, result: 'ITSM原則からの逸脱なし' },
    { hook: 'Post-Task', status: 'completed', duration: 1.5, result: '統合レビュー完了、総合品質: 94%' },
];

// M365操作ログ
const M365_EXECUTION_LOGS = [
    { log_id: 'l1', task_id: 'm3', operator: '鈴木次郎', method: 'admin_center', command: '管理センター > パスワードリセット', result: 'success', evidence: 'screenshot_001.png', created_at: '2026-01-24T07:55:00' },
    { log_id: 'l2', task_id: 'm4', operator: '鈴木次郎', method: 'powershell', command: 'Set-Mailbox -Identity user@example.com -GrantSendOnBehalfTo assistant@example.com', result: 'success', evidence: 'powershell_output_002.txt', created_at: '2026-01-23T16:20:00' },
];
