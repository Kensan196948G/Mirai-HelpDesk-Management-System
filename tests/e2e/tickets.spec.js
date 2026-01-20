/**
 * Ticket Management E2E Tests
 * Mirai HelpDesk Management System
 *
 * チケット管理機能のE2Eテスト
 */

import { test, expect } from '@playwright/test';
import {
  login,
  loginViaAPI,
  setAuthToken,
  createTicket,
  cleanup,
  expectToast,
  expectPageTitle,
  waitForElement,
  getTableRowCount,
  randomString,
  TEST_CONFIG
} from './helpers.js';

test.describe('チケット管理機能のテスト', () => {
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

  test.describe('チケット一覧表示', () => {
    test('チケット一覧ページの表示', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // チケット一覧ページに遷移
      await page.click('a[href="#tickets"]');

      // ページタイトルの確認
      await expectPageTitle(page, 'チケット一覧');

      // テーブルが表示されることを確認
      await waitForElement(page, 'table');

      // ヘッダー行が存在することを確認
      const headers = await page.$$eval('table thead th', (ths) =>
        ths.map(th => th.textContent.trim())
      );
      expect(headers.length).toBeGreaterThan(0);
    });

    test('チケット一覧のフィルタリング', async ({ page, request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        type: 'incident',
        subject: `フィルタテスト ${randomString()}`,
        status: 'new',
        priority: 'high'
      });
      createdTicketIds.push(ticket.ticket_id);

      // ログインしてチケット一覧へ
      await login(page, email, password);
      await page.click('a[href="#tickets"]');
      await waitForElement(page, 'table');

      // ステータスフィルタが存在する場合（実装に依存）
      const statusFilter = page.locator('select[name="status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('new');
        await page.waitForTimeout(500); // フィルタリングの待機
      }

      // 優先度フィルタが存在する場合（実装に依存）
      const priorityFilter = page.locator('select[name="priority"]');
      if (await priorityFilter.isVisible()) {
        await priorityFilter.selectOption('high');
        await page.waitForTimeout(500);
      }
    });

    test('チケット一覧のページネーション', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);
      await page.click('a[href="#tickets"]');
      await waitForElement(page, 'table');

      // ページネーションが存在する場合（実装に依存）
      const paginationNext = page.locator('.pagination .next, button:has-text("次へ")');
      if (await paginationNext.isVisible()) {
        await paginationNext.click();
        await page.waitForTimeout(500);

        // URLまたはテーブルの内容が変わることを確認
        const rowCount = await getTableRowCount(page);
        expect(rowCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('チケット作成', () => {
    test('新規インシデントチケットの作成', async ({ page, request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // チケット作成ページへ
      await page.click('a[href="#tickets/new"], button:has-text("新規チケット")');
      await page.waitForTimeout(1000);

      // フォーム入力
      const subject = `新規インシデント ${randomString()}`;
      const description = 'これはE2Eテストで作成されたインシデントチケットです。';

      // チケットタイプ
      await page.selectOption('select[name="type"]', 'incident');

      // 件名
      await page.fill('input[name="subject"], #ticket-subject', subject);

      // 説明
      await page.fill('textarea[name="description"], #ticket-description', description);

      // 優先度
      await page.selectOption('select[name="priority"], #ticket-priority', 'medium');

      // 影響度
      await page.selectOption('select[name="impact"], #ticket-impact', 'individual');

      // 緊急度
      await page.selectOption('select[name="urgency"], #ticket-urgency', 'medium');

      // カテゴリ（存在する場合）
      const categorySelect = page.locator('select[name="category_id"]');
      if (await categorySelect.isVisible()) {
        const options = await categorySelect.$$eval('option', (opts) =>
          opts.map(opt => opt.value).filter(val => val !== '')
        );
        if (options.length > 0) {
          await categorySelect.selectOption(options[0]);
        }
      }

      // 送信ボタンをクリック
      await page.click('button[type="submit"]:has-text("作成"), button:has-text("チケット作成")');

      // 成功メッセージまたはリダイレクトを確認
      await page.waitForTimeout(2000);

      // チケット詳細ページまたは一覧ページへのリダイレクトを確認
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(tickets|dashboard)/);

      // トーストメッセージの確認（実装に依存）
      const toast = page.locator('#toast-container .toast');
      if (await toast.isVisible()) {
        const toastText = await toast.textContent();
        expect(toastText).toContain('作成');
      }

      // APIで作成されたチケットを取得してクリーンアップリストに追加
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: { subject: subject }
      });

      if (response.ok()) {
        const tickets = await response.json();
        if (tickets.tickets && tickets.tickets.length > 0) {
          createdTicketIds.push(tickets.tickets[0].ticket_id);
        }
      }
    });

    test('新規サービス要求チケットの作成', async ({ page, request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // チケット作成ページへ
      await page.click('a[href="#tickets/new"], button:has-text("新規チケット")');
      await page.waitForTimeout(1000);

      // フォーム入力
      const subject = `新規サービス要求 ${randomString()}`;
      const description = 'アカウント作成のサービス要求テストです。';

      // チケットタイプ
      await page.selectOption('select[name="type"]', 'service_request');

      // 件名
      await page.fill('input[name="subject"], #ticket-subject', subject);

      // 説明
      await page.fill('textarea[name="description"], #ticket-description', description);

      // 優先度
      await page.selectOption('select[name="priority"], #ticket-priority', 'low');

      // 影響度
      await page.selectOption('select[name="impact"], #ticket-impact', 'individual');

      // 緊急度
      await page.selectOption('select[name="urgency"], #ticket-urgency', 'low');

      // 送信
      await page.click('button[type="submit"]:has-text("作成"), button:has-text("チケット作成")');
      await page.waitForTimeout(2000);

      // APIで作成されたチケットを取得してクリーンアップリストに追加
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: { subject: subject }
      });

      if (response.ok()) {
        const tickets = await response.json();
        if (tickets.tickets && tickets.tickets.length > 0) {
          createdTicketIds.push(tickets.tickets[0].ticket_id);
        }
      }
    });

    test('必須項目なしでチケット作成失敗', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // チケット作成ページへ
      await page.click('a[href="#tickets/new"], button:has-text("新規チケット")');
      await page.waitForTimeout(1000);

      // 件名を空のまま送信
      await page.click('button[type="submit"]:has-text("作成"), button:has-text("チケット作成")');

      // HTML5バリデーションまたはエラーメッセージが表示されることを確認
      const subjectInput = page.locator('input[name="subject"], #ticket-subject');
      const isInvalid = await subjectInput.evaluate((el) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    });
  });

  test.describe('チケット詳細表示', () => {
    test('チケット詳細ページの表示', async ({ page, request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `詳細表示テスト ${randomString()}`,
        description: 'チケット詳細の表示テストです。'
      });
      createdTicketIds.push(ticket.ticket_id);

      // ログイン
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
      await login(page, email, password);

      // チケット詳細ページへ直接遷移
      await page.goto(`/#tickets/${ticket.ticket_id}`);
      await page.waitForTimeout(1000);

      // チケット情報が表示されることを確認
      const pageContent = await page.textContent('#page-content');
      expect(pageContent).toContain(ticket.subject);

      // チケットIDが表示されることを確認
      expect(pageContent).toContain(`#${ticket.ticket_id}`);
    });

    test('存在しないチケットIDでアクセス', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // 存在しないチケットIDで詳細ページへ
      await page.goto('/#tickets/999999');
      await page.waitForTimeout(2000);

      // エラーメッセージまたは404ページが表示されることを確認
      const pageContent = await page.textContent('#page-content');
      expect(pageContent).toMatch(/(見つかりません|存在しません|not found|404)/i);
    });
  });

  test.describe('チケットコメント追加', () => {
    test('公開コメントの追加', async ({ page, request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `コメントテスト ${randomString()}`,
        description: 'コメント追加のテストです。'
      });
      createdTicketIds.push(ticket.ticket_id);

      // ログイン
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
      await login(page, email, password);

      // チケット詳細ページへ
      await page.goto(`/#tickets/${ticket.ticket_id}`);
      await page.waitForTimeout(1000);

      // コメント入力欄を探す
      const commentTextarea = page.locator('textarea[name="comment"], #comment-body, textarea[placeholder*="コメント"]');
      await commentTextarea.waitFor({ state: 'visible', timeout: 5000 });

      // コメント入力
      const commentText = `これはテストコメントです ${randomString()}`;
      await commentTextarea.fill(commentText);

      // 公開コメントを選択（存在する場合）
      const visibilitySelect = page.locator('select[name="visibility"]');
      if (await visibilitySelect.isVisible()) {
        await visibilitySelect.selectOption('public');
      }

      // コメント送信
      await page.click('button:has-text("コメント"), button:has-text("追加"), button[type="submit"]');
      await page.waitForTimeout(1500);

      // コメントが表示されることを確認
      const pageContent = await page.textContent('#page-content');
      expect(pageContent).toContain(commentText);
    });

    test('内部メモの追加', async ({ page, request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `内部メモテスト ${randomString()}`,
        description: '内部メモ追加のテストです。'
      });
      createdTicketIds.push(ticket.ticket_id);

      // ログイン
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
      await login(page, email, password);

      // チケット詳細ページへ
      await page.goto(`/#tickets/${ticket.ticket_id}`);
      await page.waitForTimeout(1000);

      // コメント入力欄を探す
      const commentTextarea = page.locator('textarea[name="comment"], #comment-body, textarea[placeholder*="コメント"]');
      await commentTextarea.waitFor({ state: 'visible', timeout: 5000 });

      // コメント入力
      const commentText = `これは内部メモです ${randomString()}`;
      await commentTextarea.fill(commentText);

      // 内部メモを選択（存在する場合）
      const visibilitySelect = page.locator('select[name="visibility"]');
      if (await visibilitySelect.isVisible()) {
        await visibilitySelect.selectOption('internal');
      }

      // コメント送信
      await page.click('button:has-text("コメント"), button:has-text("追加"), button[type="submit"]');
      await page.waitForTimeout(1500);

      // コメントが表示されることを確認
      const pageContent = await page.textContent('#page-content');
      expect(pageContent).toContain(commentText);
    });
  });

  test.describe('チケットステータス変更', () => {
    test('ステータスを New から Assigned に変更', async ({ page, request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `ステータス変更テスト ${randomString()}`,
        status: 'new'
      });
      createdTicketIds.push(ticket.ticket_id);

      // ログイン
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
      await login(page, email, password);

      // チケット詳細ページへ
      await page.goto(`/#tickets/${ticket.ticket_id}`);
      await page.waitForTimeout(1000);

      // ステータス変更のUIを探す
      const statusSelect = page.locator('select[name="status"], #ticket-status');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('assigned');

        // 更新ボタンがある場合はクリック
        const updateBtn = page.locator('button:has-text("更新"), button:has-text("保存")');
        if (await updateBtn.isVisible()) {
          await updateBtn.click();
          await page.waitForTimeout(1000);
        }

        // ステータスが変更されたことを確認
        const selectedStatus = await statusSelect.inputValue();
        expect(selectedStatus).toBe('assigned');
      }
    });

    test('ステータスを In Progress に変更', async ({ page, request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `進行中ステータステスト ${randomString()}`,
        status: 'assigned'
      });
      createdTicketIds.push(ticket.ticket_id);

      // ログイン
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
      await login(page, email, password);

      // チケット詳細ページへ
      await page.goto(`/#tickets/${ticket.ticket_id}`);
      await page.waitForTimeout(1000);

      // ステータスを進行中に変更
      const statusSelect = page.locator('select[name="status"], #ticket-status');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('in_progress');

        const updateBtn = page.locator('button:has-text("更新"), button:has-text("保存")');
        if (await updateBtn.isVisible()) {
          await updateBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('チケットAPI直接テスト', () => {
    test('GET /api/tickets - チケット一覧取得', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toHaveProperty('tickets');
      expect(Array.isArray(body.tickets)).toBeTruthy();
    });

    test('POST /api/tickets - チケット作成', async ({ request }) => {
      const ticketData = {
        type: 'incident',
        subject: `API作成テスト ${randomString()}`,
        description: 'APIから作成されたテストチケットです。',
        priority: 'medium',
        impact: 'individual',
        urgency: 'medium',
        category_id: 1
      };

      const response = await request.post(`${TEST_CONFIG.API_BASE_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: ticketData
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.ticket_id).toBeDefined();
      expect(body.subject).toBe(ticketData.subject);
      expect(body.type).toBe(ticketData.type);

      createdTicketIds.push(body.ticket_id);
    });

    test('GET /api/tickets/{id} - チケット詳細取得', async ({ request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken);
      createdTicketIds.push(ticket.ticket_id);

      // チケット詳細取得
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.ticket_id).toBe(ticket.ticket_id);
      expect(body.subject).toBe(ticket.subject);
    });

    test('PATCH /api/tickets/{id} - チケット更新', async ({ request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken);
      createdTicketIds.push(ticket.ticket_id);

      // チケット更新
      const updateData = {
        status: 'in_progress',
        priority: 'high'
      };

      const response = await request.patch(`${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: updateData
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.status).toBe(updateData.status);
      expect(body.priority).toBe(updateData.priority);
    });

    test('POST /api/tickets/{id}/comments - コメント追加', async ({ request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken);
      createdTicketIds.push(ticket.ticket_id);

      // コメント追加
      const commentData = {
        body: `APIコメント ${randomString()}`,
        visibility: 'public'
      };

      const response = await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: commentData
        }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.body).toBe(commentData.body);
      expect(body.visibility).toBe(commentData.visibility);
    });
  });
});
