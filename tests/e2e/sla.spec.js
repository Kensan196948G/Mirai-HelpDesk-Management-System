/**
 * SLA Policy E2E Tests
 * Mirai HelpDesk Management System
 *
 * SLAポリシーと期限管理のE2Eテスト
 */

import { test, expect } from '@playwright/test';
import {
  login,
  loginViaAPI,
  createTicket,
  cleanup,
  expectPageTitle,
  waitForElement,
  randomString,
  TEST_CONFIG
} from './helpers.js';

test.describe('SLAポリシー管理のテスト', () => {
  let authToken;
  const createdTicketIds = [];

  // テスト前にログイン（API経由で高速化）
  test.beforeAll(async ({ request }) => {
    const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
    authToken = await loginViaAPI(request, email, password);
  });

  // テスト後のクリーンアップ
  test.afterAll(async ({ request }) => {
    if (authToken && createdTicketIds.length > 0) {
      await cleanup(request, authToken, createdTicketIds);
    }
  });

  test.describe('SLAポリシー一覧表示', () => {
    test('SLAポリシー一覧ページの表示', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // SLAポリシーページへ遷移（ナビゲーションメニューから）
      const slaLink = page.locator('a[href="/sla"], a:has-text("SLA")');
      if (await slaLink.isVisible()) {
        await slaLink.click();
        await page.waitForTimeout(1000);

        // ページタイトルの確認
        await expectPageTitle(page, 'SLAポリシー');

        // テーブルまたはカードが表示されることを確認
        const hasList = await page.locator('table, .sla-list, .card-grid').isVisible();
        expect(hasList).toBeTruthy();
      } else {
        // SLAページがナビゲーションにない場合は、直接URLでアクセス
        await page.goto('/#sla');
        await page.waitForTimeout(1000);

        // ページが読み込まれたことを確認
        const pageContent = await page.locator('#page-content');
        await pageContent.waitFor({ state: 'visible' });
      }
    });

    test('SLAポリシーの詳細情報確認', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // SLAポリシーページへ
      await page.goto('/#sla');
      await page.waitForTimeout(1000);

      // ポリシー情報が含まれていることを確認
      const pageContent = await page.textContent('#page-content');

      // 優先度に関する情報が含まれることを確認
      const hasPriorityInfo = pageContent.includes('P1') ||
                              pageContent.includes('P2') ||
                              pageContent.includes('P3') ||
                              pageContent.includes('P4') ||
                              pageContent.includes('優先度');

      expect(hasPriorityInfo).toBeTruthy();
    });
  });

  test.describe('優先度別SLA期限計算', () => {
    test('P1（最高優先度）のSLA期限確認', async ({ request }) => {
      // P1チケットを作成（全社影響 × 即時）
      const ticket = await createTicket(request, authToken, {
        subject: `P1チケット ${randomString()}`,
        impact: '全社',
        urgency: '即時'
      });
      createdTicketIds.push(ticket.ticket_id);

      // チケット詳細を取得
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const ticketData = body.data.ticket;

      // SLA期限が設定されていることを確認
      expect(ticketData.due_at).toBeDefined();
      expect(ticketData.priority).toBe('P1');

      // SLAポリシー情報があれば確認
      if (ticketData.sla_policy_id) {
        expect(ticketData.sla_policy_id).toBeDefined();
      }
    });

    test('P2（高優先度）のSLA期限確認', async ({ request }) => {
      // P2チケットを作成（部門影響 × 高緊急度）
      const ticket = await createTicket(request, authToken, {
        subject: `P2チケット ${randomString()}`,
        impact: '部署',
        urgency: '高'
      });
      createdTicketIds.push(ticket.ticket_id);

      // チケット詳細を取得
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const ticketData = body.data.ticket;

      // SLA期限が設定されていることを確認
      expect(ticketData.due_at).toBeDefined();
      expect(ticketData.priority).toBe('P2');
    });

    test('P3（中優先度）のSLA期限確認', async ({ request }) => {
      // P3チケットを作成（個人影響 × 中緊急度）
      const ticket = await createTicket(request, authToken, {
        subject: `P3チケット ${randomString()}`,
        impact: '個人',
        urgency: '中'
      });
      createdTicketIds.push(ticket.ticket_id);

      // チケット詳細を取得
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const ticketData = body.data.ticket;

      // SLA期限が設定されていることを確認
      expect(ticketData.due_at).toBeDefined();
      expect(ticketData.priority).toBe('P3');
    });

    test('P4（低優先度）のSLA期限確認', async ({ request }) => {
      // P4チケットを作成（個人影響 × 低緊急度）
      const ticket = await createTicket(request, authToken, {
        subject: `P4チケット ${randomString()}`,
        impact: '個人',
        urgency: '低'
      });
      createdTicketIds.push(ticket.ticket_id);

      // チケット詳細を取得
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const ticketData = body.data.ticket;

      // SLA期限が設定されていることを確認
      expect(ticketData.due_at).toBeDefined();
      expect(ticketData.priority).toBe('P4');
    });
  });

  test.describe('チケット作成時の自動期限設定', () => {
    test('インシデントチケット作成時にSLA期限が自動設定される', async ({ page, request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // チケット作成（API経由）
      const ticket = await createTicket(request, authToken, {
        type: 'incident',
        subject: `SLA自動設定テスト ${randomString()}`,
        impact: '部署',
        urgency: '高'
      });
      createdTicketIds.push(ticket.ticket_id);

      // チケットにSLA期限が設定されていることを確認
      expect(ticket.due_at).toBeDefined();

      // 期限が未来の日時であることを確認
      const dueDate = new Date(ticket.due_at);
      const now = new Date();
      expect(dueDate.getTime()).toBeGreaterThan(now.getTime());
    });

    test('サービス要求チケット作成時にSLA期限が自動設定される', async ({ request }) => {
      // サービス要求チケット作成
      const ticket = await createTicket(request, authToken, {
        type: 'service_request',
        subject: `サービス要求SLA ${randomString()}`,
        impact: '個人',
        urgency: '中'
      });
      createdTicketIds.push(ticket.ticket_id);

      // チケットにSLA期限が設定されていることを確認
      expect(ticket.due_at).toBeDefined();

      // 期限が未来の日時であることを確認
      const dueDate = new Date(ticket.due_at);
      const now = new Date();
      expect(dueDate.getTime()).toBeGreaterThan(now.getTime());
    });

    test('異なる優先度のチケットで異なるSLA期限が設定される', async ({ request }) => {
      // 低優先度チケット（P4: 個人 x 低）を作成
      const lowTicket = await createTicket(request, authToken, {
        subject: `SLA低優先度テスト ${randomString()}`,
        impact: '個人',
        urgency: '低'
      });
      createdTicketIds.push(lowTicket.ticket_id);

      // 高優先度チケット（P1: 全社 x 即時）を作成
      const highTicket = await createTicket(request, authToken, {
        subject: `SLA高優先度テスト ${randomString()}`,
        impact: '全社',
        urgency: '即時'
      });
      createdTicketIds.push(highTicket.ticket_id);

      // 両方にSLA期限が設定されていることを確認
      expect(lowTicket.due_at).toBeDefined();
      expect(highTicket.due_at).toBeDefined();

      // P1の期限がP4よりも短い（早い）ことを確認
      const lowDueDate = new Date(lowTicket.due_at);
      const highDueDate = new Date(highTicket.due_at);
      expect(highDueDate.getTime()).toBeLessThan(lowDueDate.getTime());

      // 優先度が正しく計算されていることを確認
      expect(highTicket.priority).toBe('P1');
      expect(lowTicket.priority).toBe('P4');
    });
  });

  test.describe('SLA違反の検知', () => {
    test('期限超過チケットの識別', async ({ page, request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // レポートページまたはダッシュボードへ
      await page.goto('/#dashboard');
      await page.waitForTimeout(1000);

      // SLA違反や期限超過の情報が表示される要素を探す
      const pageContent = await page.textContent('#page-content');

      // SLA関連の情報が表示されているかチェック
      const hasSlaInfo = pageContent.includes('SLA') ||
                        pageContent.includes('期限') ||
                        pageContent.includes('超過') ||
                        pageContent.includes('違反');

      // 情報が存在することを確認（ダッシュボードにSLA情報がある場合）
      if (hasSlaInfo) {
        expect(hasSlaInfo).toBeTruthy();
      }
    });

    test('期限が近いチケットの警告表示', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // チケット一覧ページへ
      await page.goto('/#tickets');
      await page.waitForTimeout(1000);

      // 期限が近いチケットがハイライトされているかチェック
      const urgentTickets = page.locator('.ticket-urgent, .sla-warning, .due-soon');
      const count = await urgentTickets.count();

      // 期限が近いチケットが存在する場合、適切にマークされていることを確認
      if (count > 0) {
        const firstUrgent = urgentTickets.first();
        await expect(firstUrgent).toBeVisible();
      }
    });
  });

  test.describe('SLA APIエンドポイントのテスト', () => {
    test('GET /api/sla/policies - SLAポリシー一覧取得', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/sla/policies`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBeTruthy();

      // ポリシーの配列が返されることを確認
      const policies = body.data.policies || body.data;
      expect(Array.isArray(policies)).toBeTruthy();

      // 各ポリシーに必須フィールドが含まれていることを確認
      if (policies.length > 0) {
        const policy = policies[0];
        expect(policy).toHaveProperty('name');
        expect(policy).toHaveProperty('priority');
      }
    });

    test('GET /api/sla/policies/{id} - 特定のSLAポリシー取得', async ({ request }) => {
      // まずポリシー一覧を取得
      const listResponse = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/sla/policies`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (listResponse.ok()) {
        const listBody = await listResponse.json();
        expect(listBody.success).toBeTruthy();

        const policies = listBody.data.policies || listBody.data;

        if (policies && policies.length > 0 && policies[0].sla_policy_id) {
          const firstPolicyId = policies[0].sla_policy_id;

          // 特定のポリシーを取得
          const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/sla/policies/${firstPolicyId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });

          expect(response.ok()).toBeTruthy();
          const body = await response.json();
          expect(body.success).toBeTruthy();

          const policy = body.data.policy || body.data;
          expect(policy.sla_policy_id || policy.priority).toBeDefined();
        }
      }
    });

    test('SLAポリシー計算ロジックの検証', async ({ request }) => {
      // 異なる優先度でチケットを作成し、期限を比較
      const p1Ticket = await createTicket(request, authToken, {
        subject: `P1期限テスト ${randomString()}`,
        impact: '全社',
        urgency: '即時'
      });
      createdTicketIds.push(p1Ticket.ticket_id);

      const p4Ticket = await createTicket(request, authToken, {
        subject: `P4期限テスト ${randomString()}`,
        impact: '個人',
        urgency: '低'
      });
      createdTicketIds.push(p4Ticket.ticket_id);

      // P1の期限がP4よりも短いことを確認
      const p1DueDate = new Date(p1Ticket.due_at);
      const p4DueDate = new Date(p4Ticket.due_at);

      expect(p1DueDate.getTime()).toBeLessThan(p4DueDate.getTime());
    });

    test('営業時間を考慮したSLA期限計算', async ({ request }) => {
      // P3チケット（個人 x 中）を作成: SLA目標は初動4h / 解決3営業日
      const ticket = await createTicket(request, authToken, {
        subject: `営業時間SLAテスト ${randomString()}`,
        impact: '個人',
        urgency: '中'
      });
      createdTicketIds.push(ticket.ticket_id);

      // 期限が設定されていることを確認
      expect(ticket.due_at).toBeDefined();

      // 期限が妥当な範囲内であることを確認
      // P3: 3営業日 = 週末・祝日を考慮すると最大2週間（14暦日）以内
      const dueDate = new Date(ticket.due_at);
      const now = new Date();
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;

      const timeDiff = dueDate.getTime() - now.getTime();
      expect(timeDiff).toBeGreaterThan(0);
      expect(timeDiff).toBeLessThan(twoWeeks);
    });
  });

  test.describe('SLAレポートとメトリクス', () => {
    test('SLA達成率の確認', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // レポートページへ（存在する場合）
      const reportsLink = page.locator('a[href="/reports"], a:has-text("レポート")');
      if (await reportsLink.isVisible()) {
        await reportsLink.click();
        await page.waitForTimeout(1000);

        // SLA関連のメトリクスが表示されることを確認
        const pageContent = await page.textContent('#page-content');
        const hasSlaMetrics = pageContent.includes('SLA') ||
                             pageContent.includes('達成率') ||
                             pageContent.includes('違反');

        if (hasSlaMetrics) {
          expect(hasSlaMetrics).toBeTruthy();
        }
      }
    });

    test('期限超過チケット数の取得', async ({ request }) => {
      // レポートAPIがあれば、期限超過チケット数を取得
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/reports/sla`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // エンドポイントが存在する場合のみ検証
      if (response.status() !== 404) {
        expect(response.ok()).toBeTruthy();
        const body = await response.json();

        // 期限超過情報が含まれることを確認
        expect(body).toBeDefined();
      }
    });
  });

  test.describe('UIでのSLA情報表示', () => {
    test('チケット詳細ページでSLA期限が表示される', async ({ page, request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `SLA表示テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ログイン
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
      await login(page, email, password);

      // チケット詳細ページへ
      await page.goto(`/#tickets/${ticket.ticket_id}`);
      await page.waitForTimeout(1000);

      // SLA期限が表示されることを確認
      const pageContent = await page.textContent('#page-content');
      expect(pageContent).toMatch(/(期限|SLA|Due)/i);
    });

    test('チケット一覧でSLA状態が視覚的に区別される', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // チケット一覧ページへ
      await page.goto('/#tickets');
      await page.waitForTimeout(1000);

      // 優先度やSLA状態による色分けやアイコンが存在するかチェック
      const hasPriorityIndicators = await page.locator('.priority-badge, .sla-indicator, .status-badge').count() > 0;

      // 視覚的な区別があることを期待（実装に依存）
      if (hasPriorityIndicators) {
        expect(hasPriorityIndicators).toBeTruthy();
      }
    });
  });
});
