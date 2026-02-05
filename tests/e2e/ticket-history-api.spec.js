/**
 * Ticket History API E2E Tests
 * Mirai HelpDesk Management System
 *
 * チケット履歴APIのE2Eテスト
 * 監査証跡の記録・取得を検証する
 */

import { test, expect } from '@playwright/test';
import {
  loginViaAPI,
  createTicket,
  cleanup,
  randomString,
  TEST_CONFIG
} from './helpers.js';

test.describe('チケット履歴APIのテスト', () => {
  let authToken;
  const createdTicketIds = [];

  // テスト前にログイン（API経由）
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

  test.describe('新規チケットの履歴API', () => {
    test('新規チケットの履歴取得が成功する（空配列）', async ({ request }) => {
      // チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `履歴テスト ${randomString()}`,
        description: '履歴記録テスト用チケット'
      });
      createdTicketIds.push(ticket.ticket_id);

      // 履歴を取得
      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBeTruthy();

      const history = body.data.history || body.data;
      expect(Array.isArray(history)).toBeTruthy();

      // チケット作成のみでは履歴レコードは生成されない
      // （履歴はステータス変更・割り当て等の操作時に記録される）
      expect(history.length).toBe(0);
    });
  });

  test.describe('ステータス変更時の履歴記録', () => {
    test('ステータス更新で変更前後の値が記録される', async ({ request }) => {
      // チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `ステータス履歴テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ステータスを更新（履歴記録付きエンドポイント /:id/status を使用）
      const updateResponse = await request.patch(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { status: 'in_progress' }
        }
      );
      expect(updateResponse.ok()).toBeTruthy();

      // 履歴を取得
      const historyResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(historyResponse.ok()).toBeTruthy();
      const body = await historyResponse.json();
      expect(body.success).toBeTruthy();

      const history = body.data.history || body.data;

      // ステータス変更の履歴を検索（action = 'status_change'）
      const statusChange = history.find(
        h => h.action === 'status_change' ||
             h.action === 'status_changed'
      );
      expect(statusChange).toBeDefined();
      expect(statusChange.actor_id).toBeDefined();
      expect(statusChange.created_at).toBeDefined();

      // 変更前後の値が記録されていることを確認（JSONB形式）
      const beforeVal = statusChange.before_value;
      const afterVal = statusChange.after_value;

      expect(beforeVal).toBeDefined();
      expect(afterVal).toBeDefined();

      // JSONB形式: { "status": "in_progress" }
      if (typeof afterVal === 'object' && afterVal !== null) {
        expect(afterVal.status).toBe('in_progress');
      } else if (typeof afterVal === 'string') {
        expect(afterVal).toContain('in_progress');
      }
    });

    test('複数回のステータス変更が全て記録される', async ({ request }) => {
      // チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `複数ステータス変更テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ステータスを複数回更新（/:id/status エンドポイント使用）
      // new -> in_progress
      await request.patch(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { status: 'in_progress' }
        }
      );

      // in_progress -> resolved
      await request.patch(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { status: 'resolved' }
        }
      );

      // 履歴を取得
      const historyResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(historyResponse.ok()).toBeTruthy();
      const body = await historyResponse.json();
      const history = body.data.history || body.data;

      // 2回のステータス変更 = 最低2件の履歴
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('履歴の整合性', () => {
    test('履歴エントリは時系列で返される（降順）', async ({ request }) => {
      // チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `時系列テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ステータスを複数回更新して履歴を生成（/:id/status使用）
      await request.patch(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { status: 'in_progress' }
        }
      );

      await request.patch(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { status: 'resolved' }
        }
      );

      // 履歴を取得
      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const history = body.data.history || body.data;

      // 少なくとも2件の履歴があること
      expect(history.length).toBeGreaterThanOrEqual(2);

      // コントローラはORDER BY created_at DESCで返す（降順）
      for (let i = 1; i < history.length; i++) {
        const prevDate = new Date(history[i - 1].created_at);
        const currDate = new Date(history[i].created_at);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });

    test('履歴には操作者情報が含まれる', async ({ request }) => {
      // チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `操作者テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ステータス変更して履歴を生成
      await request.patch(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { status: 'in_progress' }
        }
      );

      // 履歴を取得
      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const history = body.data.history || body.data;

      expect(history.length).toBeGreaterThan(0);

      // 各履歴エントリに操作者情報が含まれることを確認
      for (const entry of history) {
        expect(entry.actor_id).toBeDefined();
        expect(entry.actor_name).toBeDefined();
        expect(entry.created_at).toBeDefined();
        expect(entry.action).toBeDefined();
      }
    });
  });

  test.describe('認証・権限', () => {
    test('認証なしでの履歴取得は401エラー', async ({ request }) => {
      const ticket = await createTicket(request, authToken, {
        subject: `認証なし履歴テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/history`
      );

      expect(response.status()).toBe(401);
    });

    test('存在しないチケットの履歴取得は404エラー', async ({ request }) => {
      const fakeTicketId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${fakeTicketId}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe('チケット更新 → 履歴取得フロー', () => {
    test('完全なワークフロー: 作成→ステータス更新→コメント追加→履歴確認', async ({ request }) => {
      // 1. チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `完全ワークフローテスト ${randomString()}`,
        description: 'ワークフローテスト'
      });
      createdTicketIds.push(ticket.ticket_id);

      // 2. ステータスを更新（/:id/status エンドポイント使用 → 履歴記録される）
      await request.patch(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { status: 'in_progress' }
        }
      );

      // 3. コメントを追加
      await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            body: `ワークフローコメント ${randomString()}`,
            visibility: 'public'
          }
        }
      );

      // 4. 履歴を取得
      const historyResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(historyResponse.ok()).toBeTruthy();
      const body = await historyResponse.json();
      expect(body.success).toBeTruthy();

      const history = body.data.history || body.data;

      // ステータス更新で最低1件は記録されていること
      expect(history.length).toBeGreaterThanOrEqual(1);

      // ステータス変更の履歴が記録されていること
      const statusEntry = history.find(h => h.action === 'status_change');
      expect(statusEntry).toBeDefined();

      // 各エントリに必須フィールドがあることを確認
      for (const entry of history) {
        expect(entry.actor_id).toBeDefined();
        expect(entry.action).toBeDefined();
        expect(entry.created_at).toBeDefined();
      }
    });
  });
});
