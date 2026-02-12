import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import TicketDetail from './TicketDetail';
import { useAuthStore } from '@store/authStore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// WebSocket モック
vi.mock('@hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

// カスタムレンダラー（パラメータ付きルート）
const renderWithRouter = (ticketId: string) => {
  useAuthStore.setState({
    token: 'mock-token',
    user: { user_id: '1', name: 'Test User', email: 'test@example.com', role: 'Agent' },
  });

  return render(
    <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('TicketDetail', () => {
  it('チケット詳細が表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
      expect(screen.getByText('テストチケット詳細')).toBeInTheDocument();
    });
  });

  it('ローディング中はスピナーが表示される', () => {
    renderWithRouter('1');

    expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
  });

  it('ステータスタグが表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('新規')).toBeInTheDocument();
    });
  });

  it('優先度タグが表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('P2')).toBeInTheDocument();
    });
  });

  it('コメント追加機能が動作する', async () => {
    const user = userEvent.setup();

    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    // コメント入力
    const textarea = screen.getByPlaceholderText(/コメントを入力/);
    await user.type(textarea, '新しいコメントです');

    // 送信ボタン
    const submitButton = screen.getByText('コメント送信');
    await user.click(submitButton);

    // 成功メッセージ
    await waitFor(() => {
      expect(screen.getByText(/コメントを追加しました/)).toBeInTheDocument();
    });
  });

  it('コメント公開範囲を選択できる', async () => {
    const user = userEvent.setup();

    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    // 公開範囲選択
    const privateRadio = screen.getByLabelText('内部メモ');
    await user.click(privateRadio);

    expect(privateRadio).toBeChecked();
  });

  it('添付ファイルがアップロードできる', async () => {
    const user = userEvent.setup();

    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    // アップロードボタン
    const uploadButton = screen.getByText(/ファイルをアップロード/);
    expect(uploadButton).toBeInTheDocument();
  });

  it('戻るボタンで一覧ページに遷移', async () => {
    const user = userEvent.setup();

    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /戻る/ });
    await user.click(backButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/tickets');
    });
  });

  it('タブ切り替えが機能する', async () => {
    const user = userEvent.setup();

    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    // 履歴タブに切り替え
    const historyTab = screen.getByText('変更履歴');
    await user.click(historyTab);

    expect(historyTab.closest('.ant-tabs-tab')).toHaveClass('ant-tabs-tab-active');
  });

  it('コメント一覧が表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('テストコメント')).toBeInTheDocument();
    });
  });

  it('説明文が表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText(/これはテスト用のチケット詳細です/)).toBeInTheDocument();
    });
  });

  it('依頼者情報が表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('作成日時が表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      const datePattern = /2026/;
      expect(screen.getByText(datePattern)).toBeInTheDocument();
    });
  });

  it('期限が表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText(/期限/)).toBeInTheDocument();
    });
  });

  it('カテゴリが表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText('システム障害')).toBeInTheDocument();
    });
  });

  it('ステータス更新ボタンが表示される', async () => {
    renderWithRouter('1');

    await waitFor(() => {
      expect(screen.getByText(/ステータス変更/)).toBeInTheDocument();
    });
  });
});
