// Mirai ヘルプデスク管理システム - 共通JavaScript

// ヘルプデスク一覧データ（PC、M365、ネットワーク等の全項目）
const helpdeskItems = [
  // Microsoft 365 - Exchange関連
  { id: 'HD-001', category: 'M365/Exchange', title: 'メールが送信できない', description: 'Outlook でメール送信時にエラーが発生する', solution: '送信トレイの確認、容量確認、再起動', keywords: 'メール,送信,エラー,Outlook' },
  { id: 'HD-002', category: 'M365/Exchange', title: 'メールが受信できない', description: 'メールボックスが受信できない、または遅延している', solution: 'メールボックス容量確認、フィルター設定確認', keywords: 'メール,受信,遅延,メールボックス' },
  { id: 'HD-003', category: 'M365/Exchange', title: '共有メールボックスにアクセスできない', description: '共有メールボックスが表示されない、またはアクセス権限がない', solution: '権限設定の確認、Outlook再起動、キャッシュクリア', keywords: '共有メールボックス,アクセス,権限' },
  { id: 'HD-004', category: 'M365/Exchange', title: 'メールの容量が不足している', description: 'メールボックスの容量が上限に達している', solution: '不要メール削除、アーカイブ設定、容量拡張申請', keywords: '容量,メールボックス,削除,アーカイブ' },
  { id: 'HD-005', category: 'M365/Exchange', title: '不在時の自動応答設定', description: '休暇中の自動応答メッセージを設定したい', solution: 'Outlook の自動応答機能を使用', keywords: '自動応答,不在,休暇,Out of Office' },
  { id: 'HD-006', category: 'M365/Exchange', title: 'メール転送設定', description: '特定のメールを別のアドレスに転送したい', solution: 'ルール設定またはフォルダー転送設定', keywords: 'メール転送,ルール,フォルダー' },
  { id: 'HD-007', category: 'M365/Exchange', title: 'メーリングリストへの追加依頼', description: '配布リストやメーリングリストに追加してほしい', solution: '管理者に申請、承認後に追加', keywords: 'メーリングリスト,配布リスト,追加' },
  { id: 'HD-008', category: 'M365/Exchange', title: '誤送信メールの取り消し', description: '送信したメールを取り消したい', solution: 'メッセージの取り消し機能（受信者が未読の場合のみ）', keywords: '誤送信,取り消し,リコール' },

  // Microsoft 365 - Teams関連
  { id: 'HD-009', category: 'M365/Teams', title: 'Teams会議に参加できない', description: '会議リンクをクリックしても参加できない', solution: 'ブラウザ変更、アプリ再起動、リンク再確認', keywords: 'Teams,会議,参加,エラー' },
  { id: 'HD-010', category: 'M365/Teams', title: 'Teams で画面共有ができない', description: '会議中に画面共有ボタンが押せない、または共有できない', solution: 'ブラウザ権限確認、デスクトップアプリ使用、再起動', keywords: 'Teams,画面共有,会議,権限' },
  { id: 'HD-011', category: 'M365/Teams', title: 'Teamsで音声が聞こえない', description: '会議中に相手の声が聞こえない', solution: 'デバイス設定確認、スピーカー選択、ミュート解除', keywords: 'Teams,音声,聞こえない,スピーカー' },
  { id: 'HD-012', category: 'M365/Teams', title: 'Teamsでマイクが認識されない', description: '自分の声が相手に届かない', solution: 'マイク設定確認、デバイス選択、ブラウザ権限', keywords: 'Teams,マイク,認識,設定' },
  { id: 'HD-013', category: 'M365/Teams', title: 'Teamsチーム作成依頼', description: '新しいTeamsチームを作成したい', solution: '申請フォーム提出、承認後に作成', keywords: 'Teams,チーム作成,申請' },
  { id: 'HD-014', category: 'M365/Teams', title: 'Teams通知が多すぎる', description: '通知が頻繁に来て作業の妨げになる', solution: '通知設定のカスタマイズ、チャネルごとの設定', keywords: 'Teams,通知,設定,カスタマイズ' },
  { id: 'HD-015', category: 'M365/Teams', title: 'Teamsファイル共有方法', description: 'チーム内でファイルを共有する方法がわからない', solution: 'ファイルタブからアップロード、OneDrive連携', keywords: 'Teams,ファイル共有,アップロード' },

  // Microsoft 365 - OneDrive/SharePoint関連
  { id: 'HD-016', category: 'M365/OneDrive', title: 'OneDrive容量不足', description: 'OneDriveの容量が上限に達した', solution: '不要ファイル削除、容量拡張申請', keywords: 'OneDrive,容量,不足,削除' },
  { id: 'HD-017', category: 'M365/OneDrive', title: 'OneDriveの同期エラー', description: 'ファイルが同期されない、またはエラーが出る', solution: '同期設定確認、再起動、キャッシュクリア', keywords: 'OneDrive,同期,エラー' },
  { id: 'HD-018', category: 'M365/OneDrive', title: 'OneDriveファイルの復元', description: '誤って削除したファイルを復元したい', solution: 'ごみ箱から復元、バージョン履歴から復元', keywords: 'OneDrive,復元,削除,ごみ箱' },
  { id: 'HD-019', category: 'M365/OneDrive', title: 'OneDriveファイルの共有方法', description: 'ファイルやフォルダを他の人と共有したい', solution: '共有リンク作成、権限設定', keywords: 'OneDrive,共有,リンク,権限' },
  { id: 'HD-020', category: 'M365/OneDrive', title: 'SharePointサイトへのアクセス権限', description: 'SharePointサイトにアクセスできない', solution: '権限申請、サイト所有者に連絡', keywords: 'SharePoint,アクセス,権限,申請' },

  // Microsoft 365 - ライセンス関連
  { id: 'HD-021', category: 'M365/ライセンス', title: 'Microsoft 365ライセンス追加依頼', description: 'E5ライセンスを追加したい', solution: '申請フォーム提出、承認後に付与', keywords: 'ライセンス,追加,E5,申請' },
  { id: 'HD-022', category: 'M365/ライセンス', title: 'アプリケーションが使えない', description: 'Word、Excel等のアプリが起動しない', solution: 'ライセンス確認、再インストール、サインイン確認', keywords: 'アプリケーション,Word,Excel,ライセンス' },
  { id: 'HD-023', category: 'M365/ライセンス', title: 'Office認証エラー', description: 'Officeアプリで認証エラーが出る', solution: 'サインアウト・サインイン、ライセンス再割り当て', keywords: 'Office,認証,エラー,ライセンス' },

  // Microsoft 365 - アカウント関連
  { id: 'HD-024', category: 'M365/アカウント', title: 'パスワードを忘れた', description: 'Microsoft 365アカウントのパスワードがわからない', solution: 'セルフサービスパスワードリセット、ヘルプデスクに連絡', keywords: 'パスワード,忘れた,リセット,アカウント' },
  { id: 'HD-025', category: 'M365/アカウント', title: 'アカウントがロックされた', description: 'ログイン試行回数超過でロックされた', solution: '30分待つ、またはヘルプデスクに連絡', keywords: 'アカウント,ロック,ログイン,解除' },
  { id: 'HD-026', category: 'M365/アカウント', title: 'MFA（多要素認証）設定', description: '多要素認証の設定方法がわからない', solution: 'Microsoft Authenticatorアプリを使用、QRコード読み取り', keywords: 'MFA,多要素認証,設定,Authenticator' },
  { id: 'HD-027', category: 'M365/アカウント', title: 'MFAデバイスの変更', description: 'スマートフォンを変更したのでMFAを再設定したい', solution: 'ヘルプデスクに連絡してリセット依頼', keywords: 'MFA,デバイス変更,リセット' },

  // PC・端末関連
  { id: 'HD-028', category: 'PC/ハードウェア', title: 'PCが起動しない', description: '電源ボタンを押しても起動しない', solution: '電源ケーブル確認、強制シャットダウン後に再起動', keywords: 'PC,起動しない,電源,トラブル' },
  { id: 'HD-029', category: 'PC/ハードウェア', title: 'PCの動作が遅い', description: 'アプリケーションの起動や動作が著しく遅い', solution: 'タスクマネージャー確認、不要アプリ終了、再起動', keywords: 'PC,遅い,パフォーマンス,重い' },
  { id: 'HD-030', category: 'PC/ハードウェア', title: 'ディスプレイが映らない', description: 'モニターに何も表示されない', solution: 'ケーブル接続確認、入力切替、別モニターで確認', keywords: 'ディスプレイ,モニター,映らない,表示' },
  { id: 'HD-031', category: 'PC/ハードウェア', title: 'キーボードが反応しない', description: 'キー入力ができない', solution: '接続確認、USB差し替え、ドライバ再インストール', keywords: 'キーボード,反応しない,入力' },
  { id: 'HD-032', category: 'PC/ハードウェア', title: 'マウスが動かない', description: 'マウスカーソルが動かない、反応が悪い', solution: '接続確認、電池交換、USB差し替え', keywords: 'マウス,動かない,カーソル' },
  { id: 'HD-033', category: 'PC/ハードウェア', title: 'プリンターで印刷できない', description: '印刷ジョブが進まない、エラーが出る', solution: 'プリンタ接続確認、ドライバ再インストール、印刷キュークリア', keywords: 'プリンター,印刷,エラー,ジョブ' },
  { id: 'HD-034', category: 'PC/ハードウェア', title: 'PCの容量不足', description: 'ディスク容量が不足している', solution: '不要ファイル削除、ディスククリーンアップ、容量拡張', keywords: 'PC,容量不足,ディスク,ストレージ' },
  { id: 'HD-035', category: 'PC/ハードウェア', title: 'Bluetoothデバイスが接続できない', description: 'Bluetoothマウス・ヘッドセット等が接続できない', solution: 'Bluetooth設定確認、ペアリング再実行、ドライバ更新', keywords: 'Bluetooth,接続,ペアリング,デバイス' },

  // PC - ソフトウェア関連
  { id: 'HD-036', category: 'PC/ソフトウェア', title: 'Windowsアップデートのエラー', description: 'Windows Updateが失敗する', solution: 'トラブルシューティングツール実行、手動アップデート', keywords: 'Windows,アップデート,エラー,更新' },
  { id: 'HD-037', category: 'PC/ソフトウェア', title: 'アプリケーションがインストールできない', description: 'ソフトウェアのインストールに失敗する', solution: '管理者権限確認、既存バージョン削除、再試行', keywords: 'インストール,アプリケーション,エラー,ソフトウェア' },
  { id: 'HD-038', category: 'PC/ソフトウェア', title: 'アプリケーションが起動しない', description: '特定のアプリが開かない、クラッシュする', solution: '再インストール、互換性モード、アップデート確認', keywords: 'アプリケーション,起動しない,クラッシュ' },
  { id: 'HD-039', category: 'PC/ソフトウェア', title: 'ブルースクリーンエラー', description: 'PCがブルースクリーンで停止する', solution: 'エラーコード確認、ドライバ更新、ハードウェア診断', keywords: 'ブルースクリーン,BSOD,エラー,クラッシュ' },
  { id: 'HD-040', category: 'PC/ソフトウェア', title: 'ウイルス対策ソフトの警告', description: 'ウイルス対策ソフトで警告が出た', solution: 'スキャン実行、検疫確認、情報システム部に報告', keywords: 'ウイルス,セキュリティ,警告,マルウェア' },

  // ネットワーク関連
  { id: 'HD-041', category: 'ネットワーク', title: 'インターネットに接続できない', description: 'Webサイトが開けない、ネットワークエラー', solution: 'Wi-Fi接続確認、LANケーブル確認、ネットワーク再起動', keywords: 'インターネット,接続,ネットワーク,Wi-Fi' },
  { id: 'HD-042', category: 'ネットワーク', title: 'Wi-Fiが不安定', description: 'Wi-Fi接続が頻繁に切れる、速度が遅い', solution: 'ルーター再起動、チャネル変更、有線LAN使用', keywords: 'Wi-Fi,不安定,切れる,速度' },
  { id: 'HD-043', category: 'ネットワーク', title: 'VPN接続できない', description: 'リモートアクセスVPNに接続できない', solution: 'VPN設定確認、認証情報確認、ネットワーク管理者に連絡', keywords: 'VPN,接続,リモートアクセス,エラー' },
  { id: 'HD-044', category: 'ネットワーク', title: '社内共有フォルダにアクセスできない', description: 'ネットワークドライブや共有フォルダが開けない', solution: 'ネットワーク接続確認、ドライブ再マッピング、権限確認', keywords: '共有フォルダ,ネットワークドライブ,アクセス,権限' },
  { id: 'HD-045', category: 'ネットワーク', title: '特定のサイトにアクセスできない', description: '一部のWebサイトのみ開けない', solution: 'ファイアウォール確認、プロキシ設定、ブラウザキャッシュクリア', keywords: 'Webサイト,アクセス,ブロック,ファイアウォール' },

  // アプリケーション関連
  { id: 'HD-046', category: 'アプリケーション', title: 'Adobe Acrobat のライセンスエラー', description: 'Adobe製品でライセンスエラーが出る', solution: 'サインアウト・サインイン、ライセンス再認証', keywords: 'Adobe,Acrobat,ライセンス,エラー' },
  { id: 'HD-047', category: 'アプリケーション', title: 'Zoom会議に参加できない', description: 'Zoom会議リンクから参加できない', solution: 'アプリ最新版確認、ブラウザ変更、再起動', keywords: 'Zoom,会議,参加,エラー' },
  { id: 'HD-048', category: 'アプリケーション', title: 'Chrome が起動しない', description: 'Google Chrome が開かない', solution: 'キャッシュクリア、再インストール、プロファイル削除', keywords: 'Chrome,起動しない,ブラウザ' },
  { id: 'HD-049', category: 'アプリケーション', title: 'Excelファイルが開けない', description: 'Excelファイルをダブルクリックしても開かない', solution: 'ファイル関連付け確認、Excelの修復、新規作成で開く', keywords: 'Excel,ファイル,開けない' },
  { id: 'HD-050', category: 'アプリケーション', title: 'PDF が印刷できない', description: 'PDFファイルの印刷ができない', solution: '画像として印刷、別のPDFリーダー使用、プリンタドライバ更新', keywords: 'PDF,印刷,Acrobat,エラー' },

  // その他
  { id: 'HD-051', category: 'その他', title: '新しいPCのセットアップ依頼', description: '新規PC導入時の初期設定をしてほしい', solution: '申請フォーム提出、IT部門がセットアップ実施', keywords: 'PC,セットアップ,初期設定,新規' },
  { id: 'HD-052', category: 'その他', title: 'ソフトウェアライセンス購入依頼', description: '業務で必要なソフトウェアを購入したい', solution: '申請フォーム提出、承認後に購入・インストール', keywords: 'ソフトウェア,ライセンス,購入,申請' },
  { id: 'HD-053', category: 'その他', title: '退職者のデータ引き継ぎ', description: '退職者のメール・ファイルを引き継ぎたい', solution: '申請フォーム提出、承認後にデータ移行', keywords: '退職,データ,引き継ぎ,移行' },
  { id: 'HD-054', category: 'その他', title: 'セキュリティインシデント報告', description: '不審なメールを受信した、情報漏洩の可能性', solution: '即座に情報システム部に連絡、PCをネットワークから切断', keywords: 'セキュリティ,インシデント,不審,メール' },
  { id: 'HD-055', category: 'その他', title: 'システム障害の報告', description: '社内システムにアクセスできない', solution: '障害状況を報告、情報システム部が対応', keywords: 'システム障害,アクセス,エラー' }
];

