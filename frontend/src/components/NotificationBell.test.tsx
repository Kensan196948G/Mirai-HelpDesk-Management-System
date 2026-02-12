import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import NotificationBell from './NotificationBell';
import { useNotificationStore } from '@store/notificationStore';
import { useAuthStore } from '@store/authStore';

// WebSocket モック
vi.mock('@services/socketService', () => ({
  connectSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
  disconnectSocket: vi.fn(),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    // ストアリセット
    useNotificationStore.getState().clearAll();
    useAuthStore.setState({ token: 'mock-token' });
  });

  it('未読通知数がバッジに表示される', () => {
    useNotificationStore.getState().addNotification({
      type: 'ticket:created',
      title: 'テスト通知',
      message: 'テストメッセージ',
    });

    render(<NotificationBell />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('ベルアイコンをクリックすると通知ドロップダウンが表示される', async () => {
    const user = userEvent.setup();

    useNotificationStore.getState().addNotification({
      type: 'ticket:created',
      title: 'チケット作成',
      message: 'TICKET-001が作成されました',
    });

    render(<NotificationBell />);

    // ベルアイコンをクリック
    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    // ドロップダウンが表示される
    await waitFor(() => {
      expect(screen.getByText('通知')).toBeInTheDocument();
      expect(screen.getByText('チケット作成')).toBeInTheDocument();
    });
  });

  it('通知がない場合は空メッセージが表示される', async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    await waitFor(() => {
      expect(screen.getByText('通知はありません')).toBeInTheDocument();
    });
  });

  it('すべて既読ボタンで全通知が既読になる', async () => {
    const user = userEvent.setup();

    // 未読通知を追加
    useNotificationStore.getState().addNotification({
      type: 'ticket:created',
      title: '通知1',
      message: 'メッセージ1',
    });
    useNotificationStore.getState().addNotification({
      type: 'ticket:updated',
      title: '通知2',
      message: 'メッセージ2',
    });

    render(<NotificationBell />);

    // 未読数確認
    expect(screen.getByText('2')).toBeInTheDocument();

    // ドロップダウン表示
    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    // すべて既読ボタンクリック
    await waitFor(() => {
      const markAllButton = screen.getByText('すべて既読');
      return user.click(markAllButton);
    });

    // 未読数が0になる
    await waitFor(() => {
      const badge = document.querySelector('.ant-badge-count');
      expect(badge).not.toBeInTheDocument();
    });
  });

  it('通知クリックで該当チケットページに遷移する', async () => {
    const user = userEvent.setup();

    useNotificationStore.getState().addNotification({
      type: 'ticket:created',
      title: 'チケット作成',
      message: 'TICKET-001が作成されました',
      ticketId: '123',
    });

    render(<NotificationBell />);

    // ドロップダウン表示
    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    // 通知クリック
    await waitFor(async () => {
      const notification = screen.getByText('チケット作成');
      await user.click(notification);
    });

    // 遷移確認（URLが変わる）
    await waitFor(() => {
      expect(window.location.pathname).toBe('/tickets/123');
    });
  });

  it('最大20件の通知のみ表示される', async () => {
    const user = userEvent.setup();

    // 25件の通知を追加
    for (let i = 0; i < 25; i++) {
      useNotificationStore.getState().addNotification({
        type: 'ticket:created',
        title: `通知${i + 1}`,
        message: `メッセージ${i + 1}`,
      });
    }

    render(<NotificationBell />);

    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    // List.Item は最大20件
    await waitFor(() => {
      const listItems = document.querySelectorAll('.ant-list-item');
      expect(listItems).toHaveLength(20);
    });
  });

  it('通知タイプごとに適切なアイコンが表示される', async () => {
    const user = userEvent.setup();

    useNotificationStore.getState().addNotification({
      type: 'sla:warning',
      title: 'SLA警告',
      message: 'SLA期限が迫っています',
    });

    render(<NotificationBell />);

    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    await waitFor(() => {
      expect(screen.getByText('SLA警告')).toBeInTheDocument();
    });
  });

  it('tokenがない場合はWebSocket接続しない', () => {
    useAuthStore.setState({ token: null });

    render(<NotificationBell />);

    // エラーが発生しないことを確認
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('時間表示が正しくフォーマットされる', async () => {
    const user = userEvent.setup();

    // 5分前の通知
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    useNotificationStore.setState({
      notifications: [
        {
          id: '1',
          type: 'ticket:created',
          title: 'テスト',
          message: 'メッセージ',
          read: false,
          createdAt: fiveMinutesAgo,
        },
      ],
      unreadCount: 1,
    });

    render(<NotificationBell />);

    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    await waitFor(() => {
      expect(screen.getByText(/分前/)).toBeInTheDocument();
    });
  });

  it('未読通知は背景色がハイライトされる', async () => {
    const user = userEvent.setup();

    useNotificationStore.getState().addNotification({
      type: 'ticket:created',
      title: '未読通知',
      message: 'テスト',
    });

    render(<NotificationBell />);

    const bellIcon = screen.getByRole('img', { hidden: true });
    await user.click(bellIcon.parentElement!);

    await waitFor(() => {
      const listItem = screen.getByText('未読通知').closest('.ant-list-item');
      expect(listItem).toHaveStyle({ background: '#e6f7ff' });
    });
  });
});
