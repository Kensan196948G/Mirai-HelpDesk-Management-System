/**
 * SLA計算エンジン テスト例
 *
 * 実際のテストフレームワーク（Jest等）を使用する場合の参考実装
 */

import { SLAService } from './sla.service';
import { PriorityLevel } from '../types';

// テスト用のサンプルチケット
const sampleTickets = [
  {
    ticket_id: 'ticket-1',
    ticket_number: 'INC-001',
    type: 'incident' as const,
    subject: 'システム障害',
    description: 'システムが停止しています',
    status: 'resolved' as const,
    priority: PriorityLevel.P1,
    impact: '全社' as const,
    urgency: '即時' as const,
    requester_id: 'user-1',
    created_at: new Date('2026-01-20T09:00:00'),
    updated_at: new Date('2026-01-20T09:30:00'),
    assigned_at: new Date('2026-01-20T09:10:00'), // 10分後に割当（SLA内）
    resolved_at: new Date('2026-01-20T10:30:00'), // 1.5時間後に解決（SLA内）
    response_due_at: new Date('2026-01-20T09:15:00'), // 15分以内
    due_at: new Date('2026-01-20T11:00:00'), // 2時間以内
  },
  {
    ticket_id: 'ticket-2',
    ticket_number: 'SR-001',
    type: 'service_request' as const,
    subject: 'アカウント作成依頼',
    description: '新入社員のアカウントを作成してください',
    status: 'resolved' as const,
    priority: PriorityLevel.P3,
    impact: '個人' as const,
    urgency: '中' as const,
    requester_id: 'user-2',
    created_at: new Date('2026-01-20T10:00:00'),
    updated_at: new Date('2026-01-21T14:00:00'),
    assigned_at: new Date('2026-01-20T13:00:00'), // 3営業時間後（SLA内）
    resolved_at: new Date('2026-01-21T14:00:00'), // 営業時間で計算
    response_due_at: new Date('2026-01-20T14:00:00'), // 4営業時間以内
    due_at: new Date('2026-01-23T13:00:00'), // 3営業日以内
  },
  {
    ticket_id: 'ticket-3',
    ticket_number: 'INC-002',
    type: 'incident' as const,
    subject: 'ネットワーク遅延',
    description: 'ネットワークが遅いです',
    status: 'in_progress' as const,
    priority: PriorityLevel.P2,
    impact: '部署' as const,
    urgency: '高' as const,
    requester_id: 'user-3',
    created_at: new Date('2026-01-20T14:00:00'),
    updated_at: new Date('2026-01-20T14:30:00'),
    assigned_at: new Date('2026-01-20T14:30:00'),
    response_due_at: new Date('2026-01-20T15:00:00'), // 1営業時間以内
    due_at: new Date('2026-01-21T13:00:00'), // 8営業時間以内
  },
];

/**
 * テスト実行例
 */
function runTests() {
  console.log('=== SLA計算エンジン テスト ===\n');

  // テスト1: 期限計算
  console.log('【テスト1】期限計算');
  const createdAt = new Date('2026-01-20T10:00:00');
  Object.values(PriorityLevel).forEach((priority) => {
    const { response_due_at, due_at } = SLAService.calculateDueDates(priority, createdAt);
    const policy = SLAService.getSLAPolicy(priority);
    console.log(`${priority}:`);
    console.log(`  作成日時: ${createdAt.toLocaleString('ja-JP')}`);
    console.log(`  初動期限: ${response_due_at.toLocaleString('ja-JP')}`);
    console.log(`  解決期限: ${due_at.toLocaleString('ja-JP')}`);
    console.log(`  営業時間考慮: ${policy.businessHoursOnly ? 'あり' : 'なし'}`);
    console.log('');
  });

  // テスト2: 期限超過チェック
  console.log('【テスト2】期限超過チェック');
  sampleTickets.forEach((ticket: any) => {
    const isOverdue = SLAService.isOverdue(ticket);
    console.log(`${ticket.ticket_number}: ${isOverdue ? '超過' : '正常'}`);
  });
  console.log('');

  // テスト3: SLA達成状況
  console.log('【テスト3】SLA達成状況');
  sampleTickets.forEach((ticket: any) => {
    const status = SLAService.getSLAStatus(ticket);
    console.log(`${ticket.ticket_number}:`);
    console.log(`  初動対応: ${status.responseMetSLA === null ? '未評価' : status.responseMetSLA ? '達成' : '未達成'}`);
    console.log(`  解決: ${status.resolutionMetSLA === null ? '未評価' : status.resolutionMetSLA ? '達成' : '未達成'}`);
    console.log(`  超過中: ${status.isOverdue ? 'はい' : 'いいえ'}`);
    console.log('');
  });

  // テスト4: SLAメトリクス
  console.log('【テスト4】SLAメトリクス');
  const metrics = SLAService.calculateSLAMetrics(sampleTickets as any);
  console.log('全体:');
  console.log(`  総チケット数: ${metrics.total}`);
  console.log(`  初動対応達成: ${metrics.responseMetCount}件 (${metrics.responseMetRate}%)`);
  console.log(`  解決達成: ${metrics.resolutionMetCount}件 (${metrics.resolutionMetRate}%)`);
  console.log(`  超過中: ${metrics.overdueCount}件 (${metrics.overdueRate}%)`);
  console.log('');

  console.log('優先度別:');
  Object.entries(metrics.byPriority).forEach(([priority, data]) => {
    if (data.total > 0) {
      console.log(`${priority}:`);
      console.log(`  総数: ${data.total}件`);
      console.log(`  初動対応達成率: ${data.responseMetRate}%`);
      console.log(`  解決達成率: ${data.resolutionMetRate}%`);
    }
  });
  console.log('');

  // テスト5: SLAポリシー取得
  console.log('【テスト5】SLAポリシー定義');
  const policies = SLAService.getAllSLAPolicies();
  Object.entries(policies).forEach(([priority, policy]) => {
    console.log(`${priority}:`);
    console.log(`  初動対応: ${policy.responseMinutes}分`);
    console.log(`  解決: ${policy.resolutionMinutes}分`);
    console.log(`  営業時間考慮: ${policy.businessHoursOnly ? 'あり' : 'なし'}`);
    console.log('');
  });
}

// テスト実行（直接実行する場合）
if (require.main === module) {
  runTests();
}

export { runTests };