// サンプルチケットデータ
const sampleTickets = [
  {
    id: 'TKT-2024-001',
    subject: 'メールが送信できない',
    type: 'インシデント',
    status: 'In Progress',
    priority: 'P1',
    impact: '部署',
    urgency: '高',
    requester: '山田太郎',
    assignee: '佐藤花子',
    created_at: '2024-01-15 09:30',
    due_at: '2024-01-15 10:30',
    category: 'Microsoft 365 / Exchange'
  },
  {
    id: 'TKT-2024-002',
    subject: 'ライセンス追加依頼',
    type: 'サービス要求',
    status: 'Pending Approval',
    priority: 'P3',
    impact: '個人',
    urgency: '中',
    requester: '鈴木一郎',
    assignee: '田中次郎',
    created_at: '2024-01-15 10:15',
    due_at: '2024-01-18 17:00',
    category: 'Microsoft 365 / ライセンス'
  },
  {
    id: 'TKT-2024-003',
    subject: 'Teamsで画面共有ができない',
    type: 'インシデント',
    status: 'Assigned',
    priority: 'P2',
    impact: '個人',
    urgency: '高',
    requester: '高橋美咲',
    assignee: '佐藤花子',
    created_at: '2024-01-15 11:00',
    due_at: '2024-01-15 12:00',
    category: 'Microsoft 365 / Teams'
  },
  {
    id: 'TKT-2024-004',
    subject: 'OneDrive容量不足',
    type: 'サービス要求',
    status: 'New',
    priority: 'P4',
    impact: '個人',
    urgency: '低',
    requester: '伊藤健一',
    assignee: null,
    created_at: '2024-01-15 13:45',
    due_at: '2024-01-16 13:45',
    category: 'Microsoft 365 / OneDrive'
  },
  {
    id: 'TKT-2024-005',
    subject: '退職者のメール転送設定',
    type: 'サービス要求',
    status: 'Pending Approval',
    priority: 'P2',
    impact: '部署',
    urgency: '中',
    requester: '人事部 渡辺',
    assignee: '田中次郎',
    created_at: '2024-01-15 14:20',
    due_at: '2024-01-16 14:20',
    category: 'Microsoft 365 / Exchange'
  },
  {
    id: 'TKT-2024-006',
    subject: 'PCが起動しない',
    type: 'インシデント',
    status: 'In Progress',
    priority: 'P1',
    impact: '個人',
    urgency: '即時',
    requester: '山田太郎',
    assignee: '佐藤花子',
    created_at: '2024-01-15 08:00',
    due_at: '2024-01-15 08:15',
    category: 'PC / ハードウェア'
  },
  {
    id: 'TKT-2024-007',
    subject: 'VPN接続できない',
    type: 'インシデント',
    status: 'Resolved',
    priority: 'P2',
    impact: '個人',
    urgency: '高',
    requester: '山田太郎',
    assignee: '佐藤花子',
    created_at: '2024-01-14 09:00',
    due_at: '2024-01-14 10:00',
    category: 'ネットワーク'
  }
];

