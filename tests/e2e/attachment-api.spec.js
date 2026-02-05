/**
 * Attachment API E2E Tests
 * Mirai HelpDesk Management System
 *
 * チケット添付ファイルAPIのE2Eテスト
 */

import { test, expect } from '@playwright/test';
import {
  loginViaAPI,
  createTicket,
  cleanup,
  randomString,
  TEST_CONFIG
} from './helpers.js';

test.describe('添付ファイルAPIのテスト', () => {
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

  test.describe('ファイルアップロード', () => {
    test('POST /api/tickets/{id}/attachments - テキストファイルのアップロード', async ({ request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `添付ファイルテスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // テスト用ファイルを作成
      const testContent = `テスト添付ファイル ${randomString()}`;
      const testFileName = `test-${randomString()}.txt`;

      // multipart/form-data でファイルをアップロード
      const response = await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          multipart: {
            files: {
              name: testFileName,
              mimeType: 'text/plain',
              buffer: Buffer.from(testContent, 'utf-8')
            }
          }
        }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBeTruthy();
      expect(body.data).toBeDefined();

      // コントローラは data.attachments (配列) で返す
      const attachments = body.data.attachments || [body.data.attachment].filter(Boolean);
      expect(attachments.length).toBeGreaterThan(0);

      const attachment = attachments[0];
      expect(attachment.attachment_id).toBeDefined();
      expect(attachment.filename || attachment.original_filename).toBeDefined();
      expect(attachment.ticket_id).toBe(ticket.ticket_id);
    });

    test('認証なしでのアップロードは401エラー', async ({ request }) => {
      const ticket = await createTicket(request, authToken, {
        subject: `認証なし添付テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      const response = await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          multipart: {
            files: {
              name: 'test.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from('test', 'utf-8')
            }
          }
        }
      );

      expect(response.status()).toBe(401);
    });
  });

  test.describe('添付ファイル一覧取得', () => {
    test('GET /api/tickets/{id}/attachments - 添付ファイル一覧を取得', async ({ request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `添付一覧テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ファイルをアップロード
      await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
          multipart: {
            files: {
              name: 'test-list.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from('テストファイル内容', 'utf-8')
            }
          }
        }
      );

      // 添付ファイル一覧を取得
      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBeTruthy();

      const attachments = body.data.attachments || body.data;
      expect(Array.isArray(attachments)).toBeTruthy();
      expect(attachments.length).toBeGreaterThan(0);

      // 添付ファイル情報の検証
      const attachment = attachments[0];
      expect(attachment.attachment_id).toBeDefined();
      expect(attachment.filename).toBeDefined();
    });

    test('添付ファイルがないチケットは空配列を返す', async ({ request }) => {
      // テスト用チケットを作成（添付なし）
      const ticket = await createTicket(request, authToken, {
        subject: `空添付テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // 添付ファイル一覧を取得
      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBeTruthy();

      const attachments = body.data.attachments || body.data;
      expect(Array.isArray(attachments)).toBeTruthy();
      expect(attachments.length).toBe(0);
    });
  });

  test.describe('添付ファイルダウンロード', () => {
    test('GET /api/tickets/{id}/attachments/{attachmentId} - ファイルダウンロード', async ({ request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `ダウンロードテスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ファイルをアップロード
      const testContent = `ダウンロードテスト ${randomString()}`;
      const uploadResponse = await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
          multipart: {
            files: {
              name: 'download-test.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from(testContent, 'utf-8')
            }
          }
        }
      );

      expect(uploadResponse.ok()).toBeTruthy();
      const uploadBody = await uploadResponse.json();
      const uploadedAttachments = uploadBody.data.attachments || [uploadBody.data.attachment].filter(Boolean);
      const attachmentId = uploadedAttachments[0].attachment_id;

      // ファイルをダウンロード
      const downloadResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments/${attachmentId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(downloadResponse.ok()).toBeTruthy();

      // Content-Dispositionヘッダーの確認
      const contentDisposition = downloadResponse.headers()['content-disposition'];
      if (contentDisposition) {
        expect(contentDisposition).toContain('download-test.txt');
      }
    });

    test('存在しない添付ファイルIDでのダウンロードは404', async ({ request }) => {
      const ticket = await createTicket(request, authToken, {
        subject: `404ダウンロードテスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      const fakeAttachmentId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments/${fakeAttachmentId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe('添付ファイル削除', () => {
    test('DELETE /api/tickets/{id}/attachments/{attachmentId} - ファイル削除', async ({ request }) => {
      // テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `削除テスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // ファイルをアップロード
      const uploadResponse = await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
          multipart: {
            files: {
              name: 'delete-test.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from('削除テスト', 'utf-8')
            }
          }
        }
      );

      expect(uploadResponse.ok()).toBeTruthy();
      const uploadBody = await uploadResponse.json();
      const uploadedAttachments = uploadBody.data.attachments || [uploadBody.data.attachment].filter(Boolean);
      const attachmentId = uploadedAttachments[0].attachment_id;

      // ファイルを削除
      const deleteResponse = await request.delete(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments/${attachmentId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(deleteResponse.ok()).toBeTruthy();
      const deleteBody = await deleteResponse.json();
      expect(deleteBody.success).toBeTruthy();

      // 削除後、一覧に含まれないことを確認
      const listResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      const listBody = await listResponse.json();
      const attachments = listBody.data.attachments || listBody.data;
      const deleted = attachments.find(a => a.attachment_id === attachmentId);
      expect(deleted).toBeUndefined();
    });
  });

  test.describe('アップロード → 一覧取得 → ダウンロード → 削除フロー', () => {
    test('添付ファイルの完全ライフサイクル', async ({ request }) => {
      // 1. テスト用チケットを作成
      const ticket = await createTicket(request, authToken, {
        subject: `ライフサイクルテスト ${randomString()}`
      });
      createdTicketIds.push(ticket.ticket_id);

      // 2. ファイルをアップロード
      const testContent = `ライフサイクルテスト内容 ${Date.now()}`;
      const uploadResponse = await request.post(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
          multipart: {
            files: {
              name: 'lifecycle-test.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from(testContent, 'utf-8')
            }
          }
        }
      );

      expect(uploadResponse.ok()).toBeTruthy();
      const uploadBody = await uploadResponse.json();
      const uploadedAttachments = uploadBody.data.attachments || [uploadBody.data.attachment].filter(Boolean);
      const attachmentId = uploadedAttachments[0].attachment_id;

      // 3. 一覧取得で確認
      const listResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(listResponse.ok()).toBeTruthy();
      const listBody = await listResponse.json();
      const attachments = listBody.data.attachments || listBody.data;
      const found = attachments.find(a => a.attachment_id === attachmentId);
      expect(found).toBeDefined();

      // 4. ダウンロード
      const downloadResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments/${attachmentId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(downloadResponse.ok()).toBeTruthy();

      // 5. 削除
      const deleteResponse = await request.delete(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments/${attachmentId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      expect(deleteResponse.ok()).toBeTruthy();

      // 6. 削除後に一覧が空であることを確認
      const finalListResponse = await request.get(
        `${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticket.ticket_id}/attachments`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      const finalListBody = await finalListResponse.json();
      const finalAttachments = finalListBody.data.attachments || finalListBody.data;
      const notFound = finalAttachments.find(a => a.attachment_id === attachmentId);
      expect(notFound).toBeUndefined();
    });
  });
});