const sampleM365Tasks = [
  {
    id: 'M365-001',
    ticket_id: 'TKT-2024-002',
    task_type: 'ライセンス付与',
    target_upn: 'suzuki.ichiro@company.com',
    target_resource: 'Microsoft 365 E5',
    state: 'Pending Approval',
    approver: '部門長 中村',
    approval_status: 'Requested'
  },
  {
    id: 'M365-002',
    ticket_id: 'TKT-2024-005',
    task_type: 'メール転送設定',
    target_upn: 'retired.user@company.com',
    target_resource: 'forward-to: watanabe@company.com',
    state: 'Pending Approval',
    approver: '部門長 中村',
    approval_status: 'Requested'
  }
];

const sampleKnowledge = [
  {
    id: 'KB-001',
    title: 'メールが送信できない場合のトラブルシューティング',
    category: 'Exchange',
    tags: ['メール', '送信エラー', 'Exchange'],
    views: 245,
    helpful: 38
  },
  {
    id: 'KB-002',
    title: 'Teamsで画面共有ができない場合の対処法',
    category: 'Teams',
    tags: ['Teams', '画面共有', 'トラブルシューティング'],
    views: 189,
    helpful: 42
  },
  {
    id: 'KB-003',
    title: 'OneDrive容量の確認と整理方法',
    category: 'OneDrive',
    tags: ['OneDrive', '容量', 'ストレージ'],
    views: 312,
    helpful: 56
  }
];

// ユーティリティ関数
const utils = {
  // ステータスに応じたバッジクラスを返す
  getStatusBadgeClass(status) {
    const statusMap = {
      'New': 'badge-new',
      'Triage': 'badge-triage',
      'Assigned': 'badge-assigned',
      'In Progress': 'badge-in-progress',
      'Pending Customer': 'badge-pending',
      'Pending Approval': 'badge-pending',
      'Pending Change Window': 'badge-pending',
      'Resolved': 'badge-resolved',
      'Closed': 'badge-closed'
    };
    return statusMap[status] || 'badge-secondary';
  },

  // 優先度に応じたバッジクラスを返す
  getPriorityBadgeClass(priority) {
    const priorityMap = {
      'P1': 'badge-p1',
      'P2': 'badge-p2',
      'P3': 'badge-p3',
      'P4': 'badge-p4'
    };
    return priorityMap[priority] || 'badge-secondary';
  },

  // 日付フォーマット
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  },

  // 期限までの残り時間を計算
  getTimeRemaining(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (diff < 0) {
      return { text: '期限超過', class: 'text-danger' };
    } else if (hours < 1) {
      return { text: `残り${minutes}分`, class: 'text-danger' };
    } else if (hours < 4) {
      return { text: `残り${hours}時間`, class: 'text-warning' };
    } else {
      return { text: `残り${hours}時間`, class: 'text-muted' };
    }
  },

  // モーダルを開く
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  // モーダルを閉じる
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // 通知を表示
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10000';
    notification.style.minWidth = '300px';

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
};

// チケット検索・フィルタリング
function filterTickets(tickets, filters) {
  return tickets.filter(ticket => {
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.assignee && ticket.assignee !== filters.assignee) return false;
    if (filters.search && !ticket.subject.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

// チケットテーブルを描画
function renderTicketTable(tickets, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">該当するチケットがありません</p>';
    return;
  }

  let html = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>チケットID</th>
            <th>件名</th>
            <th>ステータス</th>
            <th>優先度</th>
            <th>担当者</th>
            <th>期限</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
  `;

  tickets.forEach(ticket => {
    const timeRemaining = utils.getTimeRemaining(ticket.due_at);
    html += `
      <tr>
        <td><strong>${ticket.id}</strong></td>
        <td>
          <div>${ticket.subject}</div>
          <div class="text-xs text-muted">${ticket.category}</div>
        </td>
        <td><span class="badge ${utils.getStatusBadgeClass(ticket.status)}">${ticket.status}</span></td>
        <td><span class="badge ${utils.getPriorityBadgeClass(ticket.priority)}">${ticket.priority}</span></td>
        <td>${ticket.assignee || '<span class="text-muted">未割当</span>'}</td>
        <td><span class="${timeRemaining.class}">${timeRemaining.text}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="alert('チケット詳細: ${ticket.id}')">詳細</button>
        </td>
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

// モーダルイベントリスナーの設定
document.addEventListener('DOMContentLoaded', function() {
  // モーダルのクローズボタン
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', function() {
      const modal = this.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('active');
      }
    });
  });

  // モーダルのオーバーレイクリック
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  });
});
